import { Field } from "../gui/settings-window";
import Open from "./open";
import QBittorrent, { settings } from "./qbittorrent";
import TorrentClient from "./torrent-client";

export const torrentClients: Record<string, { class: typeof TorrentClient, settings: Field[] }> = {
  'Open': {
    class: Open,
    settings: [],
  },
  'qBittorrent': {
    class: QBittorrent,
    settings: settings
  },
}