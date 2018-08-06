import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

import JavaDebugAdapter from './JavaDebugAdapter';
import IDebugAdapter from '../../debugProtocol/IDebugAdapter';
import { SocketMessageReader } from '../../jsonrpc/messageReader';
import { SocketMessageWriter } from '../../jsonrpc/messageWriter';
import { contentLength, CRLF } from '../../config';

class JavaProtocolServer {
  private logger: log4js.Logger = log4js.getLogger('JavaProtocolServer');
  public type: string = 'java';

  public messageReader: SocketMessageReader;
  public messageWriter: SocketMessageWriter;

  public commands: any[];

  public seq: number = 0;
  constructor(
    public port: number,
    public webSocket: io.Socket,
    public socket: net.Socket,
  ) {
    this.messageReader = new SocketMessageReader(socket);
    this.messageWriter = new SocketMessageWriter(socket);

    this.messageReader.listen((data) => {
      this.logger.info(data.toString());
    });

    this.commands = [
      { command: 'configurationDone', handle: this.configurationDoneRequestHandler },
      { command: 'initialize', handle: this.initializeRequestHandler },
      { command: 'launch', handle: this.launchRequestHandler },
      { command: 'setBreakpoint', handle: this.setBreakpointRequestHandler },
    ];
  }

  getPort = () => this.port;

  public start = () => {
    this.registerRequestHandler();
    this.webSocket.emit('connect', 'success');
    // @TODO
  }

  public stop = () => {
    this.webSocket.disconnect();
    this.socket.destroy();
    // @TODO
  }

  public registerRequestHandler() {
    this.commands.forEach((command) => {
      this.webSocket.on(command.command, params => command.handle(command, params));
    });
  }

  public configurationDoneRequestHandler() {

  }

  public initializeRequestHandler(command, params): void {
    /* tslint:disable */
    const request = JSON.stringify({
      command,
      arguments: params,
      seq: this.seq++,
      type: 'request',
    });
    /* tslint:enable */
    const length = Buffer.byteLength(request, 'utf-8');
    const jsonrpc = [contentLength, length, CRLF, CRLF, request];
    this.messageWriter.write({
      jsonrpc: jsonrpc.join(''),
    });
    this.logger.info(`Receive request: ${command}\r\nparams: ${jsonrpc.join('')}`);
  }

  public launchRequestHandler() {

  }

  public setBreakpointRequestHandler() {

  }
}

export default JavaProtocolServer;
