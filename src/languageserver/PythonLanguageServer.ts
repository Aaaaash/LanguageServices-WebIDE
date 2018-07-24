import * as cp from 'child_process';
import * as io from 'socket.io';
import * as log4js from 'log4js';
import * as net from 'net';

import { contentLength, CRLF } from '../config';
import { ILanguageServer, IDispose, IExecutable } from '../types';
import findPylsHome from '../utils/findPylsHome';
import findUselessPort from '../utils/findUselessPort';
import { SocketMessageReader } from '../jsonrpc/messageReader';
import LanguageServerManager from '../LanguageServerManager';

class PythonLanguageServer implements ILanguageServer {

  private SERVER_HOME = 'lsp-python-server';

  public type = Symbol('python');

  private logger: log4js.Logger = log4js.getLogger('PythonLanguageServer');

  private executable: IExecutable;

  private process: cp.ChildProcess;

  private serviceManager: LanguageServerManager;

  private spaceKey: string;

  private socket: io.Socket;

  private port: number;

  private tcpSocket: net.Socket;

  constructor(spaceKey: string, socket: io.Socket) {
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.serviceManager = LanguageServerManager.getInstance();
    this.logger.level = 'debug';

    socket.on('disconnect', this.dispose.bind(this));
  }

  public async start(): Promise<IDispose> {
    this.port = await findUselessPort();
    await this.prepareExecutable();

    // @todo 启动 tcp server

    this.logger.info('Python Executable is ready.');
    this.logger.info(`command: ${this.executable.command}.`);
    this.process = cp.spawn(this.executable.command, this.executable.args);
    this.logger.info(`Python Lanugaue Server is running in TCP mode, port: ${this.port}.`);

    this.tcpSocket = net.createConnection({ port: this.port });

    this.tcpSocket.on('connect', () => {
      this.startConversion();
    });

    this.tcpSocket.on('error', (err) => {
      this.logger.error(err);
    });

    return Promise.resolve(this.dispose);
  }

  private startConversion() {
    const messageReader = new SocketMessageReader(this.tcpSocket, 'utf-8');

    this.socket.on('message', (data) => {
      this.tcpSocket.write(data.message);
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
      this.socket.send({ data: `${headers.join('')}${jsonrpcData}` });
    });
  }

  public dispose() {
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.serviceManager.dispose(this.spaceKey);
    this.process.kill();
    this.tcpSocket.destroy();
  }

  private async prepareExecutable() {
    const executable = Object.create(null);
    const options = Object.create(null);
    options.env = process.env;
    executable.options = options;
    try {
      executable.command = await findPylsHome();
    } catch (e) {
      this.logger.error(e.message || 'Pyls could not be located');
    }
    executable.args = ['--tcp', `--port=${this.port}`];

    this.executable = executable;
  }
}

export default PythonLanguageServer;
