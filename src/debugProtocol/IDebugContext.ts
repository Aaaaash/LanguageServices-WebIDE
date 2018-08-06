import * as net from 'net';
import * as io from 'socket.io';

export default interface IDebugContext {
  socket: net.Socket;
  webSocket: io.Socket;
  type: string;
  seq: number;
  [prop: string]: any;
}
