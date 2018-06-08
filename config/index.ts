export const BASE_URI = process.env.NODE_ENV === 'dev' ? '/Users/sakura/lsp/vscode-java/server' : '/data/coding-ide-home/repository';
export const CONFIG_DIR = process.platform === 'darwin' ? 'config_mac' : process.platform === 'linux' ? 'config_linux' : 'config_win';

export type IJavaExecutable = {
  options: any;
  command: string;
  args: Array<string>;
}

export const params: Array<string> = [
  '-Xmx256',
  '-Xms256',
  '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y',
  '-Declipse.application=org.eclipse.jdt.ls.core.id1',
  '-Dosgi.bundles.defaultStartLevel=4',
  '-noverify',
  '-Declipse.product=org.eclipse.jdt.ls.core.product',
  '-jar',
  `${BASE_URI}/plugins/org.eclipse.equinox.launcher_1.5.0.v20180207-1446.jar`,
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
