import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

/* tslint:disable */
import DebugAdapter from '../index';
/* tslint:enable */
import JavaDebugContext from './JavaDebugContext';
// import protocolCommands from '../../debugProtocol/commands';
// import protocolRequests from '../../debugProtocol/requests';

class JavaDebugAdapter {
  public type: string = 'java';

  protected logger: log4js.Logger = log4js.getLogger('JavaDebugAdapter');

  public debugContext: JavaDebugContext;

  constructor(
    private port: number,
    private webSocket: io.Socket,
    private socket: net.Socket,
  ) {
    this.logger.level = 'debug';
    this.registerRequestHandler();
  }

  private registerRequestHandler() {
    // TODO

    this.initContext();
  }

  private handleRequest() {

  }

  public dispatchRequest() {

  }

  public initContext() {
    this.debugContext = new JavaDebugContext(this.socket, this.type, this.webSocket);
  }
}

export default JavaDebugAdapter;
