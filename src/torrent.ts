import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { WriteStream } from "node:fs";
import { errorString } from "./util";
import PQueue from "p-queue";

const nt = require('nt');

const MAX_PIECE_SIZE = 16 * 1024 * 1024; // 16 MB
const MIN_PIECE_SIZE = 256 * 1024; // 256 KB
const MAX_PIECES = 4096; // 2048-4096 pieces

type NodeTorrentTorrent = {
  metadata?: {
    announce: string;
    info: {
      source?: string;
    }
  };
  createWriteStream?: (path: string) => WriteStream;
};

type NodeTorrentHasher = {
  on: (event: string, data: any) => void;
  destroy: () => void;
};

/*
  const torrent = new Torrent();
  await torrent.addFiles([string paths], string dirPath, int size);
  const torrentFilename = await torrent.edit(string announce, string source);
*/

export default class Torrent {

  contentDirPath: string;
  contentPaths: string[];
  contentSize: number;
  creationPromise?: Promise<Torrent>;
  editQueue: PQueue;
  hasher?: NodeTorrentHasher;
  isDirectory: boolean;
  progressCallbacks: Array<(percent: number) => void>;
  torrent?: NodeTorrentTorrent;
  torrentFilename = '';
  torrentFiles: string[];
  torrentPath: string;

  constructor() {

    this.torrentFiles = [];
    this.creationPromise = undefined;
    this.editQueue = new PQueue({ concurrency: 1, autoStart: true });

    this.isDirectory = false;
    this.contentPaths = [];
    this.contentDirPath = '';
    this.contentSize = 0;
    this.torrentFilename = '';
    this.torrentPath = '';

    this.progressCallbacks = [];

  }

  /**
   * Add files to be immediately hashed in a new torrent
   * 
   * @param paths Full paths to each file
   * @param dirPath Directory where the file or files live
   * @param size Total size of all files, used to calculate piece size
   */
  addFiles(paths: string[], dirPath: string, size: number): void {

    this.stop();
    this.clear();

    if (paths.length >= 2 && !dirPath) {
      throw Error("Can't make torrent, need a directory path for a multi-file torrent");
    }

    this.isDirectory = paths.length >= 2;

    if (paths.length < 1) {
      throw Error("Can't make torrent, no files provided");
    }

    if (!size) {
      throw Error("Can't make torrent, missing file size");
    }

    this.contentPaths = paths;
    this.contentDirPath = dirPath;
    this.contentSize = size;

    this.create();

  }

  async cleanup(): Promise<void> {
    for (const file of this.torrentFiles) {
      try { await rm(file); } catch { }
    }
  }

  clear(): void {
    this.contentPaths = [];
    this.contentDirPath = '';
    this.contentSize = 0;
    this.torrentFilename = '';
    this.torrentPath = '';
    this.hasher = undefined;
  }

  async close(): Promise<void> {
    for (const file of this.torrentFiles) {
      try { await rm(file); } catch { }
    }
    this.cleanup();
  }

  create(): Promise<Torrent> {

    this.creationPromise = new Promise(async (resolve: (torrent: Torrent) => void, reject) => {

      if (!this.contentPaths || !this.contentDirPath) {
        reject("Can't create torrent, no files provided");
      }

      this.hasher = nt.make(
        'https://', // Dummy announce
        this.contentDirPath,
        this.contentPaths,
        {
          pieceLength: this.getPieceSize(this.contentSize),
          private: true,
          moreInfo: { source: 'None' },
        },
        (error, torrent) => {
          if (error) reject(error);
          if (torrent) {
            this.torrent = torrent;
            resolve(this);
          }
        }
      ) as NodeTorrentHasher;

      this.hasher.on('progress', (percent: number) => {
        this.emitProgress(Number(percent));
      });
      this.hasher.on('error', error => {
        reject(errorString('Error while hashing torrent', error))
      });

    });

    return this.creationPromise;

  }

  /**
   * Edits a hashed or currently hashing torrent with a specific announce and
   * source and saves it
   * 
   * @param announce New announce URL for generated torrent
   * @param source New source, must be unique per-tracker
   * @returns Path to the generated torrent file
   */
  async edit(announce: string, source: string): Promise<string> {

    if (!this.creationPromise) {
      throw Error("Can't edit torrent, not created yet");
    }

    try {

      const path = await this.editQueue.add(() => this.processEdit(announce, source));
      return path || '';

    } catch(error) {
      throw Error(errorString('Failed to add announce and source to torrent', error));
    }

  }

  getPieceSize(fileSize: number): number {

    let pieceSize = fileSize / MAX_PIECES;
    let exponent = Math.ceil(Math.log2(pieceSize));

    if (pieceSize > MAX_PIECE_SIZE) {
      pieceSize = MAX_PIECE_SIZE;
      exponent = Math.log2(pieceSize);
    }

    if (pieceSize < MIN_PIECE_SIZE) {
      pieceSize = MIN_PIECE_SIZE;
      exponent = Math.log2(pieceSize);
    }

    return exponent;

  }

  onProgress(callback: (percent: number) => void): void {
    this.progressCallbacks.push(callback);
  }

  processEdit(announce: string, source: string): Promise<string> {

    return new Promise((resolve, reject) => {

      if (!this.creationPromise) {
        reject("Can't edit torrent, creation hasn't started yet");
        return;
      }

      this.creationPromise.then(torrent => {

        if (!this.torrent || !this.torrent.metadata) {
          reject('Torrent object does not contain metadata');
          return;
        }

        this.torrent.metadata.announce = announce;
        if (!this.torrent.metadata.info) {
          this.torrent.metadata.info = { source: '' };
        }
        this.torrent.metadata.info.source = source;

        const dir = join(tmpdir(), 'ak-automated-uploader', 'torrents', source);
        mkdir(dir, { recursive: true }).then(() => {

          let filename = `${this.isDirectory ? this.contentDirPath : this.contentPaths[0]}.torrent`;
          filename = basename(filename);
          const path = join(dir, filename);

          this.torrentFiles.push(path);

          if (!this.torrent || !this.torrent.createWriteStream) {
            reject('Torrent object does not contain createWriteStream');
            return;
          }

          const writeStream = this.torrent.createWriteStream(path) as unknown as WriteStream;
          writeStream.on('error', error => reject(error.message));
          writeStream.on('finish', () => {
            setTimeout(() => resolve(path), 250);
            // This setTimeout() is probably unneccessary
          });

        }).catch(error => reject(error));

      }).catch(error => reject(error));

    });

  }

  emitProgress(percent: number): void {
    for (const callback of this.progressCallbacks) {
      callback(percent);
    }
  }

  stop(): void {
    if (this.hasher) {
      this.hasher.destroy();
      this.hasher = undefined;
    }
    if (this.creationPromise) {
      this.creationPromise = undefined;
    }
  }

}