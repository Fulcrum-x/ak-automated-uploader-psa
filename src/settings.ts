import { readFile, writeFile } from "node:fs/promises";
import { appDataPath } from "./util";
import { Field } from "./gui/settings-window";

export interface SettingsList {
  ffmpegPath: string;
  ffprobePath: string;
  tmdbApiKey: string;
  trackers: Array<TrackerSettings>;
  imageHosts: Array<ImageHostSettings>;
  torrentClients: Array<TorrentClientSettings>;
}

export interface TrackerSettings {
  name: string;
  announce: string;
  username?: string;
  password?: string;
  apiKey?: string;
  imageHosts: string[];
  afterUpload: string;
  defaultDescription: string;
}

export interface ImageHostSettings {
  name: string,
  apiKey?: string;
}

export interface TorrentClientSettings {
  name: string;
  url?: string;
  username?: string;
  password?: string;
}

export default class Settings {

  changedCallbacks: Array<(settings: SettingsList) => void>;
  defaults: SettingsList;
  settings: SettingsList;

  constructor() {

    this.changedCallbacks = [];

    this.defaults = {

      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      tmdbApiKey: '',

      trackers: [],
      imageHosts: [],
      torrentClients: [],

    };

    this.settings = JSON.parse(JSON.stringify(this.defaults));
    this.settings.trackers = [];
    this.settings.imageHosts = [];
    this.settings.torrentClients = [];

  }

  addDefaultImageHost(name: string, fields: Field[]): void {

    const imageHost: ImageHostSettings = {
      name: name,
    };

    for (const field of fields) {
      if (['apiKey'].includes(field.id)) {
        imageHost[field.id] = field.default || '';
      }
    }

    this.defaults.imageHosts.push(imageHost);

  }

  addDefaultTorrentClient(name: string, fields: Field[]): void {

    const torrentClient: TorrentClientSettings = {
      name: name,
    };

    for (const field of fields) {
      if (['url', 'username', 'password'].includes(field.id)) {
        torrentClient[field.id] = field.default || '';
      }
    }

    this.defaults.torrentClients.push(torrentClient);

  }

  addDefaultTracker(name: string, fields: Field[]): void {

    const tracker: TrackerSettings = {
      name: name,
      announce: '',
      imageHosts: [],
      afterUpload: '',
      defaultDescription: '',
    }

    for (const field of fields) {
      if (['announce', 'defaultDescription', 'username', 'password', 'apiKey'].includes(field.id)) {
        tracker[field.id] = field.default || '';
      }
    }

    this.defaults.trackers.push(tracker);

  }

  addImageHost(settings: Object): void {

    if (!('name' in settings)) {
      throw Error(`Tried to add image host with no name`);
    }

    const defaultSettings = this.defaults.imageHosts.find(value => value.name === settings.name);

    if (!defaultSettings) {
      throw Error(`Tried to add invalid image host ${settings.name} to the settings`);
    }

    const newSettings: ImageHostSettings = {
      name: String(settings.name),
    };

    for (const key in defaultSettings) {
      if (key in settings) {
        newSettings[key] = settings[key];
      } else {
        newSettings[key] = defaultSettings[key];
      }
    }

    this.settings.imageHosts.push(newSettings);

  }

  addImageHosts(imageHosts: Array<Object>): void {
    for (const imageHost of imageHosts) {
      this.addImageHost(imageHost);
    }
  }

  addTorrentClient(settings: Object): void {

    if (!('name' in settings)) {
      throw Error('Tried to add torrent client with no name');
    }

    const defaultSettings = this.defaults.torrentClients.find(value => value.name === settings.name);

    if (!defaultSettings) {
      throw Error(`Tried to add invalid torrent client ${settings.name} to the settings`);
    }

    const newSettings: TorrentClientSettings = {
      name: String(settings.name),
    };

    for (const key in defaultSettings) {
      if (key in settings) {
        newSettings[key] = settings[key];
      } else {
        newSettings[key] = defaultSettings[key];
      }
    }

    this.settings.torrentClients.push(newSettings);

  }

  addTorrentClients(torrentClients: Array<Object>): void {
    for (const torrentClient of torrentClients) {
      this.addTorrentClient(torrentClient);
    }
  }

  addTracker(settings: Object): void {

    if (!('name' in settings)) {
      throw Error('Tried to add tracker with no name');
    }

    const defaultSettings = this.defaults.trackers.find(value => value.name === settings.name);

    if (!defaultSettings) {
      throw Error(`Tried to add invalid tracker ${settings.name} to the settings`);
    }

    const newSettings: TrackerSettings = {
      name: String(settings.name),
      announce: '',
      imageHosts: [],
      afterUpload: '',
      defaultDescription: '',
    }

    for (const key in defaultSettings) {
      if (key in settings) {
        newSettings[key] = settings[key];
      } else {
        newSettings[key] = defaultSettings[key];
      }
    }

    this.settings.trackers.push(newSettings);

  }

  addTrackers(trackers: Array<Object>): void {
    for (const tracker of trackers) {
      this.addTracker(tracker);
    }
  }

  all(): SettingsList {
    return JSON.parse(JSON.stringify(this.settings));
  }

  get ffmpegPath(): string {
    return this.settings.ffmpegPath;
  }

  get ffprobePath(): string {
    return this.settings.ffprobePath;
  }

  get tmdbApiKey(): string {
    return this.settings.tmdbApiKey;
  }

  get trackers(): Array<TrackerSettings> {
    return this.settings.trackers;
  }

  get imageHosts(): Array<ImageHostSettings> {
    return this.settings.imageHosts;
  }

  get torrentClients(): Array<TorrentClientSettings> {
    return this.settings.torrentClients;
  }

  emitChanged() {
    for (const callback of this.changedCallbacks) {
      callback(this.all());
    }
  }

  async load(): Promise<void> {

    try {

      const path = await appDataPath('settings.json');
      const text = await readFile(path);

      let data;
      try { data = JSON.parse(text.toString()); }
      catch { data = {}; }

      if (!(data instanceof Object)) {
        throw Error('Unexpected data type')
      }

      this.setAll(data);

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Error reading settings from file: ${error.message}`);
      }
    }

  }

  onChanged(callback: (settings: SettingsList) => void): void {
    this.changedCallbacks.push(callback);
  }

  async save(): Promise<void> {

    try {

      const path = await appDataPath('settings.json');
      const text = JSON.stringify(this.settings, undefined, 2);

      await writeFile(path, text);

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Problem saving settings: ${error.message}`);
      }
    }

  }

  setAll(data: Object): void {

    for (const key of ['ffmpegPath', 'ffprobePath', 'tmdbApiKey']) {
      if (data[key]) {
        this.settings[key] = String(data[key]);
      }
    }

    const check = (key: string): boolean => {

      if (!(key in data)) {
        return false;
      }

      if (!Array.isArray(data[key])) {
        return false;
      }

      if (!data[key].every(value => value instanceof Object)) {
        return false;
      }

      return true;
    }

    if (check('imageHosts')) {
      this.settings.imageHosts = [];
      this.addImageHosts(data['imageHosts']);
    }

    if (check('trackers')) {
      this.settings.trackers = [];
      this.addTrackers(data['trackers']);
    }

    if (check('torrentClients')) {
      this.settings.torrentClients = [];
      this.addTorrentClients(data['torrentClients']);
    }

    this.emitChanged();
  
  }

}