import { basename } from "node:path";

export default class Upload {

  path: string;
  name: string;

  constructor(path: string) {

    this.path = path;
    this.name = basename(path);

  }

}