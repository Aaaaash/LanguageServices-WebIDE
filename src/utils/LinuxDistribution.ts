/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All Rights Reserved.
 * See 'LICENSE' in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as fs from 'fs';
import * as os from 'os';

export default class LinuxDistribution {
  constructor(public name, public version) {}

  /**
   * There is no standard way on Linux to find the distribution name and version.
   * Recently, systemd has pushed to standardize the os-release file. This has
   * seen adoption in "recent" versions of all major distributions.
   * https://www.freedesktop.org/software/systemd/man/os-release.html
   */
  /* tslint:disable */
  public static GetDistroInformation(): Promise<LinuxDistribution> {
    let linuxDistro: Promise<LinuxDistribution>;

    // First check /etc/os-release and only fallback to /usr/lib/os-release
    // as per the os-release documentation.
    linuxDistro = LinuxDistribution.getDistroInformationFromFile(
      '/etc/os-release',
    )
      .catch(() => {
        return LinuxDistribution.getDistroInformationFromFile(
          '/usr/lib/os-release',
        );
      })
      .catch(() => {
        // couldn't get distro information
        return Promise.resolve(new LinuxDistribution('unknown', 'unknown'));
      });

    return linuxDistro;
  }

  private static getDistroInformationFromFile(
    path: string,
  ): Promise<LinuxDistribution> {
    return new Promise<LinuxDistribution>((resolve, reject) => {
      fs.readFile(path, 'utf8', (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(LinuxDistribution.getDistroInformation(data));
      });
    });
  }

  // Only public for tests.
  public static getDistroInformation(data: string): LinuxDistribution {
    const idKey: string = 'ID';
    const versionKey: string = 'VERSION_ID';
    let distroName: string = 'unknown';
    let distroVersion: string = 'unknown';

    const keyValues: string[] = data.split(os.EOL);
    for (let i: number = 0; i < keyValues.length; i++) {
      const keyValue: string[] = keyValues[i].split('=');
      if (keyValue.length === 2) {
        if (keyValue[0] === idKey) {
          distroName = keyValue[1];
        } else if (keyValue[0] === versionKey) {
          distroVersion = keyValue[1];
        }
      }
    }

    return new LinuxDistribution(distroName, distroVersion);
  }
}
