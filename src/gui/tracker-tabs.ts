import { QIcon, QTabWidget } from "@nodegui/nodegui";
import TrackerTab from "./tracker-tab";
import { trackerForms } from "./trackers";
import TrackerForm from "./trackers/tracker-form";

export default class TrackerTabs {

  widget: QTabWidget;

  constructor() {

    this.widget = new QTabWidget();

  }

  add(name: string, afterUpload: string): TrackerTab {

    const tab = new TrackerTab();
    this.widget.addTab(tab.widget, new QIcon(), name);

    if (!trackerForms[name]) {
      throw Error(`Couldn't find tracker form for ${name}`);
    }

    const form = new trackerForms[name];

    tab.setForm(form);
    tab.setAfterUploadAction(afterUpload);

    return tab;

  }

}