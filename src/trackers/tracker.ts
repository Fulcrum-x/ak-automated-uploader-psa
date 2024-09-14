import { constants, readFile, rm, stat } from "node:fs/promises";
import { TorrentClientSettings, TrackerSettings } from "../settings";
import Torrent from "../torrent"
import { errorString } from "../util";
import { basename } from "node:path";
import { MediaInfo } from "../mediainfo";
import { TmdbSearchResult } from "../tmdb";
import P2PRelease from "../p2p-release";
import ImageHost from "../image-hosts/image-host";

export type KeyValueData = [key: string, value: string][];
export type FormDataFiles = Record<string, string>;
export type FormDataFields = Record<string, string | boolean | number | undefined>;
export type SearchResults = { name: string, url: string }[];

export default class Tracker {

  afterUpload: string;
  announce: string;
  changedCallbacks: Array<(data: Record<string, string | boolean>) => void>;
  data: Record<string, string | boolean>;
  imageHosts: ImageHost[];
  imageHostOrder: string[];
  keyValueData?: Record<string, KeyValueData>;
  largestScreenshotSize: number;
  mediaInfo?: Promise<MediaInfo>;
  name: string;
  screenshots: string[];
  searchResultsCallbacks: Array<(results: Array<{ name: string; url: string }>) => void>;
  searchStatusCallbacks: Array<(status: 'found' | 'not-found' | 'searching') => void>;
  source: string;
  torrentPromise?: Promise<Torrent>;
  torrent?: { path: string; blob: Blob; filename: string };

  constructor(config: TrackerSettings) {

    this.screenshots = [];
    this.largestScreenshotSize = 0;
    this.announce = config.announce;
    this.name = config.name;
    this.source = config.name;
    this.imageHostOrder = config.imageHosts;
    this.afterUpload = config.afterUpload;
    this.imageHosts = [];

    this.changedCallbacks = [];
    this.searchStatusCallbacks = [];
    this.searchResultsCallbacks = [];

    this.setSettings(config);

    this.torrentPromise = undefined;
    this.torrent = undefined;

    this.data = {};

  }

  /**
   * Add image hosts for uploading screenshots
   * 
   * @param imageHosts An array of image hosts, in the order they will be tried
   */
  addImageHosts(imageHosts: ImageHost[]): void {
    this.imageHosts = imageHosts;
  }

  addScreenshot(path: string) {
    this.screenshots.push(path);
  }
 
  clearImageHosts(): void {
    this.imageHosts = [];
  }

  async close(): Promise<void> {
    if (this.torrent) {
      try { await rm(this.torrent.path); } catch { }
    }
  }

  emitSearchResults(results: Array<{ name: string, url: string }>) {
    if (results.length > 0) {
      for (const callback of this.searchResultsCallbacks) {
        callback(results);
      }
      this.emitSearchStatus('found');
    } else {
      this.emitSearchStatus('not-found');
    }
  }

  emitSearchStatus(status: 'found' | 'not-found' | 'searching') {
    for (const callback of this.searchStatusCallbacks) {
      callback(status);
    }
  }

  emitChanged() {
    for (const callback of this.changedCallbacks) {
      callback(this.data);
    }
  }

  idFromLabel(data: [key: string, label: string][], label: string): string {
    const item = data.find(item => item[1] === label);
    if (!item) throw Error(`Couldn't find ${label} in key/value data`);
    return item[0];
  }

  getAll(): Record<string, string | boolean> {
    return this.data;
  }

  getIds(): Record<string, string> {
    const output: Record<string, string> = {};
    for (const key in this.data) {
      if (this.keyValueData && key in this.keyValueData) {
        output[key] = String(this.get(key));
      }
    }
    return output;
  }

  getString(key: string): string {
    if (false === key in this.data) throw Error(`Couldn't find ${key} in ${this.name}`);
    if (typeof this.data[key] !== 'string') throw Error(`${key} isn't a string in ${this.name}`);
    return this.data[key];
  }

  getStrings(): Record<string, string> {
    const output: Record<string, string> = {};
    for (const key in this.data) {
      if (typeof this.data[key] !== 'string') continue;
      if (this.keyValueData && key in this.keyValueData) continue;
      output[key] = this.data[key];
    }
    return output;
  }

  get(key: string, idOrValue: 'id' | 'value' = 'id'): string | boolean {
    if (false === key in this.data) throw Error(`Couldn't find ${key} in ${this.name}`);
    if (idOrValue === 'value' && this.keyValueData && key in this.keyValueData) {
      const keyValueItem = this.keyValueData[key].find(item => this.data[key] === item[0]);
      if (keyValueItem === undefined) {
        throw Error(`Couldn't find value for item ${this.data[key]} in field ${key}`);
      }
      return keyValueItem[1];
    }
    return this.data[key];
  }

  has(key: string): boolean {
    return key in this.data;
  }

  async getLargestScreenshotSize() {

    try {

      const sizes: number[] = [];
      for (const screenshot of this.screenshots) {
        sizes.push((await stat(screenshot)).size);
      }
      return Math.max(...sizes);

    } catch (error) {
      throw Error(errorString(`Couldn't get screenshot size while uploading`, error));
    }

  }

  async makeFormData(files: FormDataFiles, fields: FormDataFields): Promise<FormData> {

    const formData = new FormData();

    for (const key in files) {
      const path = files[key];
      formData.set(key, new Blob([await readFile(path)]), basename(path));
    }

    for (const key in fields) {
      const value = fields[key];
      switch (typeof value) {
        case 'string': formData.set(key, value); break;
        case 'boolean': formData.set(key, value ? '1' : '0'); break;
        case 'number': formData.set(key, String(value)); break;
      }
    }

    return formData;

  }

  async makeTorrent(): Promise<string> {

    if (!this.torrentPromise) {
      throw Error(`No torrent available to edit for ${this.name}`);
    }

    const torrent = await this.torrentPromise;
    const trackerTorrentFilename = await torrent.edit(this.announce, this.source);

    this.torrent = {
      path: trackerTorrentFilename,
      filename: basename(trackerTorrentFilename),
      blob: new Blob([await readFile(trackerTorrentFilename)], { type: 'application/x-bittorrent' }),
    };

    return trackerTorrentFilename;

  }

  onChanged(callback: (data: Record<string, string | boolean>) => void): void {
    this.changedCallbacks.push(callback);
  }

  onSearchStatus(callback: (status: 'searching' | 'found' | 'not-found') => void): void {
    this.searchStatusCallbacks.push(callback);
  }

  onSearchResults(callback: (results: Array<{ name: string; url: string }>) => void): void {
    this.searchResultsCallbacks.push(callback);
  }

  removeScreenshot(path: string): void {
    this.screenshots = this.screenshots.filter(value => value !== path);
  }

  replaceFieldTags(): void {

    const data = this.getStrings(); {

      for (const key in data) {

        let description = data[key];

        const matchedTags = [...description.matchAll(/\{field (.+?)\}/gi)];
        for (const match of matchedTags) {

          const [matched, field] = match;

          if (this.has(field)) {
            const replacement = this.get(field, 'value');
            if (typeof replacement === 'string') {
              description = description.replace(matched, replacement);
            } else if (typeof replacement === 'boolean') {
              description = description.replace(matched, replacement ? 'Yes' : 'No');
            }
          } else {
            description = description.replace(matched, '');
          }

        }

        this.set(key, description);
        
      }

    }

  }

  /**
   * Replaces MediaInfo tags in every string-based data field. This should
   * probably be split out into its own thing at some point.
   * 
   * @example
   * tracker.set('description', '{mediainfo video}{Width} x {Height}{/mediainfo}');
   * await tracker.replaceMediaInfoTags();
   * tracker.get('description'); // 1920 x 1080
   */

  async replaceMediaInfoTags(): Promise<void> {

    if (!this.mediaInfo) {
      throw Error(`No MediaInfo available for ${this.name}`);
    }

    const mediaInfo = await this.mediaInfo;
    const data = this.getStrings();

    for (const key in data) {

      let description = data[key];

      if (mediaInfo.fullText) {
        description = description.replace(/\{mediainfo fulltext\}/g, mediaInfo.fullText);
      }

      if (mediaInfo.path) {
        description = description.replace(/\{mediainfo filename\}/g, basename(mediaInfo.path));
      }

      let separator = '';

      const formatByArgument = (input: string | number, args: string): string => {

        args = args.trim();

        for (const arg of args.split(' ')) {

          switch (arg) {

            case 'kilobits':
              return String(Math.round(Number(input) / 1000));
            
            case 'megabits':
              return String(Math.round(Number(input) / 10000) / 100);

          }

        }

        return String(input);

      }

      const parse = (input: string, data: Object, lastData: string): string => {

        // Loop through all instances of {tag}...{/tag}
        const matchedTags = [...input.matchAll(/{([a-zA-Z0-9_]+?)( [a-zA-Z0-9_]+?)*}(.+?){\/\1}(\r\n|\r|\n)?/gis)];
        for (const matches of matchedTags) {

          const [match, type, args, innerText, newLine] = matches;

          // If {tag} exists, replace it, otherwise discard {tag}...{/tag}
          if (type in data) {
            input = input.replace(match, parse(innerText, data, formatByArgument(data[type], args || '')) + (newLine || ''));
          } else {
            if (type === 'sep') separator = innerText;
            input = input.replace(match, '');
          }

        }

        if (lastData) {
          input = input.replace('{value}', lastData);
        }

        // Loop through all single instances of {tag}
        const singleTags = [...input.matchAll(/{([a-zA-Z0-9_]+?)( [a-zA-Z0-9_]+?)*}/gi)];
        for (const matches of singleTags) {

          const [match, type, args] = matches;

          // If {tag} exists, replace it, otherwise discard the sequence
          if (type in data) {
            input = input.replace(match, formatByArgument(data[type], args || ''));
          } else {
            input = input.replace(match, '');
          }
          
        }

        return input;

      }

      const matchesArray = [...description.matchAll(/\{mediainfo (general|audio|image|menu|other|text|video)\}(.*?){\/mediainfo}/igs)];
      for (const matches of matchesArray) {

        separator = '';

        const [match, type, innerText] = matches;

        let parsed: string[] = [];
        for (const data of mediaInfo[type]) {
          parsed.push(parse(innerText, data, ''));
        }

        description = description.replace(match, parsed.join(separator));

      }

      this.set(key, description);

    }

  }

  set(key: string, value: string | boolean, skipCallback?: boolean): void {

    if (this.keyValueData && this.keyValueData[key]) {
      const keyValueItem = this.keyValueData[key].find(item => item[1] === value);
      if (keyValueItem === undefined) {
        console.error(`Couldn't find value ${value} in field ${key}`);
      } else {
        this.data[key] = keyValueItem[0];
      }
    } else {
      this.data[key] = value;
    }

    if (!skipCallback) this.emitChanged();

  }

  setAll(data: Record<string, string | boolean>): void {
    for (const key in data) {
      this.set(key, data[key]);
    }
  }

  setMediaInfo(mediaInfo: Promise<MediaInfo>): void {
    this.mediaInfo = mediaInfo;
  }

  setMetadata(metadata: TmdbSearchResult): void {
    
  }

  setRelease(release: P2PRelease): void {

  }

  setSettings(settings: TrackerSettings): void {
    Object.assign(this, settings);
  }

  setScreenshots(screenshots: string[], largestSize: number): void {
    this.screenshots = screenshots;
    this.largestScreenshotSize = largestSize;
  }

  setTorrent(torrentPromise: Promise<Torrent>): void {
    this.torrentPromise = torrentPromise;
  }

  async upload(): Promise<void> {

  }

  async uploadScreenshots(): Promise<void> {

    const data = this.getStrings();

    for (const key in data) {

      let description = data[key];

      let matches = description.match(/{screenshots(?:[= ]([0-9]+))?}(.*?){\/screenshots}/i);
      if (!matches) continue;
      let [match, width, format] = matches;

      let selectedImageHost: ImageHost | undefined;

      for (const imageHost of this.imageHosts) {

        if (this.largestScreenshotSize > imageHost.maxSize) {
          continue;
        } else {
          selectedImageHost = imageHost;
          break;
        }

      }

      if (false === selectedImageHost instanceof ImageHost) throw Error("Couldn't find a suitable image host");

      const formatted = await selectedImageHost.upload(
        this.screenshots,
        format,
        width === '' ? undefined : Number(width)
      );

      description = description.replace(match, formatted);
      this.set(key, description);

    }

  }

}