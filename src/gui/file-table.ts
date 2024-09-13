import { ItemFlag, MatchFlag, QCheckBox, QTableWidget, QTableWidgetItem, QWidget, WidgetEventTypes } from "@nodegui/nodegui";

const MAX_SCREENSHOTS = 99;

export default class FileTable {

  widget: QTableWidget;
  mediaInfoCheckBoxes: Map<number, QCheckBox>;
  mediaInfoChangedCallbacks: Array<(name: string) => void>;
  screenshotsChangedCallbacks: Array<(name: string, screenshots: number) => void>;

  constructor() {

    this.mediaInfoChangedCallbacks = [];
    this.screenshotsChangedCallbacks = [];

    this.widget = new QTableWidget(0, 3);

    const fileNameHeader = new QTableWidgetItem();
    fileNameHeader.setText('File name');
    this.widget.setHorizontalHeaderItem(0, fileNameHeader);

    const screenshotsHeader = new QTableWidgetItem();
    screenshotsHeader.setText('SS');
    screenshotsHeader.setToolTip('Screenshots');
    this.widget.setHorizontalHeaderItem(1, screenshotsHeader);

    const mediaInfoHeader = new QTableWidgetItem();
    mediaInfoHeader.setText('MI');
    mediaInfoHeader.setToolTip('MediaInfo');
    this.widget.setHorizontalHeaderItem(2, mediaInfoHeader);

    this.mediaInfoCheckBoxes = new Map();

    // Screenshots cell is changed
    this.widget.addEventListener('cellChanged', (row, column) => {
      if (column !== 1) return;
      this.processScreenshotChange(row);
    });

    this.widget.addEventListener(WidgetEventTypes.Resize, () => {
      this.resizeColumns();
    });

    this.resizeColumns();

  }

  add(name: string): void {

    if (!name) {
      throw Error("Can't add a file with a blank filename");
    }

    const row = this.widget.rowCount();
    this.widget.setRowCount(row + 1);

    const nameCell = new QTableWidgetItem(name);
    nameCell.setFlags(nameCell.flags() & ~ItemFlag.ItemIsEditable);
    nameCell.setToolTip(name);

    const screenshotsCell = new QTableWidgetItem('0');

    const mediaInfoCheckBox = new QCheckBox();
    mediaInfoCheckBox.setStyleSheet('margin-left: 13px');

    this.widget.setItem(row, 0, nameCell);
    this.widget.setItem(row, 1, screenshotsCell);
    this.widget.setCellWidget(row, 2, mediaInfoCheckBox);

    this.mediaInfoCheckBoxes.set(row, mediaInfoCheckBox);

    mediaInfoCheckBox.addEventListener('toggled', checked => {
      if (!checked) return;
      this.emitMediaInfoChanged(name);
      this.mediaInfoCheckBoxes.forEach((mediaInfoCheckBox, mediaInfoCheckBoxRow) => {
        if (mediaInfoCheckBoxRow === row) return;
        mediaInfoCheckBox.setChecked(false);
      });
    });

    this.resizeColumns();

  }

  clear(): void {
    this.widget.setRowCount(0);
    this.mediaInfoCheckBoxes.clear();
  }

  emitMediaInfoChanged(name: string): void {
    for (const callback of this.mediaInfoChangedCallbacks) {
      callback(name);
    }
  }

  emitScreenshotsChanged(name: string, screenshots: number): void {
    for (const callback of this.screenshotsChangedCallbacks) {
      callback(name, screenshots);
    }
  }

  getRowByName(name: string): number {
    
    // I was thinking about using this.widget.findItems but I'm not sure there's
    // an easy way to make sure it's the name column and I guess it's possible
    // for a file to be named the same as a number in the screenshots column

    for (let i = 0; i < this.widget.rowCount(); i++) {
      if (this.widget.item(i, 0).text() === name) {
        return i;
      }
    }
    return -1;
  }

  onMediaInfoChanged(callback: (name: string) => void): void {
    this.mediaInfoChangedCallbacks.push(callback);
  }

  onScreenshotsChanged(callback: (name: string, screenshots: number) => void): void {
    this.screenshotsChangedCallbacks.push(callback);
  }

  processScreenshotChange(row: number): void {

    const nameCell = this.widget.item(row, 0);
    const name = nameCell.text();

    const screenshotsCell = this.widget.item(row, 1);
    let screenshots = Number.parseInt(screenshotsCell.text(), 10);

    if (Number.isNaN(screenshots)) {
      screenshotsCell.setText('0');
      screenshots = 0;
    }

    if (screenshots > MAX_SCREENSHOTS) screenshots = MAX_SCREENSHOTS;

    this.emitScreenshotsChanged(name, screenshots);

  }

  resizeColumns(): void {
    this.widget.setColumnWidth(0, this.widget.viewport().width() - 80);
    this.widget.setColumnWidth(1, 40);
    this.widget.setColumnWidth(2, 40);
  }

  setMediaInfo(name: string) {
    const row = this.getRowByName(name);
    const checkbox = this.mediaInfoCheckBoxes.get(row);
    if (checkbox) {
      checkbox.setChecked(true);
    } else {
      throw Error("Tried to set a MediaInfo checkbox for row that doesn't exist");
    }
  }

  setScreenshots(name: string, screenshots: number): void {
    const row = this.getRowByName(name);
    this.widget.item(row, 1).setText(String(screenshots));
  }

}