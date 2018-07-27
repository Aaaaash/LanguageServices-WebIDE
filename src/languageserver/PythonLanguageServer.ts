import * as cp from 'child_process';
import * as io from 'socket.io';
import * as log4js from 'log4js';
import * as net from 'net';
import * as kill from 'tree-kill';

import { contentLength, CRLF } from '../config';
import { ILanguageServer, IDispose, IExecutable } from '../types';
import findPylsHome from '../utils/findPylsHome';
import findUselessPort from '../utils/findUselessPort';
import { SocketMessageReader } from '../jsonrpc/messageReader';
import LanguageServerManager from '../LanguageServerManager';
import { LANGUAGE_STATUS } from '../protocol';

enum ClientState {
  Initial = 'Initial',
  Starting = 'Starting',
  Started = 'Started',
  StartFailed = 'StartFailed',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
}

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

  private messageQueue: string[] = [];

  private connected: boolean = false;

  private messageReader: SocketMessageReader;

  /* tslint:disable */
  private _interval: NodeJS.Timer;
  /* tslint:enable */

  public destroyed: boolean = false;

  constructor(spaceKey: string, socket: io.Socket) {
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.serviceManager = LanguageServerManager.getInstance();
    this.logger.level = 'debug';

    socket.on('disconnect', this.dispose);
    socket.on('disconnecting', this.dispose);

    socket.on('message', (data) => {
      this.messageQueue.push(data.message);
      if (this.connected) {
        this.sendMessageFromQueue();
      }
    });

  }

  private async initPythonTcpServer() {
    this.port = await findUselessPort();
    await this.prepareExecutable();
    this.logger.info('Python Executable is ready.');

    const { command, args } = this.executable;
    this.logger.info(`command: ${command} ${args.join(' ')}.`);

    this.process = cp.spawn(command, args);
    this.logger.info(`Python Lanugaue Server is running in TCP mode, port: ${this.port}.`);

    this.process.on('data', (data) => {
      this.logger.info(data.toString());
    });

    this.process.on('exit', (code: number, signal: string) => {
      this.logger.warn(`pyls exit, code: ${code}, singnal: ${signal}.`);
      this.dispose();
    });
  }

  public async start(): Promise<IDispose> {
    this.logger.info('start');
    await this.initPythonTcpServer();

    let progress = 0;
    this._interval = setInterval(
      () => {
        const message = `${progress}% Starting Python Language Server`;
        progress += 10;
        this.sendLanguageStatus(ClientState.Starting, message);
        const socket = net.createConnection({ port: this.port }, () => {
          this.logger.info('connected');
          this.tcpSocket = socket;
          this.connected = true;

          this.sendLanguageStatus(ClientState.Starting, '100% Starting Python Language Server');
          this.sendLanguageStatus(ClientState.Started, 'Ready');
          this.messageReader = new SocketMessageReader(this.tcpSocket);
          this.sendMessageFromQueue();
          this.startConversion();

          this.tcpSocket.on('error', (err) => {
            clearInterval(this._interval);
            this.logger.error(err);
          });

          clearInterval(this._interval);
        });
        socket.on('error', () => {
          this.logger.warn('connect failure，retry...');
        });
      },
      500);

    return Promise.resolve(this.dispose);
  }

  private sendLanguageStatus(type: ClientState, message: string): void {
    const status = JSON.stringify({
      jsonrpc: '2.0',
      method: LANGUAGE_STATUS,
      params: {
        message,
        type,
      },
    });

    this.socket.send({
      data: `${contentLength}${CRLF}${CRLF}${Buffer.byteLength(status, 'utf-8')}${status}`,
    });
  }

  private sendMessageFromQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }
    const message = this.messageQueue.shift();
    this.tcpSocket.write(message);
  }

  private startConversion() {
    this.messageReader.listen((data) => {
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

  public dispose = () => {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);

    if (this._interval) {
      clearInterval(this._interval);
    }

    if (this.process) {
      kill(this.process.pid);
      this.process.kill('SIGHUP');
    }

    if (this.tcpSocket) {
      this.tcpSocket.destroy();
    }

    this.serviceManager.dispose(this.spaceKey);
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
    executable.args = [
      '--tcp',
      '-v',
      `--port=${this.port}`,
      `--log-file=${process.cwd()}/pyls-log.log`,
    ];

    this.executable = executable;
  }
}

export default PythonLanguageServer;
