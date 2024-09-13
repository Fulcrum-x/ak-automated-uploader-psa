import { Field } from "../gui/settings-window";
import Aither, { settings as aitherSettings } from "./aither";
import Tracker from "./tracker";

export type TrackerList = Record<string, { class: typeof Tracker, settings: Field[] }>

export const trackers: TrackerList = {
  'Aither': {
    class: Aither,
    settings: aitherSettings,
  }
}