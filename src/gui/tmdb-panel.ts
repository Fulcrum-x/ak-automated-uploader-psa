import { AspectRatioMode, Direction, MatchFlag, QBoxLayout, QLabel, QLayout, QListWidget, QListWidgetItem, QPixmap, QWidget, TransformationMode } from "@nodegui/nodegui";

export default class TmdbPanel {

  widget: QWidget;
  layout: QLayout;
  imageLabel: QLabel;
  listWidget: QListWidget;
  height: number;

  constructor() {

    this.imageLabel = new QLabel();

    this.listWidget = new QListWidget();

    this.layout = new QBoxLayout(Direction.LeftToRight);
    this.layout.setContentsMargins(0, 0, 0, 0);
    this.layout.addWidget(this.imageLabel);
    this.layout.addWidget(this.listWidget);

    this.widget = new QWidget();
    this.widget.setLayout(this.layout);

    this.height = 150;

    this.setHeight(150);
    this.setMinimumWidth(350);

  }

  addResults(results: string[]): void {
    this.listWidget.addItems(results)
  }

  clear() {
    this.listWidget.clear();
    this.imageLabel.setText('');
  }

  onSelected(callback: (currentText: string) => void): void {
    this.listWidget.addEventListener('currentTextChanged', currentText => callback(currentText));
  }

  selectResult(result: string): boolean {

    let selectedItem: QListWidgetItem | undefined;

    const items = this.listWidget.findItems(result, MatchFlag.MatchExactly);
    for (const item of items) {
      selectedItem = item;
      break;
    }

    if (selectedItem) {
      this.listWidget.setCurrentItem(selectedItem);
    }

    return !!selectedItem;

  }

  setHeight(height: number): void {
    this.height = height;
    this.widget.setMaximumHeight(height);
    this.imageLabel.setMinimumWidth(height / 1.5);
  }

  setMinimumWidth(width: number): void {
    this.widget.setMinimumWidth(width);
  }

  async setPoster(url: string): Promise<void> {

    if (url === '') {
      this.imageLabel.setText('');
      return;
    }

    try {
      const response = await fetch(url);
      const data = await response.arrayBuffer();
      const pixmap = new QPixmap();
      pixmap.loadFromData(Buffer.from(data));
      const scaled = pixmap.scaled(this.height / 1.5, this.height, AspectRatioMode.KeepAspectRatio, TransformationMode.SmoothTransformation);
      this.imageLabel.setPixmap(scaled);
    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Failed to display poster from TMDB: ${error.message}`);
      } else {
        throw Error('Failed to display poster from TMDB');
      }
    }

  }

}