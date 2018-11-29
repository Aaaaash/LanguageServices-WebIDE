/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* tslint:disable */

 import * as https from 'https';
import { parse as parseUrl } from 'url';
import * as log4js from 'log4js';
const logger = log4js.getLogger('csharp-file-downloader');
logger.level = 'debug';

class NestedError extends Error {
  constructor(public message: string, public err: Error = null) {
    super(message);
  }
}

export async function downloadFile(
  description: string,
  url: string,
  fallbackUrl?: string,
): Promise<Buffer> {
  logger.info(`download file: ${description}`);
  try {
    const buffer = await _downloadFile(description, url);
    return buffer;
  } catch (primaryUrlError) {
    // If the package has a fallback Url, and downloading from the primary Url failed, try again from
    // the fallback. This is used for debugger packages as some users have had issues downloading from
    // the CDN link
    if (fallbackUrl) {
      try {
        const buffer = await _downloadFile(description, fallbackUrl);
        return buffer;
      } catch (fallbackUrlError) {
        throw primaryUrlError;
      }
    } else {
      throw primaryUrlError;
    }
  }
}

async function _downloadFile(
  description: string,
  urlString: string,
): Promise<Buffer> {
  const url = parseUrl(urlString);
  const options: https.RequestOptions = {
    host: url.hostname,
    path: url.path,
    port: url.port,
    rejectUnauthorized: true,
  };

  const buffers: any[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    const request = https.request(options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Redirect - download from new location
        return resolve(_downloadFile(description, response.headers.location));
      } else if (response.statusCode !== 200) {
        // Download failed - print error message
        return reject(new NestedError(response.statusCode.toString()));
      }

      // Downloading - hook up events
      const packageSize = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let downloadPercentage = 0;

      response.on('data', data => {
        downloadedBytes += data.length;
        buffers.push(data);

        // Update status bar item with percentage
        const newPercentage = Math.ceil(100 * (downloadedBytes / packageSize));
        if (newPercentage !== downloadPercentage) {
          downloadPercentage = newPercentage;
        }
      });

      response.on('end', () => {
        logger.info(`${description} download done.`);
        resolve(Buffer.concat(buffers));
      });

      response.on('error', (err) => {
        reject(
          new NestedError(
            `Failed to download from ${urlString}. Error Message: ${
              err.message
            } || 'NONE'}`,
            err,
          ),
        );
      });
    });

    request.on('error', (err) => {
      reject(new NestedError(`Request error: ${err.message || 'NONE'}`, err));
    });

    // Execute the request
    request.end();
  });
}
