import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

/* tslint:disable */
import DebugAdapter from '../index';
/* tslint:enable */
// import protocolCommands from '../../debugProtocol/commands';
// import protocolRequests from '../../debugProtocol/requests';

class JavaDebugAdapter extends DebugAdapter {
  public type: string = 'java';

  protected logger: log4js.Logger = log4js.getLogger('JavaDebugAdapter');

  constructor(
    port: number,
    private webSocket: io.Socket,
  ) {
    super(port);
    this.logger.level = 'debug';
    this.registerRequestHandler();
  }

  private registerRequestHandler() {
    // TODO
  }

  private handleRequest() {

  }
}

export default JavaDebugAdapter;
