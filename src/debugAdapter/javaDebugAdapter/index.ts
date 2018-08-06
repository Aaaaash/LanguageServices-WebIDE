import * as net from 'net';
import * as io from 'socket.io';
import JavaDebugAdapter from './JavaDebugAdapter';
import IDebugAdapter from '../../debugProtocol/IDebugAdapter';

import { SocketMessageReader } from '../../jsonrpc/messageReader';
import { SocketMessageWriter } from '../../jsonrpc/messageWriter';

class ProtocolServer {
  public type: string = 'java';

  public debugAdapter: JavaDebugAdapter;

  public messageReader: SocketMessageReader;
  public messageWriter: SocketMessageWriter;

  constructor(
    public port: number,
    public webSocket: io.Socket,
    public socket: net.Socket,
  ) {
    this.debugAdapter = new JavaDebugAdapter(port, webSocket, socket);
    this.messageReader = new SocketMessageReader(socket);
    this.messageWriter = new SocketMessageWriter(socket);
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

export default ProtocolServer;
