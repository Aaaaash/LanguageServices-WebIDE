import { BASE_URI, CONFIG_DIR } from './index';

type IOptions = {
  env: NodeJS.ProcessEnv,
  stdio: string;
};

export type IJavaExecutable = {
  options: IOptions;
  command: string;
  args: Array<string>;
}

export const params: Array<string> = [
  '-Xmx256m',
  '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y',
  '-Declipse.application=org.eclipse.jdt.ls.core.id1',
  '-Dosgi.bundles.defaultStartLevel=4',
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
