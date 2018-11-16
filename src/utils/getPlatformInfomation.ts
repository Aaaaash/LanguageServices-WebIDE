import * as os from 'os';

import LinuxDistribution from './LinuxDistribution';
import execChildProcess from './execChildProcess';

function getUnknownArchitecture(): string { return 'Unknown'; }

function getWindowsArchitecture(): Promise<string> {
  return execChildProcess(
      'wmic os get osarchitecture',
      __dirname,
    )
    .then((architecture) => {
      if (architecture) {
        const archArray: string[] = architecture.split(os.EOL);
        if (archArray.length >= 2) {
          const arch: string = archArray[1].trim();
          /* tslint:disable */
          if (arch.indexOf('64') >= 0) {
            return 'x86_64';
          } else if (arch.indexOf('32') >= 0) {
            return 'x86';
          }
           /* tslint:enable */
        }
      }
      return getUnknownArchitecture();
    })
    .catch((error) => {
      return getUnknownArchitecture();
    });
}

function getUnixArchitecture(): Promise<string> {
  return execChildProcess('uname -m', __dirname)
    .then((architecture) => {
      if (architecture) {
        return architecture.trim();
      }
      return null;
    });
}

export default function getPlatformInfomation(): Promise<any> {
  const platform: string = os.platform();
  let architecturePromise: Promise<string>;
  let distributionPromise: Promise<LinuxDistribution> = Promise.resolve<LinuxDistribution>(null);

  switch (platform) {
    case 'win32':
      architecturePromise = getWindowsArchitecture();
      break;

    case 'linux':
      architecturePromise = getUnixArchitecture();
      distributionPromise = LinuxDistribution.GetDistroInformation();
      break;

    case 'darwin':
      architecturePromise = getUnixArchitecture();
      break;
  }
  return Promise.all<string | LinuxDistribution>([architecturePromise, distributionPromise])
    .then(([arch, distro]: [string, LinuxDistribution]) => {
      return {
        platform,
        distro,
        architecture: arch,
      };
    });
}
