import { Direction, FileMode, QAction, QBoxLayout, QFileDialog, QLayout, QMainWindow, QMenuBar, QPushButton, QSizePolicyPolicy, QTabWidget, QWidget, WidgetEventTypes } from "@nodegui/nodegui";
import UploadTab from "./upload-tab";

export default class MainWindow {
  
  layout: QLayout;
  tabsByIndex: Map<number, UploadTab>;
  tabWidget: QTabWidget;
  widget: QWidget;
  window: QMainWindow;
  openFileButton: QPushButton;
  openFolderButton: QPushButton;
  settingsButton: QPushButton;

  constructor() {

    const window = new QMainWindow();
    window.setWindowTitle('AK Automated Uploader');

    this.tabsByIndex = new Map();

    this.widget = new QWidget();
    this.layout = new QBoxLayout(Direction.TopToBottom);
    this.widget.setLayout(this.layout);
  
    const toolbarLayout = new QBoxLayout(Direction.LeftToRight);
    toolbarLayout.setContentsMargins(0, 0, 0, 0);

    this.openFileButton = new QPushButton();
    this.openFileButton.setText('Open file...');
    toolbarLayout.addWidget(this.openFileButton);

    this.openFolderButton = new QPushButton();
    this.openFolderButton.setText('Open folder...');
    toolbarLayout.addWidget(this.openFolderButton);

    this.settingsButton = new QPushButton();
    this.settingsButton.setText('Settings');
    toolbarLayout.addWidget(this.settingsButton);

    const spacer = new QWidget();
    spacer.setSizePolicy(QSizePolicyPolicy.Expanding, QSizePolicyPolicy.Minimum);
    toolbarLayout.addWidget(spacer);

    const toolbarWidget = new QWidget();
    toolbarWidget.setStyleSheet('QPushButton { padding: 4px 10px }')
    toolbarWidget.setLayout(toolbarLayout);

    this.layout.addWidget(toolbarWidget);

    window.setCentralWidget(this.widget);

    this.tabWidget = new QTabWidget();
    this.tabWidget.setTabsClosable(true);
    this.layout.addWidget(this.tabWidget);

    this.tabWidget.addEventListener('tabCloseRequested', index => {
      this.tabsByIndex.get(index)?.close();
      this.tabWidget.removeTab(index);
    });

    (global as any).win = window;
    this.window = window;

  }

  addUpload(name: string): UploadTab {

    const tab = new UploadTab(name);
    const index = this.tabWidget.addTab(tab.widget, tab.icon, tab.name);
    this.tabsByIndex.set(index, tab);
    this.tabWidget.setCurrentIndex(index);
    return tab;

  }

  onClose(callback: () => void): void {
    this.window.addEventListener(WidgetEventTypes.Close, callback);
  }

  onOpenFile(callback: (selectedFile: string) => void): void {
    this.openFileButton.addEventListener('pressed', async () => {
      const fileDialog = new QFileDialog();
      fileDialog.setFileMode(FileMode.ExistingFile);
      if (!fileDialog.exec()) return;
      callback(fileDialog.selectedFiles()[0]);
    })
  }

  onOpenFolder(callback: (selectedFolder: string) => void): void {
    this.openFolderButton.addEventListener('pressed', async() => {
      const fileDialog = new QFileDialog();
      fileDialog.setFileMode(FileMode.Directory);
      if (!fileDialog.exec()) return;
      callback(fileDialog.selectedFiles()[0]);
    });
  }

  onShowSettings(callback: () => void): void {
    this.settingsButton.addEventListener('pressed', () => callback());
  }

}