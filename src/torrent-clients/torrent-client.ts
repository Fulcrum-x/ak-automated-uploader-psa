import { TorrentClientSettings } from "../settings";

export default abstract class TorrentClient {
  
  name: string;

  constructor(config: TorrentClientSettings) {
    this.name = config.name;
  }

  getCookies(response: Response): string | null {

    const cookie = response.headers.get('Set-Cookie');
    if (cookie === null) return null;

    let cookies = cookie.split(',');
    cookies = cookies.map(cookie => cookie.trim());
    cookies = cookies.map(cookie => cookie.split(';')[0].trim());
    
    return cookies.join('; ');

  }

  abstract send(path: string): Promise<void>;

}