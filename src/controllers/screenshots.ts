import ScreenshotGallery from "../gui/screenshot-gallery";
import Screenshots from "../screenshots";

export default class ScreenshotsController {

  ui: ScreenshotGallery;
  screenshots: Screenshots;
  createdCallbacks: Array<(path: string) => void>;
  removedCallbacks: Array<(path: string) => void>;

  constructor(ui: ScreenshotGallery, ffmpegPath: string, ffprobePath: string) {

    this.ui = ui;
    this.screenshots = new Screenshots(ffmpegPath, ffprobePath);

    this.createdCallbacks = [];
    this.removedCallbacks = [];

    this.screenshots.onCreated(path => {
      ui.add(path);
      this.emitCreated(path);
    });

    this.screenshots.onRemoved(path => {
      ui.remove(path);
      this.emitRemoved(path);
    });

    ui.onRemove(path => this.screenshots.remove(path));

  }

  async close(): Promise<void> {
    await this.screenshots.close();
  }

  create(path: string, count: number) {
    this.screenshots.create(path, count);
  }

  onCreated(callback: (path: string) => void) {
    this.createdCallbacks.push(callback);
  }

  onRemoved(callback: (path: string) => void) {
    this.removedCallbacks.push(callback);
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

  setFfmpegPath(path: string): void {
    this.screenshots.setFfmpegPath(path);
  }

  setFfprobePath(path: string): void {
    this.screenshots.setFfprobePath(path);
  }

}