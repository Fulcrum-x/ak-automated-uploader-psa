import { Field } from "../gui/settings-window";
import FreeimageHost, { settings as FreeimageHostSettings } from "./freeimage-host";
import ImageHost from "./image-host";

export const imageHosts: Record<string, { class: typeof ImageHost, settings: Field[] }> = {
  'Freeimage.host': {
    class: FreeimageHost,
    settings: FreeimageHostSettings,
  },
};