import * as cp from 'child_process';
import * as io from 'socket.io';
import * as glob from 'glob';
import * as log4js from 'log4js';

import { serverBaseUri, temporaryData, contentLength, CRLF, JAVA_CONFIG_DIR } from '../config';
import findJavaHome from '../utils/findJavaHome';
import { IExecutable, IDispose } from '../types';
import AbstractLanguageServer from './AbstractLanguageServer';
import LanguageServerManager from '../LanguageServerManager';
import { WebSocket as ProtocolWebSocket } from '../jsonrpc/websocket';
import { StreamMessageReader, WebSocketMessageReader } from '../jsonrpc/messageReader';
import { WebSocketMessageWriter } from '../jsonrpc/messageWriter';

class JavaLanguageServer extends AbstractLanguageServer {
  private SERVER_HOME = 'lsp-java-server';

  public type = Symbol('java');

  private executable: IExecutable;

  private socket: io.Socket;

  public destroyed: boolean = false;

  public websocketMessageReader: WebSocketMessageReader;
  public websocketMessageWriter: WebSocketMessageWriter;

  constructor(spaceKey: string, socket: io.Socket) {
    super(spaceKey, JavaLanguageServer.name, LanguageServerManager.getInstance());
    this.socket = socket;
    this.websocketMessageReader = new WebSocketMessageReader(this.socket);
    this.websocketMessageWriter = new WebSocketMessageWriter(this.socket);
    socket.on('disconnect', this.dispose.bind(this));
  }

  public async start(): Promise<IDispose> {
    await this.prepareExecutable();
    this.logger.info('Java Executable is ready.');

    this.logger.info(`command: ${this.executable.command}.`);
    this.process = cp.spawn(this.executable.command, this.executable.args);
    this.logger.info('Java Language Server is running.');

    this.startConversion();

    this.process.on('exit', (code: number, signal: string) => {
      this.logger.info(`jdt.ls exit, code: ${code}, singnal: ${signal}.`);
      this.dispose();
    });

    return Promise.resolve(this.dispose);
  }

  private startConversion () {
    const messageReader = new StreamMessageReader(this.process.stdout);
    this.websocketMessageReader.listen((data) => {
      this.process.stdin.write(data.message);
    });

    messageReader.listen((data) => {
      const jsonrpcData = JSON.stringify(data);
      const length = Buffer.byteLength(jsonrpcData, 'utf-8');
      const headers: string[] = [
        contentLength,
        length.toString(),
        CRLF,
        CRLF,
      ];
      this.websocketMessageWriter.write({ data: `${headers.join('')}${jsonrpcData}` });
    });
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
      `-data`,
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
