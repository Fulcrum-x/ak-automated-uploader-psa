import { QIcon } from "@nodegui/nodegui";
import TrackerTab from "../gui/tracker-tab";
import TrackerTabs from "../gui/tracker-tabs";
import { trackerForms } from "../gui/trackers";
import { MediaInfo } from "../mediainfo";
import P2PRelease from "../p2p-release";
import { ImageHostSettings, SettingsList, TrackerSettings } from "../settings";
import { TmdbSearchResult } from "../tmdb";
import Torrent from "../torrent";
import { trackers } from "../trackers";
import Tracker from "../trackers/tracker";
import TorrentClients from "./torrent-clients";
import { imageHosts } from "../image-hosts";
import ImageHost from "../image-hosts/image-host";
import assert from "node:assert";

export default class TrackersController {

  ui: TrackerTabs;
  settings: SettingsList;
  torrentClients: TorrentClients;
  trackers: Tracker[];

  constructor(ui: TrackerTabs, settings: SettingsList, torrentClients: TorrentClients) {

    this.ui = ui;
    this.settings = settings;
    this.torrentClients = torrentClients;
    this.trackers = [];

    this.updateFromSettings();

  }

  add(config: TrackerSettings): Tracker {

    const tracker = new trackers[config.name].class(config);
    this.trackers.push(tracker);

    const tab = this.ui.add(config.name, config.afterUpload);
    
    tab.form?.onValueChanged((name, value) => tracker.set(name, value, true));
    tracker.onChanged(data => tab.form?.setValues(data, true));

    tracker.onSearchStatus(status => tab.setSearchStatus(status));
    tracker.onSearchResults(results => tab.addSearchResults(results));

    tab.onPreview(async() => {

      tracker.replaceFieldTags();

      tab.setStatus('Setting MediaInfo');
      await tracker.replaceMediaInfoTags();

      tab.setStatus('Uploading screenshots');
      await tracker.uploadScreenshots();

      tab.setStatus('Preview done');

    })

    tab.onUpload(async () => {

      tracker.replaceFieldTags();

      tab.setStatus('Setting MediaInfo');
      await tracker.replaceMediaInfoTags();

      tab.setStatus('Uploading screenshots');
      await tracker.uploadScreenshots();

      tab.setStatus('Making torrent');
      await tracker.makeTorrent();

      tab.setStatus(`Uploading to ${config.name}`);
      await tracker.upload();

      tab.setStatus('Sending torrent to client');
      assert(tracker.torrent);
      await this.torrentClients.send(tracker.afterUpload, tracker.torrent.path);

      tab.setStatus('Done');

    });

    return tracker;

  }

  addScreenshot(path: string): void {
    this.trackers.forEach(tracker => tracker.addScreenshot(path));
  }

  async close(): Promise<void> {
    for (const tracker of this.trackers) {
      await tracker.close();
    }
  }

  async remove(trackerName: string): Promise<void> {
    const tracker = this.trackers.find(tracker => tracker.name === trackerName);
    if (!tracker) throw Error(`Tried to remove non-existant tracker ${trackerName}`);
    await tracker.close();
    this.trackers = this.trackers.filter(value => value.name !== trackerName);
  }

  removeScreenshot(path: string): void {
    this.trackers.forEach(tracker => tracker.removeScreenshot(path));
  }

  setMediaInfo(mediaInfo: Promise<MediaInfo>): void {
    this.trackers.forEach(tracker => tracker.setMediaInfo(mediaInfo));
  }

  setMetadata(metadata: TmdbSearchResult): void {
    this.trackers.forEach(tracker => tracker.setMetadata(metadata));
  }

  setRelease(release: P2PRelease): void {
    this.trackers.forEach(tracker => tracker.setRelease(release));
  }

  setSettings(settings: SettingsList) {
    this.settings = settings;
    this.updateFromSettings();
  }

  setTorrent(torrent: Promise<Torrent>): void {
    this.trackers.forEach(tracker => tracker.setTorrent(torrent));
  }

  updateFromSettings() {

    for (const trackerSettings of this.settings.trackers) {

      const imageHostObjects: ImageHost[] = [];

      // trackerSettings.imageHosts contains all the image hosts for this tracker, in the order they should be tried
      for (const imageHostName of trackerSettings.imageHosts) {

        if (!imageHosts[imageHostName]) {
          throw Error(`Couldn't find image host ${imageHostName} to add to ${trackerSettings.name}`);
        }

        const imageHostClass = imageHosts[imageHostName].class;
        const imageHostSettings = this.settings.imageHosts.find(imageHost => imageHost.name === imageHostName);

        if (!imageHostSettings) {
          throw Error(`Couldn't find settings for ${imageHostName} while adding to ${trackerSettings.name}`);
        }

        const imageHost = new imageHostClass(imageHostSettings);
        imageHostObjects.push(imageHost);

      }

      let tracker = this.trackers.find(tracker => tracker.name === trackerSettings.name);

      if (tracker) {
        tracker.setSettings(trackerSettings);
      } else {
        tracker = this.add(trackerSettings);
      }

      tracker.clearImageHosts();
      tracker.addImageHosts(imageHostObjects);

    }

  }

}