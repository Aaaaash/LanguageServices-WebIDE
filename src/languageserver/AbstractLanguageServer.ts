import * as log4js from 'log4js';
import * as cp from 'child_process';
import * as net from 'net';

import { IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';

export abstract class AbstractLanguageServer {
  public logger: log4js.Logger;

  public type: Symbol;

  public destroyed: boolean;

  /* tslint:disable */
  public _interval?: NodeJS.Timer;
  /* tslint:enable */

  public process: cp.ChildProcess = null;

  public tcpSocket: net.Socket;

  constructor (
    public spaceKey: string,
    className: string,
    public serviceManager?: LanguageServerManager,
  ) {
    this.logger = log4js.getLogger(className);
    this.logger.level = 'debug';
    this.logger.info(`Initialize ${className}...`);
  }

  abstract start(): Promise<IDispose>;

  public dispose = () => {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.serviceManager.dispose(this.spaceKey);
    if (this.process) {
      this.process.kill();
    }
  }
}

export default AbstractLanguageServer;
