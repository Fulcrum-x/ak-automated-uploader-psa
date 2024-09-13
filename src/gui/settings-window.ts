import { AlignmentFlag, Direction, DragDropMode, EchoMode, FileMode, MatchFlag, QBoxLayout, QComboBox, QDialog, QFileDialog, QGridLayout, QIcon, QLabel, QLayout, QLineEdit, QListWidget, QMainWindow, QPlainTextEdit, QPushButton, QSizePolicyPolicy, QTabWidget, QVariant, QWidget, TextInteractionFlag } from "@nodegui/nodegui";
import { dirname, normalize } from "path";
import { ImageHostSettings, SettingsList, TorrentClientSettings, TrackerSettings } from "../settings";

interface WidgetList {
  [propName: string]: QWidget,
}

export interface Field {
  id: string;
  label: string;
  type?: 'path' | 'password' | 'multiline' | 'spacer' | 'imageHosts' | 'afterUpload';
  nameFilter?: string;
  description?: string;
  default?: string;
}

interface SpacerField {
  type: 'spacer';
  description?: string;
}

interface KeyedFieldList {
  name: string;
  fields: Field[];
}

interface FieldList {
  general: Field[],
  trackers: KeyedFieldList[],
  imageHosts: KeyedFieldList[],
  torrentClients: KeyedFieldList[],
}

const fields: FieldList = {

  general: [
    {
      id: 'ffmpegPath',
      label: 'ffmpeg path',
      type: 'path',
      nameFilter: 'ffmpeg (ffmpeg ffmpeg.exe)',
    },
    {
      id: 'ffprobePath',
      label: 'ffprobe path',
      type: 'path',
      nameFilter: 'ffprobe (ffprobe, ffprobe.exe)',
    },
    {
      id: 'tmdbApiKey',
      label: 'TMDB API key',
      type: 'password',
      description: 'You can generate a TMDB API key <a href="https://www.themoviedb.org/settings/api">here</a>. Use the longer one labelled API Read Access Token.',
    },
  ],

  trackers: [],
  imageHosts: [],
  torrentClients: [],

};

class SubTabs {

  disabled: string[];
  enabled: string[];
  fields: KeyedFieldList[];
  id: string;
  name: string;
  parent: SettingsWindow;
  tabs: WidgetList;
  tabWidget: QTabWidget;
  widget: QWidget;

  /**
   * Creates some dynamic addable and removable tabs to contain controls for
   * specific trackers, image hosts, and torrent clients. Specific field
   * controls are handled by SettingsWindow.
   * 
   * @param parent The SettingsWindow that added these SubTabs
   * @param fields All of the fields that could be potentially displayed within these tabs
   * @param name The name of the tab as it appears on the control (like "Image Hosts")
   * @param id An ID to match to the Settings object (like "imageHosts")
   * @param note A note to display above the tab box
   */

  constructor(parent: SettingsWindow, fields: KeyedFieldList[], name: string, id: string, note?: string) {

    this.parent = parent;
    this.fields = fields;
    this.name = name;
    this.id = id;

    this.tabWidget = new QTabWidget();
    this.tabs = {};

    this.enabled = [];
    this.disabled = this.fields.map(value => value.name);

    this.widget = this.buildWidget(note);

  }

  /** 
   * Adds a new tab, either from loaded settings, or from the Add... dialog box.
   * Always add trackers first, because adding image hosts and torrent clients
   * modify controls within trackers.
   * 
   * @param name The name of the tab, should be a proper name like Aither or Freeimage.host
   * @param first Set when doing a first load, like from loading settings
   */

  add(name: string, first?: boolean): void {

    if (this.enabled.includes(name)) {
      return;
    }

    this.enabled.push(name);
    this.disabled = this.disabled.filter(value => value !== name);

    const tab = this.fields.find(fieldData => fieldData.name === name);
    if (!tab) {
      console.error("Tried to add a tab that doesn't exist");
      return;
    }
    this.tabs[name] = this.parent.addFields(tab.fields, `${this.id}/${tab.name}`);

    // If we're adding an image host tab, add that image host to each imageHosts control

    if (!first && this.id === 'imageHosts') {
      for (const field of this.parent.getImageHostOrderFields()) {
        field.addItems([name]);
      }
    }

    // If we're adding a torrent client tab, add that client as an afterUpload option

    if (!first && this.id === 'torrentClients') {
      for (const field of this.parent.getAfterUploadFields()) {
        field.addItem(undefined, `Send to ${name}`, new QVariant(name));
      }
    }

    this.tabWidget.addTab(this.tabs[name], new QIcon, name);

  }

  addDefault(name: string, fields: Field[]): void {

    const fieldList: KeyedFieldList = {
      name: name,
      fields: fields,
    };

    this.fields.push(fieldList);

    this.disabled.push(name);

  }

  /**
   * Builds the dialog box that appears when you click the Add button on each
   * individual tab
   */

  buildAddDialog(): void {

    const dialog = new QDialog(this.parent.window);

    const layout = new QBoxLayout(Direction.TopToBottom);

    const comboBox = new QComboBox();
    this.disabled.sort();
    comboBox.addItems(this.disabled);
    layout.addWidget(comboBox);

    const buttonLayout = new QBoxLayout(Direction.LeftToRight);
    buttonLayout.setContentsMargins(0, 0, 0, 0);

    const buttonWidget = new QWidget();
    buttonWidget.setLayout(buttonLayout);

    const spacer = new QWidget();
    spacer.setSizePolicy(QSizePolicyPolicy.Expanding, QSizePolicyPolicy.Minimum);
    buttonLayout.addWidget(spacer);

    const addButton = new QPushButton();
    addButton.setText('Add');
    buttonLayout.addWidget(addButton);

    addButton.addEventListener('pressed', () => {
      const newItem = comboBox.currentText();
      if (newItem) {
        this.add(newItem);
      }
      dialog.close();
    });

    const cancelButton = new QPushButton();
    cancelButton.setText('Cancel');
    buttonLayout.addWidget(cancelButton);

    cancelButton.addEventListener('pressed', () => dialog.close());

    layout.addWidget(buttonWidget);

    dialog.setModal(true);
    dialog.setLayout(layout);
    dialog.setWindowTitle(`Add ${this.name}`);
    dialog.exec();

  }

  /**
   * Builds the widget that holds the tab box that holds individual controls,
   * including the Add button
   * 
   * @param note A note that appears at the top of the tab box
   * @returns The created widget, to be inserted elsewhere
   */

  buildWidget(note?: string): QWidget {

    const layout = new QBoxLayout(Direction.TopToBottom);

    if (note) {
      const noteLabel = new QLabel();
      noteLabel.setText(note);
      layout.addWidget(noteLabel, 0, AlignmentFlag.AlignLeft);
    }

    this.tabWidget.setTabsClosable(true);
    this.tabWidget.addEventListener(
      'tabCloseRequested', 
      index => this.remove(index)
    );
    layout.addWidget(this.tabWidget, 0, AlignmentFlag.AlignLeft);

    const addButton = new QPushButton();
    addButton.setText('Add...');
    addButton.addEventListener('pressed', () => this.buildAddDialog());
    layout.addWidget(addButton, 0, AlignmentFlag.AlignLeft);

    const widget = new QWidget();
    widget.setLayout(layout);
  
    return widget;

  }

  /**
   * Removes a tab
   * 
   * @param index The index of tab, as provided by the tabCloseRequested event
   */

  remove(index: number): void {
    
    let name: string | undefined;

    for (const testName in this.tabs) {
      const tabIndex = this.tabWidget.indexOf(this.tabs[testName]);
      if (this.tabWidget.indexOf(this.tabs[testName]) === index) {
        name = testName;
        break;
      }
    }

    if (!name) {
      console.error("Tried to remove a tab that didn't exist");
      return;
    }

    this.disabled.push(name);
    this.enabled = this.enabled.filter(value => value !== name);

    // If we're removing an image host tab, also remove that image host from
    // every tracker's imageHosts control

    if (this.id === 'imageHosts') {
      for (const field of this.parent.getImageHostOrderFields()) {
        const [item] = field.findItems(name, MatchFlag.MatchExactly);
        const row = field.row(item);
        field.takeItem(row);
      }
    }

    // The same, but for torrent clients and the afterUpload control

    if (this.id === 'torrentClients') {
      for (const field of this.parent.getAfterUploadFields()) {
        for (let i = 0; i < field.count(); i++) {
          console.log(` ${field.itemData(i).toString()} == ${name} ?`);
          if (field.itemData(i).toString() === name) {
            field.removeItem(i);
          }
        }
      }
    }

    this.tabWidget.removeTab(index);

  }

}

export default class SettingsWindow {

  imageHosts: SubTabs;
  layoutRowCount: Map<QLayout, number>;
  saveCallback?: (SettingsList) => void;
  torrentClients: SubTabs;
  trackers: SubTabs;
  widgets: WidgetList;
  window: QDialog;

  constructor(parentWindow: QMainWindow) {

    this.layoutRowCount = new Map();
    this.widgets = {};

    this.window = new QDialog(parentWindow);

    const layout = new QGridLayout();
    
    const tabWidget = new QTabWidget();

    const generalWidget = this.addFields(fields.general, 'general');
    tabWidget.addTab(generalWidget, new QIcon(), 'General');

    this.trackers = new SubTabs(this, fields.trackers, 'Tracker', 'trackers', "Adding or removing trackers will not affect any currently open files.");
    tabWidget.addTab(this.trackers.widget, new QIcon(), 'Trackers');

    this.imageHosts = new SubTabs(this, fields.imageHosts, 'Image Host', 'imageHosts');
    tabWidget.addTab(this.imageHosts.widget, new QIcon(), 'Image Hosts');

    this.torrentClients = new SubTabs(this, fields.torrentClients, 'Torrent Client', 'torrentClients');
    tabWidget.addTab(this.torrentClients.widget, new QIcon(), 'Torrent Clients');

    layout.addWidget(tabWidget, 0, 0, 1, 3);

    const spacer = new QWidget();
    spacer.setSizePolicy(QSizePolicyPolicy.Expanding, QSizePolicyPolicy.Minimum);
    layout.addWidget(spacer, 1, 0);

    const saveButton = new QPushButton();
    saveButton.setText('Save');
    saveButton.addEventListener('pressed', () => {
      this.save();
      this.window.close();
    });
    layout.addWidget(saveButton, 1, 1);

    const cancelButton = new QPushButton();
    cancelButton.setText('Cancel');
    cancelButton.addEventListener('pressed', () => this.window.close());
    layout.addWidget(cancelButton, 1, 2);

    this.window.setWindowTitle('Settings');
    this.window.setLayout(layout);
    this.window.setModal(true);

  }

  addAfterUploadField(layout: QLayout, id: string, parent: string, label: string): void {

    const row = this.getRow(layout);

    const labelWidget = new QLabel();
    labelWidget.setText(`${label}:`);
    layout.addWidget(labelWidget, row, 0);

    const widget = new QComboBox();
    
    widget.addItem(undefined, 'Do Nothing', new QVariant('doNothing'));
    widget.addItem(undefined, 'Open Torrent', new QVariant('open'));

    for (const tab in this.torrentClients.tabs) {
      widget.addItem(undefined, `Send to ${tab}`, new QVariant(tab));
    }

    layout.addWidget(widget, row, 1, undefined, 2);

    this.widgets[`${parent}/${id}`] = widget;

  }

  addDefaultImageHost(name: string, fields: Field[]): void {
    this.imageHosts.addDefault(name, fields);
  }

  addDefaultTorrentClient(name: string, fields: Field[]): void {
    this.torrentClients.addDefault(name, fields);
  }

  addDefaultTracker(name: string, fields: Field[]): void {
    this.trackers.addDefault(name, fields);
  }

  addDescription(layout: QLayout, description: string): void {

    const labelWidget = new QLabel();
    labelWidget.setTextInteractionFlags(TextInteractionFlag.TextBrowserInteraction);
    labelWidget.setOpenExternalLinks(true);
    labelWidget.setText(description);
    layout.addWidget(labelWidget, this.getRow(layout), 1, undefined, 2);

  }

  addField(layout: QLayout, field: Field | SpacerField, parent: string): void {

    switch (field.type) {

      case 'password':
        this.addLineEdit(layout, field.id, parent, field.label, true);
        break;

      case 'path':
        this.addPathEdit(layout, field.id, parent, field.label, field.nameFilter);
        break;
      
      case 'multiline':
        this.addPlainTextEdit(layout, field.id, parent, field.label);
        break;

      case 'spacer':
        this.addSpacer(layout);
        break;
      
      case 'imageHosts':
        this.addImageHostsField(layout, field.id, parent, field.label);
        break;

      case 'afterUpload':
        this.addAfterUploadField(layout, field.id, parent, field.label);
        break;

      default:
        this.addLineEdit(layout, field.id, parent, field.label);

    }

    if (field.description) {
      this.addDescription(layout, field.description);
    }

  }

  addFields(fields: Field[], parent: string): QWidget {

    const layout = new QGridLayout();

    const widget = new QWidget();
    widget.setLayout(layout);

    if (fields.length === 0) {
      this.addDescription(layout, 'Nothing to configure.');
    }

    for (const field of fields) {
      this.addField(layout, field, parent);
    }

    if (parent.startsWith('trackers/')) {
      this.addField(layout, { type: 'multiline', id: 'defaultDescription', label: 'Default description' }, parent);
      this.addField(layout, { type: 'imageHosts', id: 'imageHosts', label: 'Image host order' }, parent);
      this.addField(layout, { type: 'afterUpload', id: 'afterUpload', label: 'After upload' }, parent);
    }

    this.addField(layout, { type: 'spacer' }, parent);

    return widget;

  }

  addImageHostsField(layout: QLayout, id: string, parent: string, label: string): void {

    const row = this.getRow(layout);

    const labelWidget = new QLabel();
    labelWidget.setText(`${label}:`);
    layout.addWidget(labelWidget, row, 0);

    const widget = new QListWidget();
    widget.setDragEnabled(true);
    widget.setDragDropMode(DragDropMode.InternalMove);
    widget.setMaximumHeight(80);
    layout.addWidget(widget, row, 1, undefined, 2);

    this.widgets[`${parent}/${id}`] = widget;

  }

  addLineEdit(layout: QLayout, id: string, parent: string, label: string, password?: boolean): void {

    const row = this.getRow(layout);

    const labelWidget = new QLabel();
    labelWidget.setText(`${label}:`);
    layout.addWidget(labelWidget, row, 0);

    const widget = new QLineEdit();
    if (password) {
      widget.setEchoMode(EchoMode.PasswordEchoOnEdit);
    }
    layout.addWidget(widget, row, 1, undefined, 2);
  
    this.widgets[`${parent}/${id}`] = widget;

  }

  addPathEdit(layout: QLayout, id: string, parent: string, label: string, nameFilter?: string): void {

    const row = this.getRow(layout);

    const labelWidget = new QLabel();
    labelWidget.setText(label + ':');
    layout.addWidget(labelWidget, row, 0);

    const widget = new QLineEdit();
    layout.addWidget(widget, row, 1);

    const browseButtonWidget = new QPushButton();
    browseButtonWidget.setText('Browse...');
    layout.addWidget(browseButtonWidget, row, 2);

    const test = new QLineEdit();
    test.text();

    browseButtonWidget.addEventListener('pressed', () => {

      const dir = dirname(normalize(widget.text()));

      const fileDialog = new QFileDialog(this.window, label, dir, nameFilter);
      fileDialog.setFileMode(FileMode.ExistingFile);
      fileDialog.exec();

      if (fileDialog.selectedFiles() && fileDialog.selectedFiles()[0]) {
        widget.setText(normalize(fileDialog.selectedFiles()[0]));
      }

    });

    this.widgets[`${parent}/${id}`] = widget;

  }

  addPlainTextEdit(layout: QLayout, id: string, parent: string, label: string): void {

    const row = this.getRow(layout);

    const labelWidget = new QLabel();
    labelWidget.setText(label + ':');
    layout.addWidget(labelWidget, row, 0);

    const widget = new QPlainTextEdit();
    layout.addWidget(widget, row, 1, undefined, 2);

    this.widgets[`${parent}/${id}`] = widget;

  }

  addSpacer(layout: QLayout): void {

    const row = this.getRow(layout);
    const widget = new QWidget();
    widget.setSizePolicy(QSizePolicyPolicy.Minimum, QSizePolicyPolicy.Expanding);
    layout.addWidget(widget, row, 0);

  }

  getAfterUploadFields(): QComboBox[] {

    const fields: QComboBox[] = [];
    for (const id in this.widgets) {
      if (id.endsWith('/afterUpload') && this.widgets[id] instanceof QComboBox) {
        fields.push(this.widgets[id]);
      }
    }
    return fields;

  }

  getImageHostOrderFields(): QListWidget[] {

    const fields: QListWidget[] = [];
    for (const id in this.widgets) {
      if (id.endsWith('/imageHosts') && this.widgets[id] instanceof QListWidget) {
        fields.push(this.widgets[id]);
      }
    }
    return fields;

  }

  /**
   * Generates a new row number each time it's called, per a specific layout.
   * 
   * @param layout Layout to generate a new row number for
   * @returns A new row number
   */

  getRow(layout: QLayout): number {

    let row = this.layoutRowCount.get(layout);
    if (!row) row = 0;
    this.layoutRowCount.set(layout, row + 1);
    return row;

  }

  emitSaved(settings: SettingsList) {
    if (this.saveCallback) {
      this.saveCallback(settings);
    }
  }

  onSave(callback: (settings: SettingsList) => void): void {
    this.saveCallback = callback;
  }

  // Convert all the data from the widgets into a SettingsList
  // and resolve the onSave callbacks
  save(): void {

    const output: SettingsList = {

      ffmpegPath: '',
      ffprobePath: '',
      tmdbApiKey: '',

      trackers: this.saveTrackers(),
      imageHosts: this.saveImageHosts(),
      torrentClients: this.saveTorrentClients(),

    };

    for (const key of ['ffmpegPath', 'ffprobePath', 'tmdbApiKey']) {
      const widget = this.widgets[`general/${key}`];
      if (widget instanceof QLineEdit) {
        output[key] = widget.text();
      }
    }

    this.emitSaved(output);

  }

  saveImageHosts(): ImageHostSettings[] {

    const outputImageHosts: ImageHostSettings[] = [];

    const imageHosts = this.imageHosts.enabled;

    for (const imageHost of imageHosts) {

      const outputImageHost: ImageHostSettings = {
        name: imageHost,
      };

      const widgetIds = Object.keys(this.widgets).filter(value => value.startsWith(`imageHosts/${imageHost}/`));
      for (const widgetId of widgetIds) {

        const outputId = widgetId.split('/')[2];
        const widget = this.widgets[widgetId];

        if (widget instanceof QLineEdit) {
          outputImageHost[outputId] = widget.text();
        } else {
          console.error(`Couldn't save setting for ${widgetId}, unknown type`);
        }

      }

      outputImageHosts.push(outputImageHost);

    }

    return outputImageHosts;

  }

  saveTorrentClients(): TorrentClientSettings[] {

    const outputTorrentClients: TorrentClientSettings[] = [];

    const torrentClients = this.torrentClients.enabled;

    for (const torrentClient of torrentClients) {

      const outputTorrentClient: TorrentClientSettings = {
        name: torrentClient,
      };

      const widgetIds = Object.keys(this.widgets).filter(value => value.startsWith(`torrentClients/${torrentClient}/`));
      for (const widgetId of widgetIds) {

        const outputId = widgetId.split('/')[2];
        const widget = this.widgets[widgetId];

        if (widget instanceof QLineEdit) {
          outputTorrentClient[outputId] = widget.text();
        } else {
          console.error(`Couldn't save setting for ${widgetId}, unknown type`);
        }

      }

      outputTorrentClients.push(outputTorrentClient);

    }

    return outputTorrentClients;

  }

  saveTrackers(): TrackerSettings[] {

    const outputTrackers: TrackerSettings[] = [];

    const trackers = this.trackers.enabled;

    for (const tracker of trackers) {

      const outputTracker: TrackerSettings = {
        name: tracker,
        announce: '',
        afterUpload: '',
        defaultDescription: '',
        imageHosts: [],
      };

      const widgetIds = Object.keys(this.widgets).filter(value => value.startsWith(`trackers/${tracker}/`));
      for (const widgetId of widgetIds) {

        const outputId = widgetId.split('/')[2];
        const widget = this.widgets[widgetId];
      
        if (widget instanceof QLineEdit) {

          outputTracker[outputId] = widget.text();

        } else if (widget instanceof QPlainTextEdit) {

          outputTracker[outputId] = widget.toPlainText();

        } else if (widget instanceof QListWidget) {

          outputTracker[outputId] = [];
          for (let i = 0; i < widget.count(); i++) {
            outputTracker[outputId].push(widget.item(i).text());
          }

        } else if (widget instanceof QComboBox) {

          outputTracker[outputId] = widget.itemData(widget.currentIndex()).toString();

        } else {
          console.error(`Couldn't save setting for ${widgetId}, unknown type`);
        }

      }

      outputTrackers.push(outputTracker);

    }

    return outputTrackers;
  
  }

  setAll(settings: SettingsList): void {

    // This order is important
    // Torrent clients come first so we can use them to build the afterUpload combo box
    // Trackers come second where we'll build the afterUpload combo box, and then set the correct one as selected
    // Image hosts come last because we'll build the imageHosts list widget directly from the settings rather than
    // from the image hosts (makes it easier to maintain the order) 
    for (const key of ['torrentClients', 'trackers', 'imageHosts']) {

      // An item is a tracker, image host, or torrent client
      for (const item of settings[key]) {

        // Add a tab for the item
        this[key].add(item.name, true);

        // Each field within the item
        for (const fieldKey in item) {

          // Widgets are stored with IDs like trackers/Tracker/announce
          const widget = this.widgets[`${key}/${item.name}/${fieldKey}`];
          if (widget === undefined) {
            continue;
          }

          // 'name' isn't a field, just an identifier that we've used earlier
          // Because we're checking for widgets that exist earlier, this will probably never get reached
          if (fieldKey === 'name') {
            continue;

          } else if (fieldKey === 'imageHosts') {
            if (widget instanceof QListWidget) {
              widget.clear();
              widget.addItems(item[fieldKey]);
            }

          } else if (widget instanceof QLineEdit) {
            widget.setText(item[fieldKey]);

          } else if (widget instanceof QPlainTextEdit) {
            widget.setPlainText(item[fieldKey]);

          // This is only used for the afterUpload box, but could theoretically work for other stuff
          } else if (widget instanceof QComboBox) {
            for (let i = 0; i < widget.count(); i++) {
              if (widget.itemData(i).toString() === item[fieldKey]) {
                widget.setCurrentIndex(i);
                break;
              }
            }

          }

        }

      }

    }

    for (const key of ['ffmpegPath', 'ffprobePath', 'tmdbApiKey']) {

      const widget = this.widgets[`general/${key}`];

      if (widget instanceof QLineEdit) {
        widget.setText(settings[key]);
      }

    }

  }

  show(): void {
    this.window.show();
  }

}