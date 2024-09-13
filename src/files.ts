import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, normalize, relative } from "node:path";

export default class Files {

  data: Array<{
    name: string,
    path: string,
    size: number;
  }>;
  dirPath: string;

  constructor() {

    this.data = [];
    this.dirPath = '';

  }

  async add(path: string): Promise<void> {

    try {

      path = normalize(path);
      await access(path, constants.R_OK);
      const isDirectory = (await stat(path)).isDirectory();

      if (isDirectory) {

        if (!this.dirPath) this.dirPath = path;
        const dir = await readdir(path);
        for (const file of dir) {
          await this.add(join(path, file));
        }

      } else {

        if (!this.dirPath) this.dirPath = dirname(path);
        await this.addFile(path);

      }

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Couldn't read file/folder ${basename(path)}: ${error.message}`);
      } else {
        throw Error(`Couldn't read file/folder ${basename(path)}`);
      }
    }

  }

  async addFile(path: string): Promise<void> {

    try {

      path = normalize(path);
      await access(path, constants.R_OK);

      this.data.push({
        name: this.dirPath ? relative(this.dirPath, path) : basename(path),
        path: path,
        size: (await stat(path)).size,
      });

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Couldn't read file ${basename(path)}: ${error.message}`);
      } else {
        throw Error(`Couldn't read file ${basename(path)}`);
      }
    }

  }

  clear(): void {
    this.data = [];
    this.dirPath = '';
  }

  findPaths(startsWith: string): string[] {
    return this.data
      .filter(value => value.name.startsWith(startsWith))
      .map(value => value.path);
  }

  async largest(paths: string[]): Promise<string> {

    let largest = '';
    let largestSize = 0;

    for (const path of paths) {
      const size = (await stat(path)).size;
      if (size > largestSize) {
        largest = path;
        largestSize = size;
      }
    }

    return largest;
    
  }

  getName(key: number | string): string {

    if (typeof key === 'number') {
      if (this.data[key]) return this.data[key].name;
    } else if (typeof key === 'string') {
      const found = this.data.find(value => value.path === key);
      if (found) return found.name;
    }

    throw Error(`Couldn't find file name from ${key}`);

  }

  getNames(): string[] {
    return this.data.map(value => value.name);
  }

  getPath(name: string): string {

    const found = this.data.find(value => value.name === name);
    if (found) {
      return found.path;
    }

    throw Error(`Couldn't find path from ${name}`);

  }

  getPaths(): string[] {
    return this.data.map(value => {
      if (this.dirPath) {
        return relative(this.dirPath, value.path);
      } else {
        return basename(value.path);
      }
    });
  }

  getSize(): number {
    return this.data.reduce((total, value) => total + value.size, 0);
  }

}