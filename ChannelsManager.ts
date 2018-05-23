import SocketChannel from './SocketChannel';

export default class ChannelsManager {
  channels: Array<SocketChannel>;
  constructor () {
    this.channels = [];
  }

  public hasWs = (spaceKey: string): boolean => {
    return !!this.channels.find((c: SocketChannel) => c.spaceKey === spaceKey);
  }

  public add = (channel: SocketChannel) => {
    this.channels.push(channel);
  }

  public findChannels = (spacekey: string): SocketChannel => {
    return this.channels.find((c: SocketChannel) => c.spaceKey === spacekey);
  }

  public leave = (spaceKey: string) => {
    this.channels = this.channels.filter((c) => c.spaceKey !== spaceKey);
  }
}
