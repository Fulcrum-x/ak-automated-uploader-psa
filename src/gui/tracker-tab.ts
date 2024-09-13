import { ItemDataRole, QAbstractItemViewSelectionBehavior, QGridLayout, QLabel, QListView, QListWidget, QListWidgetItem, QPushButton, QSizePolicyPolicy, QVariant, QWidget } from "@nodegui/nodegui";
import { open } from "../util";
import TrackerForm from "./trackers/tracker-form";

export default class TrackerTab {

  layout: QGridLayout;
  widget: QWidget;
  searchResultsLabel: QLabel;
  searchResults: QListWidget;
  spacer: QWidget;
  statusLabel: QLabel;
  uploadPushButton: QPushButton;
  openTorrentPushButton: QPushButton;
  openTorrentCallbacks: Array<() => void>;
  previewCallbacks: Array<() => void>;
  previewPushButton: QPushButton;
  uploadCallbacks: Array<() => void>;
  form?: TrackerForm;

  constructor() {

    this.layout = new QGridLayout();
    
    this.widget = new QWidget();
    this.widget.setLayout(this.layout);

    this.searchResultsLabel = new QLabel();
    this.searchResultsLabel.setText('Found possible duplicates:');
    this.searchResultsLabel.setVisible(false);

    this.searchResults = new QListWidget();
    this.searchResults.setFixedHeight(50);
    this.searchResults.setVisible(false);
    this.searchResults.addEventListener('doubleClicked', index => {
      open(index.data(ItemDataRole.UserRole).toString());
    });

    this.spacer = new QWidget();
    this.spacer.setSizePolicy(QSizePolicyPolicy.Expanding, QSizePolicyPolicy.Fixed);

    this.statusLabel = new QLabel();

    this.uploadPushButton = new QPushButton();
    this.uploadPushButton.setText('Upload');
    this.uploadPushButton.addEventListener('pressed', () => this.emitUpload());

    this.openTorrentPushButton = new QPushButton();
    this.openTorrentPushButton.setText('Open Torrent');
    this.openTorrentPushButton.addEventListener('pressed', () => this.emitOpenTorrent());

    this.previewPushButton = new QPushButton();
    this.previewPushButton.setText('Preview Description');
    this.previewPushButton.addEventListener('pressed', () => this.emitPreview());

    this.layout.addWidget(this.searchResultsLabel, 0, 0, undefined, 5);
    this.layout.addWidget(this.searchResults, 1, 0, undefined, 5);
    this.layout.addWidget(this.spacer, 3, 0);
    this.layout.addWidget(this.statusLabel, 3, 1);
    this.layout.addWidget(this.previewPushButton, 3, 2);
    this.layout.addWidget(this.uploadPushButton, 3, 3);
    //this.layout.addWidget(this.openTorrentPushButton, 3, 4);

    this.uploadCallbacks = [];
    this.openTorrentCallbacks = [];
    this.previewCallbacks = [];

  }

  addSearchResult(name: string, url: string): void {
    const item = new QListWidgetItem(name);
    item.setData(ItemDataRole.UserRole, new QVariant(url));
    this.searchResults.addItem(item);
  }

  addSearchResults(results: Array<{ name: string; url: string }>): void {

    if (results.length > 0) {
      this.searchResultsLabel.setVisible(true);
      this.searchResults.setVisible(true);
    }

    for (const result of results) {
      this.addSearchResult(result.name, result.url);
    }

  }

  clearSearchResults(): void {
    this.searchResults.clear();
    this.searchResultsLabel.setVisible(false);
    this.searchResults.setVisible(false);
  }

  emitPreview(): void {
    this.previewCallbacks.forEach(callback => callback());
  }

  emitOpenTorrent(): void {
    this.openTorrentCallbacks.forEach(callback => callback());
  }

  emitUpload(): void {
    this.uploadCallbacks.forEach(callback => callback());
  }

  onOpenTorrent(callback: () => void): void {
    this.openTorrentCallbacks.push(callback);
  }

  onPreview(callback: () => void): void {
    this.previewCallbacks.push(callback);
  }
  
  onUpload(callback: () => void): void {
    this.uploadCallbacks.push(callback);
  }

  setAfterUploadAction(action: string): void {
    switch (action) {
      case 'Do Nothing': case '':
        this.uploadPushButton.setText('Upload');
        break;
      default:
        this.uploadPushButton.setText(`Upload and ${action}`);
    }
  }

  setForm(form: TrackerForm) {
    this.form = form;
    this.layout.addWidget(form.widget, 2, 0, undefined, 5);
  }

  setSearchStatus(status: 'searching' | 'found' | 'not-found'): void {
    this.searchResultsLabel.setVisible(true);
    const text = {
      'searching': 'Searching for duplicates...',
      'found': 'Possible duplicates found:',
      'not-found': 'No duplicates found',
    }
    this.searchResultsLabel.setText(text[status]);
  }

  setStatus(status: string): void {
    this.statusLabel.setText(status);
  }

}