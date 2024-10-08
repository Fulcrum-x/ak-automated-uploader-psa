import { Field } from "../gui/settings-window";
import Catbox from "./catbox";
import FreeimageHost, { settings as FreeimageHostSettings } from "./freeimage-host";
import ImageHost from "./image-host";
import ImgBB, { settings as ImgBBSettings } from "./imgbb";

export const imageHosts: Record<string, { class: typeof ImageHost, settings: Field[] }> = {
  'Freeimage.host': {
    class: FreeimageHost,
    settings: FreeimageHostSettings,
  },
  'ImgBB': {
    class: ImgBB,
    settings: ImgBBSettings,
  },
  'Catbox': {
    class: Catbox,
    settings: [],
  }
};