import { Direction, Orientation, QBoxLayout, QIcon, QLayout, QSplitter, QWidget } from "@nodegui/nodegui";
import TmdbPanel from "./tmdb-panel";
import FileTable from "./file-table";
import ScreenshotGallery from "./screenshot-gallery";
import TrackerTabs from "./tracker-tabs";
import TorrentProgressBar from "./progress-bar";

export default class UploadTab {

  closeCallbacks: Array<() => void>
  files: FileTable;
  icon: QIcon;
  leftLayout: QLayout;
  leftWidget: QWidget;
  name: string;
  rightLayout: QLayout;
  rightWidget: QWidget;
  screenshots: ScreenshotGallery;
  progress: TorrentProgressBar;
  tmdb: TmdbPanel;
  trackers: TrackerTabs;
  widget: QSplitter;

  constructor(name: string) {

    this.name = name;
    this.icon = new QIcon();
    this.closeCallbacks = [];

    this.widget = new QSplitter();
    this.widget.setOrientation(Orientation.Horizontal);

    this.leftWidget = new QWidget();
    this.leftLayout = new QBoxLayout(Direction.TopToBottom);
    this.leftWidget.setLayout(this.leftLayout);

    this.tmdb = new TmdbPanel();
    this.leftLayout.addWidget(this.tmdb.widget);

    this.files = new FileTable();
    this.leftLayout.addWidget(this.files.widget);

    this.screenshots = new ScreenshotGallery();
    this.leftLayout.addWidget(this.screenshots.widget);

    this.progress = new TorrentProgressBar();
    this.leftLayout.addWidget(this.progress.widget);

    this.rightWidget = new QWidget();
    this.rightLayout = new QBoxLayout(Direction.LeftToRight);
    this.rightWidget.setLayout(this.rightLayout);

    this.trackers = new TrackerTabs();
    this.rightLayout.addWidget(this.trackers.widget);

    this.widget.addWidget(this.leftWidget);
    this.widget.addWidget(this.rightWidget);

  }

  close(): void {
    this.emitClose();
  }

  emitClose() {
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

}