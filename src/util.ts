import { spawn } from "child_process";
import { constants } from "fs";
import { access, mkdir } from "fs/promises";
import { CookieJar } from "node-fetch-cookies";
import { join } from "path";
import { platform } from "process";

export async function appDataPath(file?: string): Promise<string> {
  
  const path = join(
    process.env.APPDATA || (
      process.platform === 'darwin'
      ? process.env.HOME + '/Library/Preferences'
      : process.env.HOME + '/.local/share'
    ),
    'ak-automated-uploader'
  );

  await mkdir(path, { recursive: true });

  if (file) {
    return join(path, file);
  } else {
    return path;
  }

}

export async function getCookieJar(filename: string): Promise<CookieJar> {

  const dirPath = join(await appDataPath(), 'cookies');
  await mkdir(dirPath, { recursive: true });

  const jarPath = join(dirPath, filename);
  const jar = new CookieJar(jarPath);

  try {
    await access(jarPath, constants.R_OK | constants.W_OK);
    await jar.load();
  } catch { }

  return jar;

}

export function normalize(string: string): string {
  return string.toLowerCase()
               .normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .replace(/[^\x00-\x7F]/g, '')
               .replace(/[']/g, '')
               .replace(/[.!:]/g, ' ')
               .replace(/ {2,}/g, ' ')
               .replace(/&/g, 'and')
               .trim()
}

export function errorString(description: string, error: any): string {
  if (error instanceof Error) {
    return `${description}: ${error.message}`;
  } else if (typeof error === 'string') {
    return `${description}: ${error}`;
  } else {
    return description;
  }
}

export function open(path: string): void {

  let command = '';

  if (platform === 'darwin') {
    command = 'open';
  } else if (platform === 'win32') {
    command = 'start';
  } else {
    command = 'xdg-open';
  }

  const subprocess = spawn(command, [path]);

}