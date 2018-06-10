import * as glob from 'glob';

export const SERVER_HOME = 'lsp-java-server';

export const BASE_URI = `./${SERVER_HOME}`;
export const CONFIG_DIR = process.platform === 'darwin' ? 'config_mac' : process.platform === 'linux' ? 'config_linux' : 'config_win';

export type IJavaExecutable = {
  options: any;
  command: string;
  args: Array<string>;
}

const launchersFound: Array<string> = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', { cwd: `./${SERVER_HOME}` });

if (launchersFound.length === 0 || !launchersFound) {
  throw new Error('**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!');
}

export const params: Array<string> = [
  '-Xmx256m',
  '-Xms256m',
  '-Xmn256m',
  '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y',
  '-Declipse.application=org.eclipse.jdt.ls.core.id1',
  '-Dosgi.bundles.defaultStartLevel=4',
  '-noverify',
  '-Declipse.product=org.eclipse.jdt.ls.core.product',
  '-jar',
  `${BASE_URI}/${launchersFound[0]}`,
  '-configuration',
  `${BASE_URI}/${CONFIG_DIR}`
];

export function prepareExecutable(): IJavaExecutable {
  let executable = Object.create(null);
  let options = Object.create(null);
  options.env = process.env;
  options.stdio = 'pipe';
  executable.options = options;
  executable.command = 'java';
  executable.args = params;
  return executable;
}
