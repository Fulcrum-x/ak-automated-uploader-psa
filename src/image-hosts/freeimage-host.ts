import { readFile } from "fs/promises";
import { basename } from "path";
import { ImageHostSettings } from "../settings";
import ImageHost, { Image } from "./image-host";
import { Field } from "../gui/settings-window";

const UPLOAD_URL = 'https://freeimage.host/api/1/upload';

export const settings: Field[] = [{
  id: 'apiKey',
  label: 'API key',
  description: 'The Freeimage.host API key is freely accessible on their <a href="https://freeimage.host/page/api">API page</a>.',
  default: '6d207e02198a847aa98d0a2a901485a5',
}];

export default class FreeimageHost extends ImageHost {

  apiKey: string;

  constructor(config: ImageHostSettings) {

    super(config);

    if (!config.apiKey) {
      throw Error(`API key required for Freeimage.host`);
    }
    this.apiKey = config.apiKey;
    this.maxSize = 67108864;

  }

  async upload(images: string[], format: string, width?: number): Promise<string> {

    const promises: Promise<Image>[] = [];

    for (const image of images) {
      promises.push(this.post(image, !width));
    }

    for (const upload of promises) {
      this.images.push(await upload);
    }

    return this.format(format, width);

  }

  async post(image: string, thumb: boolean): Promise<Image> {

    const imageData = await readFile(image);
    const base64Image = imageData.toString('base64');

    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('action', 'upload');
    formData.append('source', base64Image);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (false === data instanceof Object) {
      throw Error('Unexpected data from Freeimage.host');
    }

    if (false === 'status_code' in data) {
      throw Error(`Freeimage.host did not return a status code`);
    }

    if (data.status_code !== 200) {
      throw Error(`Uploading ${basename(image)} to Freeimage.host failed with error code ${data.status_code}`);
    }

    if (
      'image' in data && data.image instanceof Object && 
      'url_viewer' in data.image && typeof data.image.url_viewer === 'string' &&
      'medium' in data.image && data.image.medium instanceof Object &&
      'thumb' in data.image && data.image.thumb instanceof Object &&
      'url' in data.image.medium && typeof data.image.medium.url === 'string' &&
      'url' in data.image.thumb && typeof data.image.thumb.url === 'string'
    ) {
      return {
        link: data.image.url_viewer,
        image: thumb
          ? data.image.thumb.url  
          : data.image.medium.url,
      }
    }

    console.log(data);

    throw Error(`Something wrong with the data returned from Freeimage.host for ${basename(image)}`);

  }

}