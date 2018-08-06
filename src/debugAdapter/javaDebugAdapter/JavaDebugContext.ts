import * as net from 'net';
import * as io from 'socket.io';

import IDebugContext from '../../debugProtocol/IDebugContext';

import { SocketMessageReader } from '../../jsonrpc/messageReader';
import { SocketMessageWriter } from '../../jsonrpc/messageWriter';

export default class JavaDebugContext implements IDebugContext {
  /* tslint:disable */
  private seq: number = 0;
  /* tslint:enable */
  constructor(
    public messageReader: SocketMessageReader,
    public messageWriter: SocketMessageWriter,
    public type: string,
    public webSocket: io.Socket,
  ) {
  }

  getSeq (): number {
    this.seq += 1;
    return this.seq;
  }
}
