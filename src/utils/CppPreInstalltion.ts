import * as log4js from 'log4js';
import * as path from 'path';
import * as tmp from 'tmp';
import * as url from 'url';
import * as https from 'https';
import * as fs from 'fs';
import * as net from 'net';
import * as yauzl from 'yauzl';
import * as mkdirp from 'mkdirp';
import { IncomingMessage, ClientRequest } from 'http';

import checkInstallLockFile, { checkFileExists } from './checkInstallLockFile';
import getPlatformInfomation from './getPlatformInfomation';
import cppRuntimeDependencies from './cppRuntimeDependencies';

const logger = log4js.getLogger('CppPreInstalltion');
logger.level = 'debug';

type PlatformInfomation = {
  platform: string;
  architecture: string;
  distro: string | null;
};

interface IPackage {
  // Description of the package
  description: string;

  // URL of the package
  url: string;

  // Platforms for which the package should be downloaded
  platforms: string[];

  // Architectures for which the package is applicable
  architectures: string[];

  // Binaries in the package that should be executable when deployed
  binaries: string[];

  // Internal location to which the package was downloaded
  tmpFile: tmp.SyncResult;
}

export class PackageManagerError extends Error {
  constructor(
    public message: string,
    public methodName: string,
    public pkg: IPackage = null,
    public innerError: any = null,
    public errorCode: string = '') {
    super(message);
  }
}

export class PackageManagerWebResponseError extends PackageManagerError {
  constructor(
    public socket: net.Socket,
    public message: string,
    public methodName: string,
    public pkg: IPackage = null,
    public innerError: any = null,
    public errorCode: string = '') {
    super(message, methodName, pkg, innerError, errorCode);
  }
}

function getExtensionFilePath(extensionfile: string): string {
  return path.resolve(__dirname, extensionfile);
}

function getPackages(info: PlatformInfomation): Promise<any> {
  for (const pkg of cppRuntimeDependencies) {
    if (pkg.binaries) {
      pkg.binaries = pkg.binaries.map((value) => {
        return getExtensionFilePath(value);
      });
    }
  }
  return Promise.resolve(
    cppRuntimeDependencies.filter((value, index, array) => {
      return (!value.architectures
        || value.architectures.indexOf(info.architecture) !== -1) &&
        (!value.platforms || value.platforms.indexOf(info.platform) !== -1);
    }),
  );
}

async function unlinkPromise(fileName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(fileName, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

async function renamePromise(oldName: string, newName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.rename(oldName, newName, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

type PromiseBuilder = (any) => Promise<any>;

function buildPromiseChain(
  items: any[],
  promiseBuilder: PromiseBuilder,
): Promise<any> {
  let promiseChain: Promise<any> = Promise.resolve<any>(null);

  for (const item of items) {
    promiseChain = promiseChain.then(() => {
      return promiseBuilder(item);
    });
  }

  return promiseChain;
}

function createTempFile(pkg: IPackage): Promise<tmp.SyncResult> {
  return new Promise<tmp.SyncResult>((resolve, reject) => {
    tmp.file({ prefix: 'package-' }, (err, path, fd, cleanupCallback) => {
      if (err) {
        return reject(new PackageManagerError(
          'Error from temp.file',
          'DownloadPackage',
          pkg,
          err,
        ));
      }

      return resolve(<tmp.SyncResult>{ fd, name: path, removeCallback: cleanupCallback });
    });
  });
}

function downloadFile(urlString: any, pkg: IPackage, delay: number): Promise<void> {
  const parsedUrl: url.Url = url.parse(urlString);

  const options: https.RequestOptions = {
    host: parsedUrl.host,
    path: parsedUrl.path,
  };

  return new Promise<void>((resolve, reject) => {
    let secondsDelay: number = Math.pow(2, delay);
    if (secondsDelay === 1) {
      secondsDelay = 0;
    }
    if (secondsDelay > 4) {
      logger.info(`Waiting ${secondsDelay} seconds...`);
    }
    setTimeout(() => {
      if (!pkg.tmpFile || pkg.tmpFile.fd === 0) {
        return reject(
          new PackageManagerError('Temporary Package file unavailable', 'DownloadFile', pkg),
        );
      }

      /* tslint:disable */
      const handleHttpResponse: (response: IncomingMessage) => void = (response: IncomingMessage) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Redirect - download from new location
          let redirectUrl: string | string[];
          if (typeof response.headers.location === 'string') {
            redirectUrl = response.headers.location;
          } else {
            redirectUrl = response.headers.location[0];
          }
          return resolve(downloadFile(redirectUrl, pkg, 0));
        } else if (response.statusCode !== 200) {
          // Download failed - print error message
          const errorMessage: string = `failed (error code '${response.statusCode}')`;
          return reject(
            new PackageManagerWebResponseError(
              response.socket,
              'HTTP/HTTPS Response Error',
              'DownloadFile',
              pkg,
              errorMessage,
              response.statusCode.toString(),
            ),
          );
        } else {
          // Downloading - hook up events
          let contentLength: any = response.headers['content-length'];
          if (typeof response.headers['content-length'] === 'string') {
            contentLength = response.headers['content-length'];
          } else {
            contentLength = response.headers['content-length'][0];
          }
          const packageSize: number = parseInt(contentLength, 10);
          const downloadPercentage: number = 0;
          let dots: number = 0;
          const tmpFile: fs.WriteStream = fs.createWriteStream(null, { fd: pkg.tmpFile.fd });

          logger.info(`Package ${pkg.description} size: (${Math.ceil(packageSize / 1024)} KB) `);

          response.on('data', (data) => {
            // Update dots after package name in output console
            const newDots: number = Math.ceil(downloadPercentage / 5);
            if (newDots > dots) {
              logger.info(''.repeat(newDots - dots));
              dots = newDots;
            }
          });

          response.on('end', () => {
            return resolve();
          });

          response.on('error', (error) => {
            return reject(
              new PackageManagerWebResponseError(
                response.socket,
                'HTTP/HTTPS Response error',
                'DownloadFile',
                pkg,
                error.stack,
                error.name,
              ),
            );
          });

          // Begin piping data from the response to the package file
          response.pipe(tmpFile, { end: false });
        }
      };
     
      const request: ClientRequest = https.request(options, handleHttpResponse);

      request.on('error', (error) => {
        return reject(new PackageManagerError(
          'HTTP/HTTPS Request error' + (urlString.includes('fwlink') ? ': fwlink' : ''), 'DownloadFile',
          pkg, error.stack,
          error.message,
          ),
        );
      });

      // Execute the request
      request.end();
    }, secondsDelay * 1000);
  });
}
 /* tslint:enable */
async function downloadPackageWithRetries(
  pkg: IPackage,
  tmpResult: tmp.SyncResult,
): Promise<void> {
  pkg.tmpFile = tmpResult;

  let success: boolean = false;
  let lastError: any = null;
  let retryCount: number = 0;
  const MAX_RETRIES: number = 5;

  // Retry the download at most MAX_RETRIES times with 2-32 seconds delay.
  do {
    try {
      await downloadFile(pkg.url, pkg, retryCount);
      success = true;
    } catch (error) {
      retryCount += 1;
      lastError = error;
      if (retryCount > MAX_RETRIES) {
        logger.info(` Failed to download ` + pkg.url);
        throw error;
      } else {
        logger.info(` Failed. Retrying...`);
        continue;
      }
    }
  } while (!success && retryCount < MAX_RETRIES);

  logger.info(`Doneload ${pkg.description} done!`);
  if (retryCount !== 0) {
    // Log telemetry to see if retrying helps.
    const telemetryProperties: { [key: string]: string } = {};
    telemetryProperties['success'] = success ? `OnRetry${retryCount}` : 'false';
    if (lastError instanceof PackageManagerError) {
      const packageError: PackageManagerError = lastError;
      telemetryProperties['error.methodName'] = packageError.methodName;
      telemetryProperties['error.message'] = packageError.message;
      if (packageError.pkg) {
        telemetryProperties['error.packageName'] = packageError.pkg.description;
        telemetryProperties['error.packageUrl'] = packageError.pkg.url;
      }
      if (packageError.errorCode) {
        telemetryProperties['error.errorCode'] = packageError.errorCode;
      }
    }
  }
}

async function downloadPackage(pkg: IPackage, progressCount: string): Promise<void> {
  logger.info(`Downloading package '${pkg.description}' `);

  const tmpResult: tmp.SyncResult = await createTempFile(pkg);
  await downloadPackageWithRetries(pkg, tmpResult);
}

async function downloadPackages(info) {
  return getPackages(info)
    .then((packages) => {
      let count: number = 1;
      return buildPromiseChain(packages, (pkg) => {
        const p = downloadPackage(pkg, `${count}/${packages.length}`);
        count += 1;
        return p;
      });
    });
}

function installPackage(pkg: IPackage, progressCount: string): Promise<void> {
  logger.info(`Installing package ${pkg.description}`);

  return new Promise<void>((resolve, reject) => {
    if (!pkg.tmpFile || pkg.tmpFile.fd === 0) {
      return reject(new PackageManagerError('Downloaded file unavailable', 'InstallPackage', pkg));
    }

    yauzl.fromFd(pkg.tmpFile.fd, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        return reject(new PackageManagerError('Zip file error', 'InstallPackage', pkg, err));
      }

      // setup zip file events
      zipfile.on('end', () => {
        return resolve();
      });

      zipfile.on('error', (err) => {
        return reject(new PackageManagerError(
          'Zip File Error',
          'InstallPackage',
          pkg,
          err,
          err.code,
        ));
      });

      zipfile.readEntry();

      zipfile.on('entry', (entry: yauzl.Entry) => {
        const absoluteEntryPath: string = getExtensionFilePath(entry.fileName);

        if (entry.fileName.endsWith('/')) {
          // Directory - create it
          mkdirp.mkdirp(absoluteEntryPath, { mode: 0o775 }, (err) => {
            if (err) {
              return reject(new PackageManagerError(
                'Error creating directory',
                'InstallPackage',
                pkg,
                err,
                err.code,
              ));
            }

            zipfile.readEntry();
          });
        } else {
          checkFileExists(absoluteEntryPath).then((exists: boolean) => {
            if (!exists) {
              // File - extract it
              zipfile.openReadStream(entry, (err, readStream: fs.ReadStream) => {
                if (err) {
                  return reject(new PackageManagerError(
                    'Error reading zip stream',
                    'InstallPackage',
                    pkg,
                    err,
                  ));
                }

                readStream.on('error', (err) => {
                  return reject(new PackageManagerError(
                    'Error in readStream',
                    'InstallPackage',
                    pkg,
                    err,
                  ));
                });

                mkdirp.mkdirp(path.dirname(absoluteEntryPath), { mode: 0o775 }, async (err) => {
                  if (err) {
                    return reject(new PackageManagerError(
                      'Error creating directory',
                      'InstallPackage',
                      pkg,
                      err,
                      err.code,
                    ));
                  }

                  // Create as a .tmp file to avoid partially unzipped files
                  // counting as completed files.
                  const absoluteEntryTempFile: string = absoluteEntryPath + '.tmp';
                  if (fs.existsSync(absoluteEntryTempFile)) {
                    try {
                      await unlinkPromise(absoluteEntryTempFile);
                    } catch (err) {
                      return reject(new PackageManagerError(
                        `Error unlinking file ${absoluteEntryTempFile}`,
                        'InstallPackage',
                        pkg,
                        err,
                      ));
                    }
                  }

                  // Make sure executable files have correct permissions when extracted
                  const fileMode: number =
                  (pkg.binaries && pkg.binaries.indexOf(absoluteEntryPath) !== -1) ? 0o755 : 0o664;
                  const writeStream: fs.WriteStream =
                  fs.createWriteStream(absoluteEntryTempFile, { mode: fileMode });

                  writeStream.on('close', async () => {
                    try {
                      // Remove .tmp extension from the file.
                      await renamePromise(absoluteEntryTempFile, absoluteEntryPath);
                    } catch (err) {
                      return reject(new PackageManagerError(
                        `Error renaming file ${absoluteEntryTempFile}`,
                        'InstallPackage',
                        pkg,
                        err,
                      ));
                    }
                    zipfile.readEntry();
                  });

                  writeStream.on('error', (err) => {
                    return reject(new PackageManagerError(
                      'Error in writeStream',
                      'InstallPackage',
                      pkg,
                      err,
                    ));
                  });

                  readStream.pipe(writeStream);
                });
              });
            } else {
              // Skip the message for text files, because there is a duplicate text file unzipped.
              if (path.extname(absoluteEntryPath) !== '.txt') {
                logger.info(
                  `Warning: File '${absoluteEntryPath}' already exists and was not updated.`,
                );
              }
              zipfile.readEntry();
            }
          });
        }
      });
    });
  }).then(() => {
    pkg.tmpFile.removeCallback();
  });
}

async function installPackages(info) {
  return getPackages(info)
    .then((packages) => {
      let count: number = 1;
      return buildPromiseChain(packages, (pkg) => {
        const p = installPackage(pkg, `${count}/${packages.length}`);
        count += 1;
        return p;
      });
    });
}

async function downloadAndInstallPackages(info: PlatformInfomation) {
  console.log('******************************START DOWNLOAD PACKAGES*****************************');
  await downloadPackages(info);
  console.log('******************************DOWNLOAD PACKAGES DONE******************************');

  console.log('******************************START INSTALL PACKAGES*****************************');
  await installPackages(info);
  // @ TODO
  console.log('******************************INSTALL PACKAGES DONE******************************');
}

async function onlineInstalltion() {
  const installLockFileExits = await checkInstallLockFile();
  logger.info(`Check install lock file exits: ${installLockFileExits}`);
  if (!installLockFileExits) {
    try {
      logger.info('Get platform infomation.');
      const platformInfomation: PlatformInfomation = await getPlatformInfomation();

      logger.info(`
      Platform infomation: ${platformInfomation.platform}-${platformInfomation.architecture}
      `);
      downloadAndInstallPackages(platformInfomation);

    } catch (error) {
      logger.error(`Cpp runtime dependencies install failed, reason: ${error.message}`);
    }
  }
}

async function preInstall() {
  await onlineInstalltion();
}

preInstall();
