/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as yauzl from 'yauzl';
import * as log4js from 'log4js';
const logger = log4js.getLogger('csharp-file-instllZip');
logger.level = 'debug';

/* tslint:disable */

const { isAbsolute, resolve } = path;

export class AbsolutePath {
  constructor(public value: string) {
    if (!isAbsolute(value)) {
      throw new Error('The path must be absolute');
    }
  }

  public static getAbsolutePath(...pathSegments: string[]): AbsolutePath {
    return new AbsolutePath(resolve(...pathSegments));
  }
}

class NestedError extends Error {
  constructor(public message: string, public err: Error = null) {
    super(message);
  }
}

export async function installZip(
  buffer: Buffer,
  description: string,
  destinationInstallPath: AbsolutePath,
  binaries: AbsolutePath[]
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    logger.info(`install zip file: ${description}`);

    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        const message =
          'C# Extension was unable to download its dependencies. Please check your internet connection. If you use a proxy server, please visit https://aka.ms/VsCodeCsharpNetworking';
        return reject(new NestedError(message));
      }

      zipFile.readEntry();

      zipFile.on('entry', (entry: yauzl.Entry) => {
        const absoluteEntryPath = path.resolve(
          destinationInstallPath.value,
          entry.fileName
        );
        logger.info(`absoluteEntryPath: ${absoluteEntryPath}`);
        if (entry.fileName.endsWith('/')) {
          // Directory - create it
          mkdirp(absoluteEntryPath, { mode: 0o775 }, err => {
            if (err) {
              return reject(
                new NestedError(
                  `Error creating directory for zip directory entry: ${err.code}`
                )
              );
            }

            zipFile.readEntry();
          });
        } else {
          // File - extract it
          zipFile.openReadStream(entry, (err, readStream) => {
            if (err) {
              return reject(new NestedError('Error reading zip stream', err));
            }

            mkdirp(path.dirname(absoluteEntryPath), { mode: 0o775 }, (err) => {
              if (err) {
                return reject(
                  new NestedError(
                    `Error creating directory for zip file entry ${err.code}`,
                    err,
                  ),
                );
              }

              const binaryPaths =
                binaries && binaries.map(binary => binary.value);

              // Make sure executable files have correct permissions when extracted
              const fileMode =
                binaryPaths && binaryPaths.indexOf(absoluteEntryPath) !== -1
                  ? 0o755
                  : 0o664;

              readStream.pipe(
                fs.createWriteStream(absoluteEntryPath, { mode: fileMode })
              );
              readStream.on('end', () => zipFile.readEntry());
            });
          });
        }
      });

      zipFile.on('end', () => {
        resolve();
      });

      zipFile.on('error', (err) => {
        reject(new NestedError(`Zip File Error: ${err.code}`))
      });
    });
  });
}
