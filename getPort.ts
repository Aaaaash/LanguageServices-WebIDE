import * as net from 'net';
import * as cp from 'child_process';

let portrange = 45032;
export default function getPort (cb) {
  let port = portrange;
  portrange += 1;
  const server = net.createServer();
  server.listen(port, function (err) {
    server.once('close', function () {
      cb(port);
    });
    server.close();
  });
  server.on('error', function (err) {
    getPort(cb);
  });
}

/**
 * @param workspacePath the root dir of workspace
 * @param cb callback
 */
function prepareParams(
  workspacePath: string = "/Users/sakura/Documents/java/spring-boot-start"
): Promise<object> {
  return new Promise((resolve, reject) => {
    getPort((port) => {
      let params = [];
      console.log(`process will listen in port ${port}`);
      params.push(
        `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${port},quiet=y`
      );
      params.push("-Declipse.application=org.eclipse.jdt.ls.core.id1");
      params.push("-Dosgi.bundles.defaultStartLevel=4");
      params.push("-Declipse.product=org.eclipse.jdt.ls.core.product");
      params.push("-Dlog.level=2");
      params.push("-jar");
      params.push(
        "/Users/sakura/lsp/vscode-java/server/plugins/org.eclipse.equinox.launcher_1.5.0.v20180207-1446.jar"
      );
      let configDir = "config_win";
      if (process.platform === "darwin") {
        configDir = "config_mac";
      } else if (process.platform === "linux") {
        configDir = "config_linux";
      }
      params.push("-configuration");
      params.push("/Users/sakura/lsp/vscode-java/server/config_mac");
      params.push("-data");
      params.push(workspacePath);
      resolve(params);
    });
  })
}

/**
 * 
 * @param cb callback
 */
async function prepareExecutable() {
  const javahome =
    "/Library/java/JavaVirtualMachines/jdk1.8.0_131.jdk/Contents/Home";
  let executable = Object.create(null);
  let options = Object.create(null);
  options.env = process.env;
  options.stdio = "pipe";
  executable.options = options;
  executable.command = "java";
  executable.params = await prepareParams()
  return executable;
}

/**
 * @return Promise<cp.ChildProcess> a Promise of new ChildProcess
 */
export async function initNewJavaLSProcess(): Promise<cp.ChildProcess> {
  const exe = await prepareExecutable();
  const childProcess = cp.spawn(exe.command, exe.args);
  return childProcess;
}
