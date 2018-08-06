import * as net from 'net';
import * as io from 'socket.io';

import { SocketMessageReader } from '../jsonrpc/messageReader';
import { SocketMessageWriter } from '../jsonrpc/messageWriter';

export default interface IDebugContext {
  messageReader: SocketMessageReader;
  messageWriter: SocketMessageWriter;
  type: string;
  seq: number;
  [prop: string]: any;
}
