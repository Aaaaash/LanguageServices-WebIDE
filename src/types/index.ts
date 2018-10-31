import * as io from 'socket.io';
import * as log4js from 'log4js';
import * as cp from 'child_process';
import * as net from 'net';
import * as kill from 'tree-kill';

import LanguageServerManager from '../LanguageServerManager';

export type IExecutable = {
  options: any;
  command: string;
  args: string[];
};

export interface ILanguageServerConstructor {
  new (spaceKey: string, socket: io.Socket): ILanguageServer;
}

export abstract class ILanguageServer {
  public logger: log4js.Logger = log4js.getLogger(ILanguageServer.name);

  public type: Symbol;

  public destroyed: boolean;

  /* tslint:disable */
  public _interval?: NodeJS.Timer;
  /* tslint:enable */

  public process: cp.ChildProcess = null;

  public tcpSocket: net.Socket;

  constructor (public spaceKey: string, public serviceManager?: LanguageServerManager) {}

  abstract start(): Promise<IDispose>;

  public dispose = () => {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.serviceManager.dispose(this.spaceKey);
    this.process.kill();
  }
}

// export type LanguageServer = typeof

export type LanguageServerProfile<T extends ILanguageServer> = {
  language: string;
  server: T;
};

export interface IDispose {
  (): void;
}
