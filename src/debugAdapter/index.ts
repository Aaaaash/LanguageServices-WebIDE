import * as net from 'net';
import * as log4js from 'log4js';

import { SocketMessageReader } from '../jsonrpc/messageReader';
import { SocketMessageWriter } from '../jsonrpc/messageWriter';

abstract class DebugAdapter {

  public type: string;

  protected logger: log4js.Logger = log4js.getLogger('DebugAdapter');

  private socket: net.Socket;

  private messageReader: SocketMessageReader;
  private messageWriter: SocketMessageWriter;

  constructor(
    private port: number,
  ) {
    this.initServer();
  }

  public initServer() {
    this.socket = net.createConnection({ port: this.port }, () => {
      this.logger.info(`Connect ${this.type} Debugger.`);
      this.messageReader = new SocketMessageReader(this.socket);
      this.messageWriter = new SocketMessageWriter(this.socket);
      this.messageReader.listen(this.handleResponse);
    });

    this.socket.on('error', (err) => {
      this.logger.error(err.message || err);
    });
  }

  private handleResponse(data) {
    console.log(data);
  }
}

export default DebugAdapter;
