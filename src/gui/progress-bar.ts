import { Direction, QBoxLayout, QLabel, QLayout, QProgressBar, QWidget } from "@nodegui/nodegui";

export default class TorrentProgressBar {

  widget: QWidget;
  layout: QLayout;
  statusLabel: QLabel;
  statusBar: QProgressBar;

  constructor() {

    this.widget = new QWidget();
    this.layout = new QBoxLayout(Direction.LeftToRight);
    this.layout.setContentsMargins(0, 0, 0, 0);
    this.widget.setLayout(this.layout);

    this.statusLabel = new QLabel();
    this.statusLabel.setText('Torrent progress:');
    this.layout.addWidget(this.statusLabel);

    this.statusBar = new QProgressBar();
    this.statusBar.setValue(0);
    this.layout.addWidget(this.statusBar);

  }

  set(progress: number) {
    this.statusBar.setValue(progress);
  }

}