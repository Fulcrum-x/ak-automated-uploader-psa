import { iso6392 } from "iso-639-2";

// These translation tables should really be objects or something

const audioTranslationTable: [from: string[], to: string, plus?: string][] = [
  [['aac', 'aac lc'], 'AAC'],
  [['alac'], 'ALAC'],
  [['dd', 'ac-3'], 'DD'],
  [['ddp', 'dd+', 'e-ac-3', 'e-ac-3 joc', 'ddpa', 'ddp atmos', 'dd+ atmos'], 'DDP', 'DD+'],
  [['dts'], 'DTS'],
  [['dts-hd ma', 'dts xll'], 'DTS-HD MA'],
  [['dts-x', 'dts xll x'], 'DTS:X'],
  [['flac'], 'FLAC'],
  [['mp3', 'mpeg audio'], 'MP3'],
  [['opus'], 'Opus'],
  [['pcm'], 'LPCM'],
  [['truehd', 'mlp fba', 'mlp fba 16-ch', 'mlp fba ac-3 16-ch', 'truehd atmos'], 'TrueHD'],
  [['vorbis'], 'Vorbis'],
];

const atmosFormats: string[] = [
  'ddpa',
  'ddp atmos',
  'dd+ atmos',
  'e-ac-3 joc',
  'mlp fba 16-ch',
  'mlp fba ac-3 16-ch',
  'truehd atmos',
];

const videoTranslationTable: [from: string[], to: string, toLikeH264?: string, toEncoder?: string][] = [
  [['av1'], 'AV1'],
  [['mpeg video', 'mpeg-2'], 'MPEG-2'],
  [['x264'], 'AVC',  'H.264', 'x264'],
  [['avc', 'h264', 'h 264', 'h.264'], 'AVC',  'H.264'],
  [['x265'], 'HEVC', 'H.265', 'x265'],
  [['hevc', 'h265', 'h 265', 'h.265'], 'HEVC', 'H.265'],
];

interface Source {
  raw: string;
  text: string;
}

interface Audio {
  codec: {
    raw: string;
    text: string;
    plus: string;
  },
  channels: {
    raw: string;
    text: string;
  },
  atmos: boolean,
  multi: {
    raw: string;
    text: string;
  }
  text: string;
  plus: string;
}

interface Video {
  codec: {
    raw: string;
    encoder: string;
    likeAvc: string;
    likeH264: string;
  },
  dv: {
    raw: string;
    text: string;
  },
  hdr: {
    raw: string;
    text: string;
  },
  resolution: string;
  scanType: 'Progressive' | 'Interlaced';
}

type Censored = 'censored' | 'uncensored' | '';

export default class P2PRelease {

  source: Source;
  audio: Audio;
  video: Video;
  censored: string;
  edition: string;
  episodeTitle: string;
  group: string;
  language: string;
  repack: string;
  season: string;
  episode: string;
  title: string;
  originalTitle: string;
  raw: string;
  extension: string;
  category: 'tv' | 'movie';
  updateCallbacks: Array<(release: P2PRelease) => void>;
  year: string;
  remux: boolean;
  fullDisc: boolean;

  constructor() {

    this.updateCallbacks = [];

    this.raw = '';

    this.source = { raw: '', text: '' };

    this.audio = {
      codec: { raw: '', text: '', plus: '' },
      channels: { raw: '', text: '' },
      atmos: false,
      multi: { raw: '', text: '' },
      text: '',
      plus: '',
    };

    this.video = {
      codec: { raw: '', encoder: '', likeAvc: '', likeH264: '' },
      dv: { raw: '', text: '' },
      hdr: { raw: '', text: '' },
      resolution: '',
      scanType: 'Progressive',
    }

    this.category = 'tv';

    this.censored = '';
    this.edition = '';
    this.episodeTitle = '';
    this.group = '';
    this.language = '';
    this.repack = '';
    this.season = '';
    this.episode = '';
    this.title = '';
    this.originalTitle = '';
    this.extension = '';
    this.year = '';
    this.remux = false;
    this.fullDisc = false;

    this.setLanguage('english');

  }

  buildAudioRegexp(): RegExp {

    let froms: string[] = [];

    for (const translation of audioTranslationTable) {
      const [from] = translation;
      froms = froms.concat(from);
    }

    froms = froms.map(value => value.replace('+', '\\+'));

    return new RegExp(`(?:^| )(${froms.join('|')})(?: ?((?:[1-9]|[1-2][0-9]).[0-2](?:.[0-9])?))?(?: ?(atmos))?$`, 'i');

  }

  buildLanguageRegexp(): RegExp {

    const languages: string[] = [];

    for (const language of iso6392) {
      const names = language.name.split('; ');
      for (const name of names) {
        if (!/^[a-z]+$/i.test(name)) continue;
        languages.push(name.toLowerCase());
      }
    }

    return new RegExp(`(?:^| )(${languages.join('|')})$`, 'i');

  }

  buildVideoCodecRegexp(): RegExp {

    let froms: string[] = [];

    for (const translation of videoTranslationTable) {
      const [from] = translation;
      froms = froms.concat(from);
    }

    return new RegExp(`(?:^| )(${froms.join('|')})$`, 'i');

  }

  format(format: string) {

    format = format.replace(/([- .]+)?{(.+?)}/ig, (fullMatch, whitespace, tag): string => {

      let output = '';

      const [tagName, ...tagArguments] = tag.split(' ');

      if (tagArguments.includes('if_special') && !(this.season === 'S00' || this.episode === 'S00')) {
        return '';
      }

      if (tagArguments.includes('if_not_english') && ['', 'en', 'eng', 'english'].includes(this.getLanguage())) {
        return '';
      }

      switch (tagName) {

        case 'title':
          output = this.getTitle();
          const original = this.getOriginalTitle();
          if (tagArguments.includes('aka') && original) {
            output += ` AKA ${original}`;
          }
          break;

        case 'year':
          output = this.getYear();
          break;

        case 'season_episode':
          output = this.getSeasonEpisode();
          break;
        
        case 'episode_title':
          output = this.getEpisodeTitle();
          break;
        
        case 'edition':
          output = this.getEdition();
          break;

        case 'attributes':
          output = this.getAttributes();
          break;
        
        case 'language':
          output = this.getLanguage();
          break;
        
        case 'repack':
          output = this.getRepack();
          break;

        case 'remux':
          output = this.isRemux() ? 'REMUX' : '';
          break;

        case 'resolution':
          output = this.getResolution();
          break;
        
        case 'source':
          output = this.getSource();
          break;
        
        case 'audio':
          output = this.getAudio(tagArguments.includes('plus'));
          break;
        
        case 'video':

          if (tagArguments.includes('like_h264')) {
            output = this.getVideo('like_h264');

          } else if (tagArguments.includes('like_avc')) {
            output = this.getVideo('like_avc');

          } else if (tagArguments.includes('encoder')) {
            output = this.getVideo('encoder');

          } else {
            output = this.getVideo();
          }

          break;

        case 'group':
          output = this.getGroup();
          break;

      }

      return output ? `${whitespace || ''}${output}` : '';

    });

    return format;

  }

  getAttributes(): string {
    return this.censored;
  }

  getAudio(plus: boolean = true): string {
    return plus ? this.audio.plus : this.audio.text;
  }

  getEdition(): string {
    return this.edition;
  }

  getEpisode(): string {
    let episode = this.episode;
    episode = episode.replace(/^E0*/, '');
    episode = String(Number(episode));
    return episode;
  }

  getEpisodeTitle(): string {
    return this.episodeTitle;
  }

  getGroup(): string {
    return this.group;
  }

  getLanguage(): string {
    return this.language;
  }

  getOriginalTitle(): string {
    return this.originalTitle;
  }

  getRepack(): string {
    return this.repack;
  }

  getResolution(): string {
    return this.video.resolution;
  }

  getSeason(): string {
    let season = this.season;
    season = season.replace(/^S0*/, '');
    season = String(Number(season));
    return season;
  }

  getSeasonEpisode(): string {

    let output = '';

    if (this.season) {
      output += this.season;
    }

    if (this.episode) {
      output += this.episode;
    }

    return output;

  }

  getSource(): string {
    return this.source.text;
  }

  getTitle(): string {
    return this.title;
  }

  getVideo(type: 'like_h264' | 'like_avc' | 'encoder' | 'original' = 'original'): string {

    let output: string[] = [];

    if (this.video.dv.text) output.push(this.video.dv.text);
    if (this.video.hdr.text) output.push(this.video.hdr.text);

    switch (type) {
      case 'like_h264': output.push(this.video.codec.likeH264); break;
      case 'like_avc': output.push(this.video.codec.likeAvc); break;
      case 'encoder': output.push(this.video.codec.encoder || this.video.codec.likeAvc); break;
      default: output.push(this.video.codec.likeAvc); break;
    }

    return output.join(' ');

  }

  getYear() {
    return this.year;
  }

  isFullDisc(): boolean {
    return this.fullDisc;
  }

  isRemux(): boolean {
    return this.remux;
  }

  parse(releaseText: string): void {

    this.raw = releaseText;

    releaseText = releaseText.replace(/\./g, ' ');
    releaseText = releaseText.replace(/ {2,}/g, ' ');
    releaseText = releaseText.trim();

    const tvRegexp = /^(.+?) S([0-9]+)(?:E([0-9]+))? +(.+?)(?:-(\w+))?(?: (mkv|mp4))?$/i;
    const movieRegexp = /^(.+?) \(?([0-9]{4})\)? (.+?)(?:-(\w+))?(?: (mkv|mp4))?$/i;

    const tvMatches = releaseText.match(tvRegexp);
    const movieMatches = releaseText.match(movieRegexp);

    if (tvMatches) {

      const [, seriesName, season, episode, videoDetails, group, extension] = tvMatches;

      this.category = 'tv';

      this.setTitle(seriesName);
      this.setSeasonEpisode(season, episode || '');

      this.parseVideoDetails(videoDetails);

      this.group = group || '';

      this.extension = extension || '';

    } else if (movieMatches) {

      const [, movieName, year, videoDetails, group, extension] = movieMatches;

      this.category = 'movie';

      this.setTitle(movieName);
      this.year = year;

      this.parseVideoDetails(videoDetails);

      this.group = group || '';
      this.extension = extension || '';

    }

  }

  parseVideoDetails(details: string): void {

    let position = details.length;

    const editionRegexp = /(?:^| )(extended|extended cut|openmatte|open-matte)$/i;
    const languageRegexp = this.buildLanguageRegexp();
    const censoredRegexp = /(?:^| )(censored|uncensored)$/i;
    const repackRegexp = /(?:^| )(repack[1-9]?|proper|dirfix)$/i;
    const resolutionRegexp = /(?:^| )(480[pi]|576[pi]|720p|1080[pi]|2160p)$/i;
    const webSourceRegexp = /(?:^| )(?:([a-z][a-z0-9]{1,3}|amazon|netflix) )?(web-dl|web-rip|web-cap|webdl|webrip|webcap|web)$/i;
    const sourceRegexp = /(?:^| )((?:[a-z]{3} )?(?:uhd )?blu-?ray|hdtv|sdtv|(?:ntsc |pal )?dvd(?:rip)?|dvd5|dvd9)$/i;
    const remuxRegexp = /(?:^| )(remux)$/i;
    const audioRegexp = this.buildAudioRegexp(); 
    const multiAudioRegexp = /(?:^| )(dual|dual-audio|multi|multilang|multi-audio|multilingual)$/i;
    const videoCodecRegexp = this.buildVideoCodecRegexp();
    const videoHdrRegexp = /(?:^| )(hdr(?:10[+p]?)?)$/i;
    const videoDvRegexp = /(?:^| )(dv|dovi)$/i;

    let foundEdition = false;
    let foundLanguage = false;
    let foundCensored = false;
    let foundRepack = false;
    let foundResolution = false;
    let foundSource = false;
    let foundRemux = false;
    let foundAudio = false;
    let foundMultiAudio = false;
    let foundVideoCodec = false;
    let foundVideoHdr = false;
    let foundVideoDv = false;

    while (position > 0) {

      const nextDetails = details.substring(0, position);

      let matches: RegExpMatchArray | null = null;

      // Video
      if ((matches = nextDetails.match(videoCodecRegexp)) && !foundVideoCodec) {

        foundVideoCodec = true;
        const [, codec] = matches;
        this.setVideoCodec(codec);

      // Video HDR
      } else if ((matches = nextDetails.match(videoHdrRegexp)) && !foundVideoHdr) {

        foundVideoHdr = true;
        const [, hdr] = matches;
        this.setVideoHdr(hdr);

      // Video DV
      } else if ((matches = nextDetails.match(videoDvRegexp)) && !foundVideoDv) {

        foundVideoDv = true;
        const [, dv] = matches;
        this.setVideoDv(dv);

      // Dual/multi audio
      } else if ((matches = nextDetails.match(multiAudioRegexp)) && !foundMultiAudio) {

        foundMultiAudio = true;
        const [, multiAudio] = matches;
        this.setMultiAudio(multiAudio);

      // Audio
      } else if ((matches = nextDetails.match(audioRegexp)) && !foundAudio) {

        foundAudio = true;
        const [, codec, channels, atmos] = matches;
        this.setAudioCodec(codec);
        if (channels) this.setAudioChannels(channels);
        if (atmos) this.setAudioAtmos(true);

      // Web source
      } else if ((matches = nextDetails.match(webSourceRegexp)) && !foundSource) {

        foundSource = true;
        const [, streamingService, source] = matches;
        if (streamingService) {
          this.setSource(`${streamingService} ${source}`);
        } else {
          this.setSource(source);
        }

      // Other sources
      } else if ((matches = nextDetails.match(sourceRegexp)) && !foundSource) {

        foundSource = true;
        const [, source] = matches;
        this.setSource(source);
      
      // Remux
      } else if ((matches = nextDetails.match(remuxRegexp)) && !foundRemux) {

        foundRemux = true;
        this.setRemux(true);

      // Resolution
      } else if ((matches = nextDetails.match(resolutionRegexp)) && !foundResolution) {

        foundResolution = true;
        const [, resolution] = matches;
        this.setResolution(resolution);

      // Repack
      } else if ((matches = nextDetails.match(repackRegexp)) && !foundRepack) {

        foundRepack = true;
        const [, repack] = matches;
        this.setRepack(repack);

      // Censored/uncensored
      } else if ((matches = nextDetails.match(censoredRegexp)) && !foundCensored) {

        foundCensored = true;
        const [, censored] = matches;
        this.setCensored(censored);

      // Language
      } else if ((matches = nextDetails.match(languageRegexp)) && !foundLanguage) {

        foundLanguage = true;
        const [, language] = matches;
        this.setLanguage(language);

      // Edition
      } else if ((matches = nextDetails.match(editionRegexp)) && !foundEdition) {

        foundEdition = true;
        const [, edition] = matches;
        this.setEdition(edition);

      // Unmatched
      } else {

        this.setEpisodeTitle(nextDetails);
        break;

      }

      if (matches) {
        position -= matches[0].length;
      }

    }

  }

  setResolution(text: string): void {

    this.video.resolution = '';

    const matches = text.match(/^([0-9]+([ip]))$/i);
    if (matches) {
      this.video.resolution = matches[1];
      if (matches[2] === 'i') {
        this.video.scanType = 'Interlaced';
      } else {
        this.video.scanType = 'Progressive';
      }
      this.emitUpdate();
      return;
    }

    throw Error('Resolution is in incorrect format');

  }

  setAudio(): void {

    const shortParts: string[] = [];
    if (this.audio.multi.text) shortParts.push(this.audio.multi.text);
    if (this.audio.codec.text) shortParts.push(this.audio.codec.text);
    if (this.audio.channels.text) shortParts.push(this.audio.channels.text);
    if (this.audio.atmos) shortParts.push('Atmos');
    this.audio.text = shortParts.join(' ');

    const plusParts: string[] = [];
    if (this.audio.multi.text) plusParts.push(this.audio.multi.text);
    if (this.audio.codec.plus) plusParts.push(this.audio.codec.plus);
    if (this.audio.channels.text) plusParts.push(this.audio.channels.text);
    if (this.audio.atmos) plusParts.push('Atmos');
    this.audio.plus = plusParts.join(' ');

    this.emitUpdate();

  }

  setAudioCodec(codec: string): void {

    this.audio.codec.raw = codec;

    const match = audioTranslationTable.find(translation => {
      const [from] = translation;
      return from.includes(codec.toLowerCase());
    });

    if (!match) {
      console.log(`Couldn't find matching audio codec for ${codec}`);
      return;
    }

    const [, to, plus] = match;
    
    this.audio.codec.text = to;
    this.audio.codec.plus = plus ?? to;

    if (atmosFormats.includes(codec.toLowerCase())) {
      this.audio.atmos = true;
    }

    this.setAudio();

  }

  setAudioChannels(channels: string): void {
    channels = channels.replace(/ /g, '.');
    this.audio.channels.raw = channels;
    this.audio.channels.text = channels;
    this.setAudio();
  }

  setAudioChannelLayout(layout: string): void {
    
    let numChannels = 0;
    let numLfes = 0;
    let numHigh = 0;
    let numLow = 0;

    const channels: string[] = layout.split(' ');
    for (const channel of channels) {
      if (['C', 'Rc', 'R', 'Rw', 'Rss', 'Rs', 'Rsd', 'Rb', 'Cb', 'Lb', 'Lsd', 'Ls', 'Lss', 'Lw', 'L', 'Lc'].includes(channel)) {
        numChannels++;
      } else if (['LFE', 'LFE2'].includes(channel)) {
        numLfes++;
      } else if (['Tfc', 'Tfr', 'Tsr', 'Rvs', 'Tbr', 'Tbc', 'Tbl', 'Lvs', 'Tsl', 'Tfl', 'Tc'].includes(channel)) {
        numHigh++;
      } else if (['Bfc', 'Bfr', 'Bsr', 'Bbr', 'Bbc', 'Bbl', 'Bsl', 'Bfl'].includes(channel)) {
        numLow++;
      } else if (['Objects'].includes(channel)) {
        // Positional audio from DTS:X
      } else {
        console.log(`Found unknown audio channel type ${channel}, not updating channels from MediaInfo`);
        return;
      }
    }

    let output = `${numChannels}.${numLfes}`;

    if (numHigh > 0 || numLow > 0) {
      output += `.${numHigh}`;
    }

    if (numLow > 0) {
      output += `${numLow}`;
    }

    this.audio.channels.text = output;

    this.setAudio();

  }

  setAudioAtmos(atmos: boolean): void {
    this.audio.atmos = atmos;
    this.setAudio();
  }

  setCensored(censored: string): void {
    this.censored = censored.toUpperCase();
    this.emitUpdate();
  }

  setDimensions(width: number, height: number, scanType?: string): void {

    if (scanType === 'Interlaced' || scanType === 'Progressive') {
      this.video.scanType = scanType;
    }

    const resolutions: [number, number][] = [
      [8192, 4320],
      [3840, 2160],
      [1920, 1080],
      [1280, 720],
      [1024, 576],
      [720, 480],
    ];

    for (const resolution of resolutions) {

      const [checkWidth, checkHeight] = resolution;

      if (checkWidth * 0.98 > width && checkHeight * 0.98 > height) {
        continue;
      }

      this.setResolution(`${checkHeight}${this.video.scanType === 'Interlaced' ? 'i' : 'p'}`);

      return;

    }

  }

  setEdition(edition: string): void {
    this.edition = edition;
    this.emitUpdate();
  }

  setEpisodeTitle(title: string): void {
    this.episodeTitle = title;
    this.emitUpdate();
  }

  setFullDisc(fullDisc: boolean): void {
    this.fullDisc = fullDisc;
    if (fullDisc && this.remux) this.remux = false;
    this.emitUpdate();
  }

  setLanguage(input: string): void {

    const countryCodeMatches = input.match(/([a-z]{2,3})-[a-z0-9]{2,3}/i);
    if (countryCodeMatches) input = countryCodeMatches[1];

    this.language = '';

    for (const language of iso6392) {

      const names = language.name.split('; ');

      for (const name of names) {

        if (name.toLowerCase() === input.toLowerCase()) {
          this.language = name;
          break;
        } else if (language.iso6392B.toLowerCase() === input.toLowerCase()) {
          this.language = name;
          break;
        } else if (language.iso6391 && language.iso6391.toLowerCase() === input.toLowerCase()) {
          this.language = name;
          break;
        }

      }

    }

    if (!this.language) this.language = input;

    if (['en', 'eng', 'english'].includes(this.language.toLowerCase())) {
      this.language = '';
    }

    this.language = this.language.toUpperCase();

    this.emitUpdate();

  }

  setMultiAudio(multiAudio: string) {

    if (multiAudio === '') {
      this.audio.multi.raw = '';
      this.audio.multi.text = '';
    }

    if (multiAudio.toLowerCase().startsWith('dual')) {
      this.audio.multi.raw = multiAudio;
      this.audio.multi.text = 'Dual-Audio';
    }

    if (multiAudio.toLowerCase().startsWith('multi')) {
      this.audio.multi.raw = multiAudio;
      this.audio.multi.text = 'Multi'
    }

    this.setAudio();

  }

  setOriginalTitle(title: string): void {
    this.originalTitle = title;
    this.emitUpdate();
  }

  setRemux(remux: boolean): void {
    this.remux = remux;
    if (remux && this.fullDisc) this.fullDisc = false;
    this.emitUpdate();
  }

  setRepack(repack: string): void {
    this.repack = repack;
    this.emitUpdate();
  }

  setSeasonEpisode(season: string, episode: string): void {

    const seasonMatch = season.match(/\d+/);
    if (seasonMatch) {
      const seasonNumber = Number(seasonMatch[0]);
      this.season = 'S' + String(seasonNumber).padStart(2, '0');
    } else {
      this.season = '';
    }

    const episodeMatch = episode.match(/\d+/);
    if (episodeMatch) {
      const episodeNumber = Number(episodeMatch[0]);
      this.episode = 'E' + String(episodeNumber).padStart(2, '0');
    }

    this.emitUpdate();

  }

  setTitle(text: string): void {
    this.title = text;
    this.emitUpdate();
  }

  setSource(text: string): void {

    this.source.raw = text;

    const matches = text.match(/^(?:([a-z0-9]+)\s+)?(?:(web|webdl|web-dl)|(webrip|web-rip|webcap|web-cap))$/i);

    if (matches) {

      let [, streamingService, webDl, webRip] = matches;

      if (streamingService && streamingService.toLowerCase() === 'amazon') streamingService = 'AMZN';
      if (streamingService && streamingService.toLowerCase() === 'netflix') streamingService = 'NF';

      if (webDl) {
        this.source.text = streamingService ? `${streamingService} WEB-DL` : 'WEB-DL';
      } else {
        this.source.text = streamingService ? `${streamingService} WEBRip` : 'WEBRip';
      }

    } else {
      this.source.text = text;
    }

    this.emitUpdate();

  }

  setVideoCodec(codec: string, version?: string): void {

    const match = videoTranslationTable.find(translation => {
      const [from] = translation;
      return from.includes(codec.toLowerCase())
    });

    if (!match) {
      console.log(`Couldn't find matching video codec for ${codec}`);
      this.video.codec.likeAvc = codec.toUpperCase();
      this.video.codec.likeH264 = codec.toUpperCase();
      return;
    }

    let [, likeAvc, likeH264, encoder] = match;
    if (!likeH264) likeH264 = likeAvc;

    this.video.codec.likeAvc = likeAvc;
    this.video.codec.likeH264 = likeH264 || likeAvc;

    if (encoder) this.video.codec.encoder = encoder;

    this.emitUpdate();

  }

  setVideoDv(dv: string): void {
    this.video.dv.raw = dv;
    this.video.dv.text = 'DV';
    this.emitUpdate();
  }

  setVideoHdr(hdr: string): void {

    this.video.hdr.raw = hdr;
    switch (hdr.toLowerCase()) {

      case 'hdr': case 'hdr10':
        this.video.hdr.text = 'HDR';
        break;
      
      case 'hdr10+': case 'hdr10p':
        this.video.hdr.text = 'HDR10+';
        break;

    }

    this.emitUpdate();

  }

  setVideoHdrFormat(format: string, compatibility: string = ''): void {

    const formats = format.split(' / ');
    const compatibilities = compatibility.split(' / ');

    const combined = formats.map((format, index) => ({
      format,
      compatibility: compatibilities[index] || ''
    }));

    for (const item of combined) {
      if (item.format === 'Dolby Vision') {
        this.setVideoDv('DV');
      } else if (item.compatibility.startsWith('HDR10+')) {
        this.setVideoHdr('HDR10+');
      } else if (item.compatibility.startsWith('HDR10')) {
        this.setVideoHdr('HDR');
      } else if (item.format.startsWith('SMPTE')) {
        this.setVideoCodec('HDR');
      }
    }

  }

  setYear(year: string): void {
    this.year = year.substring(0, 4);
    this.emitUpdate();
  }

  emitUpdate(): void {
    for (const callback of this.updateCallbacks) {
      callback(this);
    }
  }

  onUpdate(callback: (release: P2PRelease) => void) {
    this.updateCallbacks.push(callback);
  }

}