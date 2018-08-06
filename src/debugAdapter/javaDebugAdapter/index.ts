import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

import JavaDebugAdapter from './JavaDebugAdapter';
import IDebugAdapter from '../../debugProtocol/IDebugAdapter';

import { SocketMessageReader } from '../../jsonrpc/messageReader';
import { SocketMessageWriter } from '../../jsonrpc/messageWriter';

class JavaProtocolServer {
  private logger: log4js.Logger = log4js.getLogger('JavaProtocolServer');
  public type: string = 'java';

  public debugAdapter: JavaDebugAdapter;

  public messageReader: SocketMessageReader;
  public messageWriter: SocketMessageWriter;

  constructor(
    public port: number,
    public webSocket: io.Socket,
    public socket: net.Socket,
  ) {
    this.messageReader = new SocketMessageReader(socket);
    this.messageWriter = new SocketMessageWriter(socket);
    this.debugAdapter = new JavaDebugAdapter(
      port,
      webSocket,
      this.messageReader,
      this.messageWriter,
    );

    this.messageReader.listen((data) => {
      this.logger.info(data.toString());
    });
  }

  getPort = () => this.port;

  public start = () => {
    this.debugAdapter.registerRequestHandler();
    this.webSocket.emit('connect', 'success');
    // @TODO
  }

  public stop = () => {
    this.webSocket.disconnect();
    this.socket.destroy();
    // @TODO
  }
}

export default JavaProtocolServer;
