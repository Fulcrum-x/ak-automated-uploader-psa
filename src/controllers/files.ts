import FileTable from "../gui/file-table";
import Files from "../files";
import { join } from "node:path";

export default class FilesController {

  ui: FileTable;
  files: Files;
  mediaInfoChangedCallbacks: Array<(name: string) => void>;
  screenshotsChangedCallbacks: Array<(name: string, screenshots: number) => void>;
  path: string;

  constructor(ui: FileTable) {
    this.ui = ui;
    this.files = new Files();
    this.path = '';
    this.mediaInfoChangedCallbacks = [];
    this.screenshotsChangedCallbacks = [];
  }

  dirPath(): string {
    return this.files.dirPath;
  }

  emitMediaInfoChanged(path: string): void {
    for (const callback of this.mediaInfoChangedCallbacks) {
      callback(path);
    }
  }

  emitScreenshotsChanged(path: string, count: number): void {
    for (const callback of this.screenshotsChangedCallbacks) {
      callback(path, count);
    }
  }

  findPathsByDir(...args: string[]): string[] {
    return this.files.findPaths(join(...args));
  }

  getName(key): string {
    return this.files.getName(key);
  }

  getPaths(): string[] {
    return this.files.getPaths();
  }

  getSize(): number {
    return this.files.getSize();
  }

  async largest(paths: string[]): Promise<string> {
    return await this.files.largest(paths);
  }

  onMediaInfoChanged(callback: (name: string) => void): void {
    this.mediaInfoChangedCallbacks.push(callback);
  }

  onScreenshotsChanged(callback: (name: string, screenshots: number) => void): void {
    this.screenshotsChangedCallbacks.push(callback);
  }

  setMediaInfo(name): void {
    this.ui.setMediaInfo(name);
  }

  async setPath(path): Promise<void> {

    this.path = path;

    await this.files.add(path);
    this.files.getNames().forEach(name => this.ui.add(name));

    this.ui.onMediaInfoChanged(name => {
      const path = this.files.getPath(name);
      this.emitMediaInfoChanged(path);
    });

    this.ui.onScreenshotsChanged((name, count) => {
      const path = this.files.getPath(name);
      this.emitScreenshotsChanged(path, count);
    });

  }

  setScreenshots(name: string, screenshots: number): void {
    this.ui.setScreenshots(name, screenshots);
  }

}