import * as net from 'net';
import * as io from 'socket.io';

import IDebugContext from '../../debugProtocol/IDebugContext';

export default class JavaDebugContext implements IDebugContext {
  /* tslint:disable */
  private _seq: number;
  /* tslint:enable */
  constructor(
    public socket: net.Socket,
    public type: string,
    public webSocket: io.Socket,
  ) {
  }

  get seq (): number {
    return this._seq += 1;
  }
}
