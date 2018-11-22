import * as log4js from 'log4js';
import * as path from 'path';
import * as fs from 'fs';
import runtimeDependecies from './runtimeDependecies';
import { commandLineOptions } from '../commandLineArguments';
import { PlatformInformation } from '../platform';
import { downloadFile } from '../fileDownloader';
import { installZip } from '../installZip';
import { serverBaseUri } from '../../config';
const { filterAsync } = require('node-filter-async');

/* tslint:disable */
const logger = log4js.getLogger('csharp-install');

logger.level = 'debug';

export const rootPath = path.resolve(__dirname, '../../../csharp-lsp');
export const packedVsixOutputRoot = commandLineOptions.outputFolder || rootPath;
export const codeExtensionPath =
  commandLineOptions.codeExtensionPath || rootPath;

const { isAbsolute, resolve } = path;

interface IPackage {
  description: string;
  url: string;
  fallbackUrl?: string;
  platforms: string[];
  architectures: string[];
  platformId?: string;
}

interface Package extends IPackage {
  installPath?: string;
  binaries: string[];
  installTestPath?: string;
}

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

export class AbsolutePathPackage implements IPackage {
  constructor(
    public description: string,
    public url: string,
    public platforms: string[],
    public architectures: string[],
    public binaries: AbsolutePath[],
    public installPath?: AbsolutePath,
    public installTestPath?: AbsolutePath,
    public fallbackUrl?: string,
    public platformId?: string,
  ) {}

  public static getAbsolutePathPackage(pkg: Package, extensionPath: string) {
    return new AbsolutePathPackage(
      pkg.description,
      pkg.url,
      pkg.platforms,
      pkg.architectures,
      getAbsoluteBinaries(pkg, extensionPath),
      getAbsoluteInstallPath(pkg, extensionPath),
      getAbsoluteInstallTestPath(pkg, extensionPath),
      pkg.fallbackUrl,
      pkg.platformId,
    );
  }
}

class NestedError extends Error {
  constructor(public message: string, public err: Error = null) {
    super(message);
  }
}

class PackageError extends NestedError {
  constructor(
    public message: string,
    public pkg: IPackage = null,
    public innerError: any = null,
  ) {
    super(message, innerError);
  }
}

export async function filterPackages(
  packages: AbsolutePathPackage[],
  platformInfo: PlatformInformation,
): Promise<AbsolutePathPackage[]> {
  const platformPackages = filterPlatformPackages(packages, platformInfo);
  return filterAlreadyInstalledPackages(platformPackages);
}

function filterPlatformPackages(
  packages: AbsolutePathPackage[],
  platformInfo: PlatformInformation,
) {
  if (packages) {
    return packages.filter((pkg) => {
      if (
        pkg.architectures &&
        pkg.architectures.indexOf(platformInfo.architecture) === -1
      ) {
        return false;
      }

      if (
        pkg.platforms &&
        pkg.platforms.indexOf(platformInfo.platform) === -1
      ) {
        return false;
      }

      return true;
    });
  } else {
    throw new PackageError('Package manifest does not exist.');
  }
}

function fileExists(filePath: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (stats && stats.isFile()) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

async function filterAlreadyInstalledPackages(
  packages: AbsolutePathPackage[]
): Promise<AbsolutePathPackage[]> {
  return filterAsync(packages, async (pkg: AbsolutePathPackage) => {
    const testPath = pkg.installTestPath;
    if (!testPath) {
      return true;
    }

    return !(await fileExists(testPath.value));
  });
}

function getAbsoluteInstallTestPath(
  pkg: Package,
  extensionPath: string,
): AbsolutePath {
  if (pkg.installTestPath) {
    return AbsolutePath.getAbsolutePath(extensionPath, pkg.installTestPath);
  }

  return null;
}

function getAbsoluteBinaries(
  pkg: Package,
  extensionPath: string,
): AbsolutePath[] {
  const basePath = getAbsoluteInstallPath(pkg, extensionPath).value;
  if (pkg.binaries) {
    return pkg.binaries.map(value =>
      AbsolutePath.getAbsolutePath(basePath, value),
    );
  }

  return null;
}

function getAbsoluteInstallPath(
  pkg: Package,
  extensionPath: string,
): AbsolutePath {
  if (pkg.installPath) {
    return AbsolutePath.getAbsolutePath(extensionPath, pkg.installPath);
  }

  return new AbsolutePath(extensionPath);
}

async function downloadAndInstallPackages(
  packages: Package[],
  platformInfo: PlatformInformation,
  extensionPath: string,
) {
  const absolutePathPackages = packages.map(pkg =>
    AbsolutePathPackage.getAbsolutePathPackage(pkg, extensionPath)
  );
  const filteredPackages = await filterPackages(
    absolutePathPackages,
    platformInfo,
  );
  if (filteredPackages) {
    for (const pkg of filteredPackages) {
      try {
        const buffer = await downloadFile(
          pkg.description,
          pkg.url,
          pkg.fallbackUrl,
        );
        try {
          await installZip(
            buffer,
            pkg.description,
            pkg.installPath,
            pkg.binaries,
          );
        } catch (err) {
          logger.error(err.message || '');
        }
      } catch (error) {
        logger.error(error.message);
        if (error instanceof NestedError) {
          throw new PackageError(error.message, pkg, error.err);
        } else {
          throw error;
        }
      }
    }
  }
}

async function doInstall(platformInfo: PlatformInformation) {
  logger.info('*******************START DOWNLOAD*******************');
  await downloadAndInstallPackages(
    runtimeDependecies as Package[],
    platformInfo,
    codeExtensionPath,
  );
}

async function doOfflinePackage(
  platformInfo: PlatformInformation,
  packageName: string,
  outputFolder: string,
) {
  const packageFileName = `${packageName}-${platformInfo.platform}-${
    platformInfo.architecture
  }.vsix`;
  logger.info(`platform: ${platformInfo.platform}`);
  await doInstall(platformInfo);

  // todo
}

async function install() {
  const packages = [
    // new PlatformInformation('win32', 'x86_64'),
    new PlatformInformation('darwin', 'x86_64'),
    // new PlatformInformation('linux', 'x86_64')
  ];

  const name = 'csharp';
  const version = '1.18.0-beta1';
  const packageName = name + '.' + version;

  for (const platformInfo of packages) {
    await doOfflinePackage(platformInfo, packageName, packedVsixOutputRoot);
  }
}

install();
