import { Field } from "../gui/settings-window";
import { TorrentClientSettings } from "../settings";
import { open } from "../util";
import TorrentClient from "./torrent-client";

export default class Open extends TorrentClient {

  constructor(config: TorrentClientSettings) {
    super(config);
  }

  async send(path: string): Promise<void> {
    open(path);
  }

}