import { imageHosts } from "src/image-hosts";
import MainWindow from "../gui/main-window";
import SettingsWindow from "../gui/settings-window";
import Settings, { SettingsList } from "../settings";
import { torrentClients } from "../torrent-clients";
import { trackers } from "../trackers";

export default class SettingsController {
  
  changedCallbacks: Array<(settings: SettingsList) => void>;
  ui: SettingsWindow;
  settings: Settings;

  constructor(ui: MainWindow) {

    this.changedCallbacks = [];

    this.settings = new Settings();
    this.settings.onChanged(settings => this.emitChanged(settings));

    this.ui = new SettingsWindow(ui.window);
    this.ui.onSave(newSettings => {
      this.settings.setAll(newSettings);
      this.settings.save();
    });

    for (const name in imageHosts) {
      this.settings.addDefaultImageHost(name, imageHosts[name].settings);
      this.ui.addDefaultImageHost(name, imageHosts[name].settings);
    }

    for (const name in torrentClients) {
      this.settings.addDefaultTorrentClient(name, torrentClients[name].settings);
      this.ui.addDefaultTorrentClient(name, torrentClients[name].settings);
    }

    for (const name in trackers) {
      this.settings.addDefaultTracker(name, trackers[name].settings);
      this.ui.addDefaultTracker(name, trackers[name].settings);
    }

  }

  emitChanged(settings: SettingsList): void {
    for (const callback of this.changedCallbacks) {
      callback(settings);
    }
  }

  onChanged(callback: (settings: SettingsList) => void) {
    this.changedCallbacks.push(callback);
  }

  async load(): Promise<void> {
    await this.settings.load();
  }

  show(): void {
    this.ui.setAll(this.settings.all())
    this.ui.show();
  }

}