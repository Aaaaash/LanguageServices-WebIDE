import * as cp from 'child_process';
import * as io from 'socket.io';
import * as glob from 'glob';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import * as lsp from 'vscode-languageserver';
import * as rpc from 'vscode-ws-jsonrpc/lib';

import { serverBaseUri, temporaryData, contentLength, CRLF, JAVA_CONFIG_DIR } from '../config';
import findJavaHome from '../utils/findJavaHome';
import { IExecutable, IDispose } from '../types';
import AbstractLanguageServer from './AbstractLanguageServer';
import LanguageServerManager from '../LanguageServerManager';

class JavaLanguageServer extends AbstractLanguageServer {
  private SERVER_HOME = 'lsp-java-server';

  public type = Symbol('java');

  private executable: IExecutable;

  private servicesManager: LanguageServerManager;

  public spaceKey: string;
  private websocket: rpc.IWebSocket;
  private socket: io.Socket;

  public destroyed: boolean = false;

  public messageReader: rpc.WebSocketMessageReader;
  public messageWriter: rpc.WebSocketMessageWriter;
  constructor(spaceKey: string, socket: io.Socket) {
    super(spaceKey, JavaLanguageServer.name, LanguageServerManager.getInstance());
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.servicesManager = LanguageServerManager.getInstance();
    this.logger.level = 'debug';
    this.websocket = {
      send: content =>
        this.socket.send(content, (error) => {
          if (error) {
            throw error;
          }
        }),
      onMessage: cb =>
        this.socket.on('message', (data) => {
          cb(data.message);
        }),
      onError: cb => this.socket.on('error', cb),
      onClose: cb => this.socket.on('close', cb),
      dispose: () => this.socket.disconnect(),
    };

    this.messageReader = new rpc.WebSocketMessageReader(
      this.websocket,
    );
    this.messageWriter = new rpc.WebSocketMessageWriter(
      this.websocket,
    );
    socket.on('disconnect', this.dispose.bind(this));
  }

  public async start(): Promise<IDispose> {
    await this.prepareExecutable();
    this.logger.info('Java Executable is ready.');

    this.logger.info(`command: ${this.executable.command}.`);
    const socketConnection = server.createConnection(this.messageReader, this.messageWriter, this.dispose.bind(this));
    const serverConnection = server.createServerProcess('Java LSP', this.executable.command, this.executable.args);
    this.logger.info('Java Language Server is running.');
    server.forward(socketConnection, serverConnection, (message) => {
      return message;
    });
    this.websocket.onClose(() => {
      serverConnection.dispose();
    });
    return Promise.resolve(this.dispose);
  }

  public dispose = () => {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.servicesManager.dispose(this.spaceKey);
    if (this.process) {
      this.process.kill();
    }
  }

  private prepareParams() {
    const launchersFound: string[] = glob.sync(
      '**/plugins/org.eclipse.equinox.launcher_*.jar',
      { cwd: `./${this.SERVER_HOME}` },
    );

    const serverUri = serverBaseUri(this.SERVER_HOME);
    const dataDir = temporaryData(this.spaceKey);

    this.logger.info(`jdt.ls data directory: ${dataDir}`);

    if (launchersFound.length === 0 || !launchersFound) {
      this.logger.error(
        '**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!',
      );
      throw new Error(
        '**/plugins/org.eclipse.equinox.launcher_*.jar Not Found!',
      );
    }

    const params: string[] = [
      '-Xmx256m',
      '-Xms256m',
      '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y',
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Dlog.level=ALL',
      '-noverify',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-jar',
      `${serverUri}/${launchersFound[0]}`,
      '-configuration',
      `${serverUri}/${JAVA_CONFIG_DIR}`,
      '-data',
      dataDir,
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
    try {
      executable.command = await findJavaHome();
    } catch (e) {
      this.logger.error(e.message || 'Java runtime could not be located');
    }
    executable.args = params;

    this.executable = executable;
  }
}

export default JavaLanguageServer;
