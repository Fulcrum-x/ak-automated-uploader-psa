import { ImageHostSettings } from "../settings";

export type Image = { 
  link: string;
  image: string
};

export default class ImageHost {

  images: Image[];
  formatted: string;
  maxSize: number;

  constructor(config: ImageHostSettings) {

    this.images = [];
    this.formatted = '';
    this.maxSize = 0;

  }

  format(format: string, width?: number): string {

    this.formatted = '';

    for (const image of this.images) {

      let formatted = format;

      for (const replacement in image) {
        formatted = formatted.replace(new RegExp(`\\{${replacement}\\}`, 'ig'), image[replacement]);
      }

      if (width) {
        formatted = formatted.replace(/\{width\}/ig, String(width));
      }

      this.formatted += formatted;

    }

    this.formatted = this.formatted.trim();

    return this.formatted;

  }

  async upload(images: string[], format: string, width?: number): Promise<string> {
    return '';
  }

}