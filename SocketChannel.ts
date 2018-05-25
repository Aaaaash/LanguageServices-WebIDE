import * as io from 'socket.io';
import * as cp from 'child_process';

import handleMessageIO from './handleMessageIO';
import { processManager, channelsManager } from './languageServer';
export default class SocketChannel {
  connections: Array<io.Socket>
  constructor (public spaceKey: string, public lspProcess: cp.ChildProcess) {
    console.log(`langserver launch for ${spaceKey}`);
    this.connections = [];
  }

  public join = (connect: io.Socket) => {
    if (this.hasConnect(connect.id)) return;
    this.connections.push(connect);
    this.initMessageReader(connect);
    connect.on('disconnect', () => {
      this.connections = this.connections.filter((c) => c.id !== connect.id);
      console.log('socket is disconnect');
      connect.removeAllListeners();
      if (this.connections.length === 0) {
        console.log('all process will be kill');
        processManager.kill(this.spaceKey);
        channelsManager.leave(this.spaceKey);
      }
    });
  }

  private initMessageReader = (connect: io.Socket) => {
    handleMessageIO(connect, this.lspProcess);
  }

  public getClient = (id: string): io.Socket => {
    return this.connections.find((c: io.Socket) => c.id === id);
  }

  public leave = (id) => {
    this.connections = this.connections.filter((c: io.Socket) => c.id !== id);
    if (this.connections.length === 0) {
      this.destroy();
    }
  }

  public hasConnect = (id: string): boolean => {
    return !!this.connections.find((c: io.Socket) => c.id === id);
  }

  public destroy = () => {
    //TODO
  }
}
