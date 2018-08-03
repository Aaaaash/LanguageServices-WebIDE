import * as net from 'net';
import * as io from 'socket.io';

import IDebugContext from '../../debugProtocol/IDebugContext';

export default class JavaDebugContext implements IDebugContext {
  constructor(
    public socket: net.Socket,
    public type: string,
    public webSocket: io.Socket,
  ) {}
}
