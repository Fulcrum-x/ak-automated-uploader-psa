import { TorrentClientSettings } from "../settings";
import TorrentClient from "./torrent-client";
import { Field } from "../gui/settings-window";
import { errorString } from "../util";
import { readFile } from "fs/promises";
import { basename } from "path";

export const settings: Field[] = [
  {
    id: 'url',
    label: 'WebUI URL',
    description: 'The IP address and port to access the WebUI (like http://192.168.0.100:12345)',
  },
  {
    id: 'username',
    label: 'User name',
  },
  {
    id: 'password',
    label: 'Password',
    type: 'password',
  },
];

export default class QBittorrent extends TorrentClient {

  cookies: string;
  url?: string;
  username?: string;
  password?: string;
  path?: string;
  category?: string;

  constructor(config: TorrentClientSettings) {

    super(config);

    this.url = config.url;
    this.username = config.username;
    this.password = config.password;

    this.cookies = '';

  }

  async login(): Promise<void> {

    if (!this.url) throw Error('Missing qBittorrent web UI URL');
    if (!this.username) throw Error('Missing qBittorrent web UI username');
    if (!this.password) throw Error('Missing qBittorrent web UI password');

    const url = new URL(`/api/v2/auth/login`, this.url);

    try {

      const response = await this.post('/api/v2/auth/login', new URLSearchParams({
        username: this.username,
        password: this.password,
      }));

      const cookies = this.getCookies(response);
      if (!cookies) throw Error("Didn't receive cookies (wrong username or password?)");
      this.cookies = cookies;

    } catch (error) {
      throw Error(errorString('Failed to log in to qBittorrent web UI', error));
    }

  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/v2/auth/logout');
    } catch { }
  }

  async post(endpoint: string, data?: FormData | URLSearchParams): Promise<Response> {

    const url = new URL(endpoint, this.url);

    /* The qBittorrent web UI will abort the connection if it receives
       something with Transfer-Encoding: chunked, which is fetch()'s
       behaviour when receiving a FormData in the body.

       So we're going to build a Request first, consume and encode the
       FormData in the request by calling Request.blob(), then use that blob
       to set a Content-Length, which disables chunked transfer encoding */

    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Cookie': this.cookies,
        'Referer': `${url.protocol}//${url.host}`,
      },
      body: data,
    });

    const blob = await request.blob();

    request.headers.set('Content-Length', String(blob.size));

    const response = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body: blob,
    });

    if (!response.ok) {
      throw Error(await response.text());
    }

    return response;

  }

  async send(path: string): Promise<void> {

    await this.login();
    await this.upload(path);
    await this.logout();

  }

  async upload(path: string): Promise<void> {

    try {

      const formData = new FormData();

      formData.set('skip_checking', 'true');

      const file = await readFile(path);
      const blob = new Blob([file], { type: 'application/x-bittorrent' });
      formData.set('torrents', blob, basename(path));
      
      await this.post('/api/v2/torrents/add', formData);

    } catch (error) {
      console.log(error);
      throw Error(errorString('Failed to upload torrent file to qBittorrent', error));
    }

  }

}