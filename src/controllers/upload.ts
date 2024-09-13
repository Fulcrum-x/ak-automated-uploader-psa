import MainWindow from "../gui/main-window";
import Upload from "../upload";
import { SettingsList } from "../settings";
import TmdbConfig from "../tmdb-config";
import TorrentClients from "./torrent-clients";
import UploadTab from "../gui/upload-tab";
import TmdbController from "./tmdb";
import P2PRelease from "../p2p-release";
import FilesController from "./files";
import Torrent from "../torrent";
import ScreenshotsController from "./screenshots";
import getMediaInfo, { MediaInfo } from "../mediainfo";
import TrackersController from "./trackers";
import assert from "node:assert";
import { join } from "node:path";

export default class UploadController {

  parentUi: MainWindow;
  tmdbConfig: TmdbConfig;
  settings: SettingsList;
  torrentClients: TorrentClients;
  upload?: Upload;
  ui?: UploadTab;
  tmdb?: TmdbController;
  release?: P2PRelease;
  files?: FilesController;
  torrent?: Torrent;
  screenshots?: ScreenshotsController;
  trackers?: TrackersController;

  constructor(ui: MainWindow, tmdbConfig: TmdbConfig, settings: SettingsList, torrentClients: TorrentClients) {

    this.parentUi = ui;
    this.tmdbConfig = tmdbConfig;
    this.settings = settings;
    this.torrentClients = torrentClients;

  }

  close(): void {
    
  }

  async setPath(path: string) {

    this.upload = new Upload(path);

    this.ui = this.parentUi.addUpload(this.upload.name);
    this.tmdb = new TmdbController(this.ui.tmdb, this.tmdbConfig);
    this.release = new P2PRelease();
    this.files = new FilesController(this.ui.files);
    this.torrent = new Torrent();
    this.screenshots = new ScreenshotsController(this.ui.screenshots, this.settings.ffmpegPath, this.settings.ffprobePath);
    this.trackers = new TrackersController(this.ui.trackers, this.settings, this.torrentClients);
  
    this.release.onUpdate(release => this.trackers?.setRelease(release));
    this.release.parse(this.upload.name);

    await this.files.setPath(path);

    this.tmdb.onMetadata(metadata => {

      if (metadata.original_name && metadata.original_name !== metadata.name) {

        if (metadata.matched_name.startsWith(metadata.name)) {
          this.release?.setTitle(metadata.matched_name)
        } else {
          this.release?.setTitle(metadata.name);
        }

        if (metadata.matched_name.startsWith(metadata.original_name)) {
          this.release?.setOriginalTitle(metadata.matched_name);
        } else {
          this.release?.setOriginalTitle(metadata.original_name);
        }

      } else {
        this.release?.setTitle(metadata.matched_name || metadata.name);
      }

      if (metadata.first_air_date) this.release?.setYear(metadata.first_air_date);

      this.trackers?.setMetadata(metadata);

    })

    this.files.onScreenshotsChanged((path, count) => this.screenshots?.create(path, count));

    this.files.onMediaInfoChanged(async path => {

      const mediaInfoPromise = getMediaInfo(path);
      this.trackers?.setMediaInfo(mediaInfoPromise);
      this.mediaInfoToRelease(await mediaInfoPromise);
    });

    this.screenshots.onCreated(path => this.trackers?.addScreenshot(path));
    this.screenshots.onRemoved(path => this.trackers?.removeScreenshot(path));

    const brDiskFiles = this.files.findPathsByDir('BDMV', 'STREAM');
    if (brDiskFiles.length > 0) {

      this.release.setFullDisc(true);
      const largest = await this.files.largest(brDiskFiles);
      const name = this.files.getName(largest);

      this.files.setScreenshots(name, 6);
      this.files.setMediaInfo(name);

    } else {
    
      this.files.setScreenshots(this.files.getName(0), 6);
      this.files.setMediaInfo(this.files.getName(0));

    }

    switch (this.release.category) {
      case 'tv': this.tmdb.searchSeries(this.release.title); break;
      case 'movie': this.tmdb.searchMovie(this.release.title); break;
    }

    this.torrent.addFiles(
      this.files.getPaths(),
      this.files.dirPath(),
      this.files.getSize()
    );

    this.torrent.onProgress(progress => this.ui?.progress.set(progress));

    this.trackers.setTorrent(this.torrent.create());

    this.ui.onClose(async () => {
      await Promise.all([
        this.torrent?.close(),
        this.screenshots?.close(),
        this.trackers?.close(),
      ]);
    });

  }

  mediaInfoToRelease(mediaInfo: MediaInfo) {

    assert(this.release);

    if (mediaInfo.defaultVideo) {

      const videoCodec = mediaInfo.defaultVideo.Format;
      const videoCodecVersion = mediaInfo.defaultVideo.Format_Version;
      if (videoCodec) this.release.setVideoCodec(videoCodec, videoCodecVersion);

      const width = mediaInfo.defaultVideo.Width;
      const height = mediaInfo.defaultVideo.Height;
      const scanType = mediaInfo.defaultVideo.ScanType;
      if (width && height) this.release.setDimensions(width, height, scanType);

      const hdrFormat = mediaInfo.defaultVideo.HDR_Format;
      const hdrFormatCompatibility = mediaInfo.defaultVideo.HDR_Format_Compatibility;
      if (hdrFormat) this.release.setVideoHdrFormat(hdrFormat, hdrFormatCompatibility);

    }

    if (mediaInfo.defaultAudio) {

      const audioCodec = mediaInfo.defaultAudio.Format;
      const audioCodecAdditional = mediaInfo.defaultAudio.Format_AdditionalFeatures;
      if (audioCodec) this.release.setAudioCodec(
        audioCodecAdditional ? `${audioCodec} ${audioCodecAdditional}` : audioCodec
      );

      const audioChannels = mediaInfo.defaultAudio.Channels;
      const audioChannelLayout = mediaInfo.defaultAudio.ChannelLayout;
      if (audioChannelLayout) {
        this.release.setAudioChannelLayout(audioChannelLayout);
      } else if (audioChannels) {
        switch (audioChannels) {
          case 8: this.release.setAudioChannels('7.1'); break;
          case 7: this.release.setAudioChannels('6.1'); break;
          case 6: this.release.setAudioChannels('5.1'); break;
          default: this.release.setAudioChannels(`${audioChannels}.0`);
        }
      }

      const language = mediaInfo.defaultAudio.Language;
      if (language) this.release.setLanguage(language);

    }

    const audioLanguages = new Set(mediaInfo.audio.map(audio => audio.Language));
    if (audioLanguages.size >= 3) {
      this.release.setMultiAudio('MULTI');
    } else if (audioLanguages.size >= 2) {
      this.release.setMultiAudio('Dual-Audio');
    }

  }

}