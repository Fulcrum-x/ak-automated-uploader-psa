import { ImageHostSettings } from "src/settings";
import ImageHost, { Image } from "./image-host";
import sharp from "sharp";
import { errorString } from "src/util";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export default class Catbox extends ImageHost {

  constructor(config: ImageHostSettings) {
    super(config);
    this.maxSize = 209715200;
  }

  async upload(images: string[], format: string, width: number = 350): Promise<string> {

    const promises: Promise<Image>[] = [];

    for (const filename of images) {
      const thumb = await this.makeThumb(filename, width);
      this.images.push({
        link: await this.post(filename),
        image: await this.post(thumb),
      });
    }

    return this.format(format, width);

  }

  async makeThumb(fullsizePath: string, width: number): Promise<Buffer> {
    const thumb = await sharp(fullsizePath).resize(width).jpeg().toBuffer();
    return thumb;
  }

  async post(image: string | Buffer): Promise<string> {

    try {

      const formData = new FormData();
      formData.append('reqtype', 'fileupload');

      const imageBuffer: Buffer = image instanceof Buffer ? image : await readFile(image);
      const imageBlob = new Blob([imageBuffer], { type: image instanceof Buffer ? 'image/jpeg' : 'image/png' });
      const imageFilename = typeof image === 'string' ? basename(image) : 'thumb.jpg';

      formData.append('fileToUpload', imageBlob, imageFilename);

      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      const url = await response.text();

      return url;

    } catch (error) {
      throw Error(errorString('Problem uploading file to Catbox', error));
    }

  }

}