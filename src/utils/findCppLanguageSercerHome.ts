import * as path from 'path';

import { getExtensionFilePath } from './CppPreInstalltion';

export default function findCppLanguageSercerHome() {
  let extensionProcessName: string = 'Microsoft.VSCode.CPP.Extension';
  const plat: NodeJS.Platform = process.platform;
  if (plat === 'linux') {
    extensionProcessName += '.linux';
  } else if (plat === 'darwin') {
    extensionProcessName += '.darwin';
  } else if (plat === 'win32') {
    extensionProcessName += '.exe';
  } else {
    throw 'Invalid Platform';
  }
  return path.resolve(getExtensionFilePath('bin'), extensionProcessName);
}
