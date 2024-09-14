import { Field } from "../gui/settings-window";
import P2PRelease from "../p2p-release";
import { TrackerSettings } from "../settings";
import { TmdbSearchResult } from "../tmdb";
import Tracker, { KeyValueData, SearchResults } from "./tracker";
import { unit3dDistributors, unit3dRegions } from "./unit3d-distributors";
import querystring from 'node:querystring';

const UPLOAD_URL = 'https://aither.cc/api/torrents/upload';
const SEARCH_URL = 'https://aither.cc/api/torrents/filter';

export const categories: KeyValueData = [
  ['1', 'Movie'],
  ['9', 'Sport'],
  ['2', 'TV'],
  ['3', 'Music'],
];

export const types: KeyValueData = [
  ['1', 'Full Disc'],
  ['2', 'Remux'],
  ['3', 'Encode'],
  ['4', 'WEB-DL'],
  ['5', 'WEBRip'],
  ['6', 'HDTV'],
  ['7', 'Other'],
];

export const resolutions: KeyValueData = [
  ['1', '4320p'],
  ['2', '2160p'],
  ['3', '1080p'],
  ['4', '1080i'],
  ['5', '720p'],
  ['6', '576p'],
  ['7', '576i'],
  ['8', '480p'],
  ['9', '480i'],
  ['10', 'Other/Mixed'],
];

export const frees: KeyValueData = [
  ['0', 'No Freeleech'],
  ['25', '25% Freeleech'],
  ['50', '50% Freeleech'],
  ['75', '75% Freeleech'],
  ['100', '100% Freeleech'],
];

export const regions: KeyValueData = unit3dRegions;
export const distributors: KeyValueData = unit3dDistributors;

export const settings: Field[] = [
  {
    id: 'announce',
    label: 'Announce URL',
    type: 'password',
    description: 'You can find your announce URL on the <a href="http://aither.cc/upload">upload page</a>.',
  },
  {
    id: 'apiKey',
    label: 'API key',
    type: 'password',
    description: 'Your API key can be found in your profile, under Settings, API Key.',
  },
  {
    id: 'defaultDescription',
    label: 'Default description',
    type: 'multiline',
    default: '{screenshots 350}[url={link}][img={width}]{image}[/img][/url]{/screenshots}',
  }
];

export default class Aither extends Tracker {

  apiKey: string;

  constructor(config: TrackerSettings) {

    super(config);

    this.name = 'Aither';
    this.source = 'Aither';

    if (!config.apiKey) {
      throw Error('API key is missing for Aither');
    }

    this.apiKey = config.apiKey;

    this.keyValueData = {
      'category_id': categories,
      'type_id': types,
      'resolution_id': resolutions,
      'distributor_id': distributors,
      'region_id': regions,
      'free': frees,
    };

    this.setAll({
      name: '',
      category_id: 'Movie',
      type_id: 'Other',
      resolution_id: 'Other/Mixed',
      distributor_id: '',
      region_id: '',
      season_number: '',
      episode_number: '',
      tmdb: '',
      imdb: '',
      tvdb: '',
      mal: '',
      keywords: '',
      description: config.defaultDescription || '',
      mediainfo: '{mediainfo fulltext}',
      bdinfo: '',
      anonymous: false,
      stream: false,
      sd: false,
      personal_release: false,
      internal: false,
      free: 'No Freeleech',
    });

  }

  async upload(): Promise<void> {

    if (!this.torrent) { 
      throw Error('Torrent not ready to upload'); 
    }

    const formData = new FormData();

    formData.set('torrent', this.torrent.blob, this.torrent.filename);

    const { name, description, mediainfo, bdinfo, keywords, season_number, episode_number, tmdb, imdb, tvdb, mal } = this.getStrings();
    const { category_id, type_id, resolution_id, region_id, distributor_id, free } = this.getIds();
    const { anonymous, stream, sd, personal_release, internal } = this.getAll();

    formData.set('name', name);

    formData.set('description', description);
    formData.set('mediainfo', mediainfo);
    formData.set('bdinfo', bdinfo);

    formData.set('category_id', category_id);
    formData.set('type_id', type_id);
    formData.set('resolution_id', resolution_id);
    formData.set('keywords', keywords);

    if (region_id) formData.set('region_id', region_id);
    if (distributor_id) formData.set('distributor_id', distributor_id);

    if (category_id === '2') {
      formData.set('season_number', season_number);
      formData.set('episode_number', episode_number);
    }

    formData.set('tmdb', tmdb || '0');
    formData.set('imdb', imdb || '0');
    formData.set('tvdb', tvdb || '0');
    formData.set('mal', mal || '0');
    formData.set('igdb', '0');

    formData.set('anonymous', anonymous ? '1' : '0');
    formData.set('stream', stream ? '1' : '0');
    formData.set('sd', sd ? '1' : '0');
    formData.set('personal_release', personal_release ? '1' : '0');

    if (internal) formData.set('internal', '1');
    if (free !== '0') formData.set('free', free);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    const data = await response.json();

    console.log(data);

    if (false === data instanceof Object) throw Error(`Invalid data returned from Aither`);
    if (false === 'success' in data) throw Error(`Error uploading to Aither: ${'message' in data ? data.message : ''}`);

  }

  async search(): Promise<void> {

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const params: Record<string, string | string[]> = {
      'tmdbId': this.getString('tmdb'),
      'categories[]': this.getString('category_id'),
      'resolutions[]': this.getString('resolution_id'),
    }

    // Treating HDTV/WEBRip/WEB-DL as the same
    if (['4', '5', '6'].includes(this.getString('type_id'))) {
      params['types[]'] = ['4', '5', '6'];
    } else {
      params['types[]'] = this.getString('type_id');
    }

    if (this.getString('season_number')) {
      params.seasonNumber = this.getString('season_number');
    }

    if (this.getString('episode_number')) {
      params.episodeNumber = this.getString('episode_number');
    }
    

    const response = await fetch(
      `${SEARCH_URL}?${querystring.stringify(params)}`,
      { headers: headers }
    );
    const data = await response.json();

    const output: SearchResults = [];

    if (data instanceof Object && 'data' in data && Array.isArray(data.data)) {
      for (const result of data.data) {
        if (result.attributes && result.attributes.name && result.attributes.details_link) {
          output.push({
            name: result.attributes.name,
            url: result.attributes.details_link,
          });
        }
      }
    }

    this.emitSearchResults(output);

  }

  setMetadata(metadata: TmdbSearchResult): void {

    this.setAll({
      tmdb: String(metadata.tmdb_id),
      imdb: metadata.imdb_id.replace(/^tt/i, '') || '0',
      tvdb: String(metadata.tvdb_id),
      mal: '0',
      keywords: metadata.keywords.join(', '),
    });

    this.search();

  }

  setRelease(release: P2PRelease) {

    this.set('resolution_id', 'Other/Mixed');
    if (release.getResolution()) {
      this.set('resolution_id', release.getResolution());
    }

    this.set('type_id', 'Other');
    if (release.isFullDisc()) {
      this.set('type_id', 'Full Disc');
    } else if (release.isRemux()) {
      this.set('type_id', 'Remux');
    } else if (release.getSource() === 'BluRay' || release.getSource() === 'DVDRip') {
      this.set('type_id', 'Encode');
    } else if (release.getSource().endsWith('WEB-DL')) {
      this.set('type_id', 'WEB-DL');
    } else if (release.getSource().endsWith('WEBRip')) {
      this.set('type_id', 'WEBRip');
    } else if (release.getSource() === 'HDTV') {
      this.set('type_id', 'HDTV');
    }

    const type = this.get('type_id', 'value');

    let titleFormat = '';

    if (release.category === 'tv') {

      this.set('category_id', 'TV');

      this.setAll({
        season_number: release.getSeason(),
        episode_number: release.getEpisode(),
      });

      titleFormat = '{title aka} {season_episode} {episode_title} {edition} {language} {attributes} {repack} {resolution} {source} ';

    } else if (release.category === 'movie') {

      this.set('category_id', 'Movie');

      titleFormat = '{title aka} {year} {edition} {language} {attributes} {repack} {resolution} {source} ';

    }

    switch (type) {

      case 'WEB-DL':
        titleFormat += '{audio plus} {video like_h264}';
        break;

      case 'WEBRip':
      case 'HDTV':
      case 'Encode':
        titleFormat += '{audio plus} {video encoder}';
        break;

      case 'Remux':
        titleFormat += '{remux} {video like_avc} {audio plus}';
        break;

      case 'Full Disc':
        titleFormat += '{video like_avc} {audio plus}';
        break;

      default:
        titleFormat += '{audio plus} {video_encoder}';

    }

    titleFormat += '-{group}';

    this.set('name', release.format(titleFormat));

  }

}