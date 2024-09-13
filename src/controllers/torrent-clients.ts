import TorrentClient from "../torrent-clients/torrent-client";
import { TorrentClientSettings } from "../settings";
import Open from "../torrent-clients/open";
import QBittorrent from "../torrent-clients/qbittorrent";

const classes: Record<string, new (config: TorrentClientSettings) => TorrentClient> = {
  'openTorrent': Open,
  'qBittorrent': QBittorrent,
}

export default class TorrentClients {

  clients: TorrentClient[];

  constructor() {
    this.clients = [];
  }

  add(client: TorrentClientSettings) {
    if (classes[client.name]) {
      this.clients.push(new classes[client.name](client));
    }
  }

  addAll(clients: TorrentClientSettings[]) {
    for (const client of clients) {
      this.add(client);
    }
  }

  clear() {
    this.clients = [];
  }

  find(name: string): TorrentClient {
    for (const client of this.clients) {
      if (client.name === name) {
        return client;
      }
    }
    throw Error(`Couldn't find torrent client ${name}`);
  }

  async send(name: string, path: string) {
    const client = this.find(name);
    return await client.send(path);
  }

}