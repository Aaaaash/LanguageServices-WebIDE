import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

/* tslint:disable */
import JavaDebugServer from './javaDebugAdapter';
/* tslint:enab;e */
import IDebugServer from '../debugProtocol/IDebugServer';

class DebugAdapter {
  protected logger: log4js.Logger = log4js.getLogger('DebugAdapter');

  public socket: net.Socket;

  private debugServer: IDebugServer;
  constructor(
    private port: number,
    private webSocket: io.Socket,
  ) {
    this.socket = net.createConnection({ port: this.port }, () => {
      this.debugServer = new JavaDebugServer(this.port, this.webSocket, this.socket);
      this.debugServer.start();
    });

    this.socket.on('error', (err) => {
      this.logger.error(err.message || err);
    });
  }
}

export default DebugAdapter;
