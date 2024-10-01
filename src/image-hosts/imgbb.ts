import { readFile } from "fs/promises";
import { basename } from "path";
import { ImageHostSettings } from "../settings";
import ImageHost, { Image } from "./image-host";
import { Field } from "../gui/settings-window";

const UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export const settings: Field[] = [{
  id: 'apiKey',
  label: 'API key',
  description: 'Find your API key at the <a href="https://api.imgbb.com/">API page</a> after creating an account.',
  default: '',
}];

export default class ImgBB extends ImageHost {

  apiKey: string;

  constructor(config: ImageHostSettings) {

    super(config);

    if (!config.apiKey) {
      throw Error(`API key required for ImgBB`);
    }
    this.apiKey = config.apiKey;
    this.maxSize = 32000000;

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
    formData.append('image', base64Image);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (false === data instanceof Object) {
      throw Error('Unexpected data from ImgBB');
    }

    console.log(data)

    if (false === 'status' in data) {
      throw Error(`ImgBB did not return a status code`);
    }

    if (data.status !== 200) {
      console.log(data);
      throw Error(`Uploading ${basename(image)} to ImgBB failed with error code ${data.status_code}`);
    }

    if (
      'data' in data && data.data instanceof Object &&
      'url_viewer' in data.data && typeof data.data.url_viewer === 'string' &&
      'medium' in data.data && data.data.medium instanceof Object &&
      'thumb' in data.data && data.data.thumb instanceof Object &&
      'url' in data.data.medium && typeof data.data.medium.url === 'string' &&
      'url' in data.data.thumb && typeof data.data.thumb.url === 'string'
    ) {
      return {
        link: data.data.url_viewer,
        image: thumb
          ? data.data.thumb.url  
          : data.data.medium.url,
      }
    }

    console.log(data);

    throw Error(`Something wrong with the data returned from ImgBB for ${basename(image)}`);

  }

}