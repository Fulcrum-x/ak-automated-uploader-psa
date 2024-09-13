import { constants, FileHandle, open, stat } from "node:fs/promises";
import { AudioTrack, BaseTrack, GeneralTrack, ImageTrack, MediaInfo as MediaInfoMediaInfo, MenuTrack, OtherTrack, ReadChunkFunc, TextTrack, Track, VideoTrack, mediaInfoFactory } from "mediainfo.js";
import { basename } from "node:path";

export class MediaInfo {

  mediaInfo?: MediaInfoMediaInfo;
  fullText: string;
  path: string;
  tracks: Track[];
  general: GeneralTrack[];
  audio: AudioTrack[];
  image: ImageTrack[];
  menu: MenuTrack[];
  other: OtherTrack[];
  text: TextTrack[];
  video: VideoTrack[];

  constructor() {
    this.path = '';
    this.fullText = '';
    this.tracks = [];
    this.general = [];
    this.audio = [];
    this.image = [];
    this.menu = [];
    this.other = [];
    this.text = [];
    this.video = [];
  }

  get defaultAudio(): AudioTrack | undefined {

    const defaultAudio = this.audio.find(audio => audio.Default === 'Yes');
    if (defaultAudio) {
      return defaultAudio;
    }

    const firstAudio = this.audio.find(audio => audio);
    return firstAudio;

  }

  get defaultVideo(): VideoTrack | undefined {

    const defaultVideo = this.video.find(video => video.Default === 'Yes');
    if (defaultVideo) return defaultVideo;

    const firstVideo = this.video.find(video => video);
    return firstVideo;

  }

  async get(path: string) {

    this.path = path;

    const fileHandle = await open(path, constants.R_OK);
    const fileSize = (await stat(path)).size;

    this.fullText = await this.analyze(fileHandle, fileSize, 'text');
    this.tracks = await this.analyze(fileHandle, fileSize,'tracks');

    fileHandle.close();

    this.fullText = this.fullText.replace(
      /(?:^|\r\n|\r|\n)General(\r\n|\r|\n)/i,
      `$&Complete name                            : ${basename(path)}$1`
    );

    this.general = this.tracks.filter(value => value['@type'] === 'General');
    this.audio = this.tracks.filter(value => value['@type'] === 'Audio');
    this.image = this.tracks.filter(value => value['@type'] === 'Image');
    this.menu = this.tracks.filter(value => value['@type'] === 'Menu');
    this.other = this.tracks.filter(value => value['@type'] === 'Other');
    this.text = this.tracks.filter(value => value['@type'] === 'Text');
    this.video = this.tracks.filter(value => value['@type'] === 'Video');

  }

  async analyze(fileHandle: FileHandle, fileSize: number, type: 'text'): Promise<string>;
  async analyze(fileHandle: FileHandle, fileSize: number, type: 'tracks'): Promise<Track[]>;
  async analyze(fileHandle: FileHandle, fileSize: number, outputFormat: 'text' | 'tracks'): Promise<string | Track[]> {

    const mediaInfo = await mediaInfoFactory({ format: outputFormat === 'text' ? 'text' : 'object' });

    const readChunk: ReadChunkFunc = async (size, offset) => {
      const buffer = new Uint8Array(size);
      await fileHandle.read(buffer, 0, size, offset);
      return buffer;
    }

    const result = await mediaInfo.analyzeData(fileSize, readChunk);


    if (typeof result === 'string') {
      return result;
    }

    if (!result.media) {
      throw Error(`No media info found`);
    }

    return result.media.track;

  }

}

export default async function getMediaInfo(path: string): Promise<MediaInfo> {
  const mediaInfo = new MediaInfo();
  await mediaInfo.get(path);
  return mediaInfo;
}