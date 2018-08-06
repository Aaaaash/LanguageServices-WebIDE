import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

/* tslint:disable */
import DebugAdapter from '../index';
/* tslint:enable */
import JavaDebugContext from './JavaDebugContext';
// import protocolRequests from '../../debugProtocol/requests';
import ConfigurationDoneRequestHandler from './ConfigurationDoneRequestHandler';
import InitializeRequestHandler from './InitializeRequestHandler';
import LaunchRequestHandler from './LaunchRequestHandler';
import SetBreakpointRequestHandler from './SetBreakpointRequestHandler';

const commands = [
  { command: 'configurationDone', handle: ConfigurationDoneRequestHandler },
  { command: 'initialize', handle: InitializeRequestHandler },
  { command: 'launch', handle: LaunchRequestHandler },
  { command: 'setBreakpoint', handle: SetBreakpointRequestHandler },
];

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
    // this.webSocket.on('data', this.handleWsMessage);
  }

  public registerRequestHandler() {
    this.initContext();
    commands.forEach((command) => {
      this.webSocket.on(command.command, (data: any) => {
        const handler = new command.handle(this.debugContext);
        handler.handle(data);
      });
    });
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
