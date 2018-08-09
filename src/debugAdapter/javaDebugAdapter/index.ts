import * as net from 'net';
import * as io from 'socket.io';
import * as log4js from 'log4js';

import requests from '../../debugProtocol/requests';
import { SocketMessageReader } from '../../jsonrpc/messageReader';
import { contentLength, CRLF } from '../../config';

class JavaProtocolServer {
  private logger: log4js.Logger = log4js.getLogger('JavaProtocolServer');
  public type: string = 'java';

  public messageReader: SocketMessageReader;

  public commands: any[];

  public seq: number = 0;
  constructor(
    public port: number,
    public webSocket: io.Socket,
    public socket: net.Socket,
  ) {
    this.messageReader = new SocketMessageReader(socket);

    this.messageReader.listen((data) => {
      this.webSocket.emit('message', JSON.stringify(data));
    });

    this.commands = [
      { type: 'request', handle: this.requestHandler },
      { type: 'response', handle: this.responseHandler },
      { type: 'event', handle: this.eventHandler },
    ];
  }

  getPort = () => this.port;

  public start = () => {
    this.registerMessageHandler();
    this.webSocket.emit('connect', 'success');
    // @TODO
  }

  public stop = () => {
    this.webSocket.disconnect();
    this.socket.destroy();
    // @TODO
  }

  public registerMessageHandler() {
    this.webSocket.on('message', (params) => {
      const deserialiParams = JSON.parse(params);
      this.commands.forEach((handler) => {
        if (deserialiParams.type === handler.type) {
          this.logger.info(
            `Receive ${requests.REQUEST}`,
          );
          handler.handle(params);
        }
      });
    });
  }

  public requestHandler = (request): void => {
    const length = Buffer.byteLength(request, 'utf-8');
    const jsonrpc = [contentLength, length, CRLF, CRLF, request];
    this.logger.info(jsonrpc.join(''));
    this.socket.write(jsonrpc.join(''));
  }

  public responseHandler = (response): void => {
    // @TODO
  }

  public eventHandler = (event): void => {
    // @TODO
  }
}

export default JavaProtocolServer;
