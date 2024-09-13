import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { errorString } from "./util";

interface Screenshot {
  video: string;
  time: number;
  path: string;
  promise: Promise<string>;
}

export default class Screenshots {

  ffmpegPath: string;
  ffprobePath: string;
  data: Screenshot[];
  createdCallbacks: Array<(path: string) => void>;
  removedCallbacks: Array<(path: string) => void>;

  constructor(ffmpegPath: string, ffprobePath: string) {
    this.data = [];
    this.createdCallbacks = [];
    this.removedCallbacks = [];
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
  }

  async clear(videoPath?: string): Promise<void> {
    const screenshots = videoPath ? this.getScreenshotsByVideo(videoPath): this.data;
    for (const screenshot of screenshots) {
      await this.remove(screenshot.path);
    }
  }

  async close(): Promise<void> {
    await this.clear();
  }

  ffmpeg(...options: string[]): Promise<string> {
    return new Promise((resolve, reject) => {

      const process = spawn(this.ffmpegPath, options);

      let output = '';
      process.stdout.on('data', data => output += data.toString());

      process.on('close', () => resolve(output));
      process.on('error', error => reject(error));

    });
  }

  ffprobe(...options: string[]): Promise<Object> {
    return new Promise((resolve, reject) => {

      options = [
        '-v', 'error',
        '-output_format', 'json',
        ...options
      ];

      const process = spawn(this.ffprobePath, options);

      let output = '';
      process.stdout.on('data', data => output += data.toString());

      process.on('exit', () => {
        try {
          const data = JSON.parse(output);
          resolve(data);
        } catch {
          reject("Couldn't parse JSON from ffprobe");
        }
      });
      process.on('error', error => reject(error));

    });
  }

  async create(videoPath: string, count: number) {

    try {

      await this.wait();

      await this.clear(videoPath);

      const dir = join(tmpdir(), 'ak-automated-uploader', 'screenshots');
      await mkdir(dir, { recursive: true });

      const isVideo = await this.isVideo(videoPath);
      if (!isVideo) throw Error(`Couldn't confirm ${basename(videoPath)} is a video`);

      const duration = await this.getDuration(videoPath);

      for (let i = 0; i < count; i++) {

        const screenshotTime = duration / (count + 1) * (i + 1);
        const screenshotFilename = `${randomUUID()}.png`;
        const screenshotPath = join(dir, screenshotFilename);

        this.take(videoPath, screenshotTime, screenshotPath);

      }

    } catch (error) {
      throw Error(errorString('Problem taking screenshot', error));
    }

  }

  emitCreated(path: string): void {
    for (const callback of this.createdCallbacks) {
      callback(path);
    }
  }

  emitRemoved(path: string): void {
    for (const callback of this.removedCallbacks) {
      callback(path);
    }
  }

  async getDuration(path: string): Promise<number> {

    try {

      const data = await this.ffprobe('-show_entries', 'format=duration', path);

      if (false === 'format' in data) {
        throw Error('Format not found');
      }

      if (false === data.format instanceof Object) {
        throw Error('Unexpected data type');
      }

      if (false === 'duration' in data.format) {
        throw Error('Duration not found');
      }

      const duration = Number(String(data.format.duration));

      if (Number.isNaN(duration) || duration <= 0) {
        throw Error('Invalid duration');
      }

      return duration;

    } catch(error) {
      throw Error(errorString(`Couldn't find duration of ${basename(path)}`, error));
    }

  }

  getScreenshotsByPath(path: string): Screenshot[] {
    return this.data.filter(value => value.path === path);
  }

  getScreenshotsByVideo(path: string): Screenshot[] {
    return this.data.filter(value => value.video === path);
  }

  async isVideo(path: string): Promise<boolean> {

    const data = await this.ffprobe(
      '-select_streams', 'v',
      '-show_entries', 'stream=index',
      path
    );

    if (false === 'streams' in data) return false;
    if (!Array.isArray(data.streams)) return false;
    if (data.streams.length < 1) return false;

    return true;

  }
  
  onCreated(callback: (path: string) => void) {
    this.createdCallbacks.push(callback);
  }

  onRemoved(callback: (path: string) => void) {
    this.removedCallbacks.push(callback);
  }

  async remove(path: string): Promise<void> {

    try {
      this.data = this.data.filter(value => value.path !== path);
      await rm(path, { force: true });
    } catch (error) {
      console.log(errorString("Couldn't delete thumbnail", error));
    }

    this.emitRemoved(path);

  }

  setFfmpegPath(ffmpegPath: string) {
    this.ffmpegPath = ffmpegPath;
  }

  setFfprobePath(ffprobePath: string) {
    this.ffprobePath = ffprobePath;
  }

  async take(videoPath: string, time: number, screenshotPath: string): Promise<void> {

    try {

      await this.wait();

      const promise = this.ffmpeg(
        '-y',
        '-ss', String(time),
        '-i', videoPath,
        '-vf', "scale='max(iw,iw*sar)':'max(ih,ih/sar)'",
        '-frames:v', '1',
        screenshotPath
      );

      this.data.push({
        video: videoPath,
        time: time,
        path: screenshotPath,
        promise: promise
      });

      await promise;

      this.emitCreated(screenshotPath);

    } catch (error) {
      throw Error(errorString('Problem generating screenshot', error));
    }

  }

  wait(): Promise<string[]> {
    return Promise.all(this.data.map(value => value.promise));
  }

}