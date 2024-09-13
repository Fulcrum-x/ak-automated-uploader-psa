import AitherForm from "./aither-form";
import TrackerForm from "./tracker-form";

export const trackerForms: Record<string, typeof TrackerForm> = {
  'Aither': AitherForm,
};