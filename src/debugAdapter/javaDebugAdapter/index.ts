import * as net from 'net';
import * as io from 'socket.io';
import JavaDebugAdapter from './JavaDebugAdapter';
import IDebugAdapter from '../../debugProtocol/IDebugAdapter';

class ProtocolServer {
  public type: string = 'java';

  public debugAdapter: IDebugAdapter;
  constructor(
    public port: number,
    public webSocket: io.Socket,
    public socket: net.Socket,
  ) {
    this.debugAdapter = new JavaDebugAdapter(port, webSocket, socket);
  }

  getPort = () => this.port;

  public start = () => {
    // @TODO
  }

  public stop = () => {
    // @TODO
  }
}

export default ProtocolServer;
