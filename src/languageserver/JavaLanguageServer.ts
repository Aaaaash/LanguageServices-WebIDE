import * as cp from 'child_process';
import * as io from 'socket.io';
import * as glob from 'glob';
import * as log4js from 'log4js';

import { BASE_URI, ContentLength, CRLF } from '../config';
import findJavaHome from '../utils/findJavaHome';
import { IExecutable, ILanguageServer, IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';
import { StreamMessageReader } from '../jsonrpc/messageReader';

class JavaLanguageServer implements ILanguageServer {
  private SERVER_HOME = 'lsp-java-server';

  public type = Symbol('java');

  private logger: log4js.Logger;

  private executable: IExecutable;

  private process: cp.ChildProcess;

  private servicesManager: LanguageServerManager;

  private spaceKey: string;

  private socket: io.Socket;

  constructor(spaceKey: string, socket: io.Socket) {
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.servicesManager = LanguageServerManager.getInstance();
    this.logger = log4js.getLogger('JavaLanguageServer');
    this.logger.level = 'debug';

    socket.on('disconnect', this.dispose.bind(this));
  }

  public start(): Promise<IDispose> {
    this.prepareExecutable();
    this.logger.info('Java Executable is ready.');

    this.logger.info(`command: ${this.executable.command}`);
    this.process = cp.spawn(this.executable.command, this.executable.args);
    this.logger.info('Java Language Server is running.');

    this.startConversion();
    return Promise.resolve(this.dispose);
  }

  public startConversion () {
    const messageReader = new StreamMessageReader(this.process.stdout);
    this.socket.on('message', (data) => {
      this.process.stdin.write(data.message);
    });

    messageReader.listen((data) => {
      const jsonrpcData = JSON.stringify(data);
      Buffer.byteLength(jsonrpcData, 'utf-8');
      const headers: string[] = [
        ContentLength,
        jsonrpcData.length.toString(),
        CRLF,
        CRLF,
      ];
      this.socket.send({ data: `${headers.join('')}${jsonrpcData}` });
    });
  }

  public dispose() {
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.servicesManager.dispose(this.spaceKey);
    this.process.kill();
  }

  private prepareParams() {
    const launchersFound: Array<string> = glob.sync(
      '**/plugins/org.eclipse.equinox.launcher_*.jar',
      { cwd: `./${this.SERVER_HOME}` },
    );

    const baseUri = BASE_URI(this.SERVER_HOME);

    const CONFIG_DIR =
      process.platform === 'darwin'
        ? 'config_mac'
        : process.platform === 'linux'
          ? 'config_linux'
          : 'config_win';

    if (launchersFound.length === 0 || !launchersFound) {
      this.logger.error(
        '**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!',
      );
      throw new Error(
        '**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!',
      );
    }

    const params: Array<string> = [
      '-Xmx256m',
      '-Xms256m',
      '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y',
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-noverify',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-jar',
      `${baseUri}/${launchersFound[0]}`,
      '-configuration',
      `${baseUri}/${CONFIG_DIR}`,
    ];

    return params;
  }

  private async prepareExecutable() {
    const params = this.prepareParams();
    const executable = Object.create(null);
    const options = Object.create(null);
    options.env = process.env;
    options.stdio = 'pipe';
    executable.options = options;
    executable.command = await findJavaHome();
    executable.args = params;
    
    this.executable = executable;
  }
}

export default JavaLanguageServer;
