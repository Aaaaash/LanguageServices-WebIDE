import { Socket } from "net";
import * as WebSocket from 'ws';
interface IConnect {
  id: string;
  connect: WebSocket;
}
export default class SocketChannels {
  connections: Array<any>
  spaceKey: string;
  constructor (spaceKey: string) {
    this.connections = [];
    this.spaceKey = spaceKey;
  }

  public join = (connect: IConnect) => {
    this.connections.push(connect);
  }

  public leave = (id) => {
    this.connections = this.connections.filter((c: IConnect) => c.id !== id);
    if (this.connections.length === 0) {
      this.destroy();
    }
  }

  public hasConnect = (id: string): boolean => {
    return !!this.connections.filter((c: IConnect) => c.id === id);
  }
  public destroy = () => {
    //TODO
  }
}
