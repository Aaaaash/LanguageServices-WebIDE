import * as fs from 'fs';
import * as path from 'path';

export function checkFileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (stats && stats.isFile()) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export function getInstallLockPath(): string {
  return path.resolve(__dirname, '../../install.lock');
}

export default function checkInstallLockFile(): Promise<boolean> {
  return checkFileExists(getInstallLockPath());
}

export function touchLockFile() {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(getInstallLockPath(), '', (err) => {
      if (err) {
        reject(err);
      }

      resolve();
    });
  });
}
