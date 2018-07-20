import * as glob from 'glob';

import findJavaHome from '../utils/find-java-home';

export const SERVER_HOME = 'lsp-java-server';

export const BASE_URI = process.env.NODE_ENV === 'dev' ? `/Users/sakura/lsp/node-lsp-tcp/${SERVER_HOME}` : `/data/coding-ide-home/node-lsp-tcp/${SERVER_HOME}`;
export const CONFIG_DIR = process.platform === 'darwin' ? 'config_mac' : process.platform === 'linux' ? 'config_linux' : 'config_win';

export type IExecutable = {
  options: any;
  command: string;
  args: Array<string>;
}

export const PORT = 9988;

const launchersFound: Array<string> = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', { cwd: `./${SERVER_HOME}` });

if (launchersFound.length === 0 || !launchersFound) {
  throw new Error('**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!');
}

export const params: Array<string> = [
  '-Xmx256m',
  '-Xms256m',
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

export async function prepareExecutable(): Promise<IExecutable> {
  let executable = Object.create(null);
  let options = Object.create(null);
  options.env = process.env;
  options.stdio = 'pipe';
  executable.options = options;
  executable.command = await findJavaHome() + '/bin/java';
  executable.args = params;
  return executable;
}
