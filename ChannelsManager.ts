import SocketChannel from './SocketChannel';

export default class ChannelsManager {
  channels: any[]
  constructor () {
    this.channels = [];
  }

  public hasWs = (spaceKey: string): boolean => {
    // return this.channels.find();
  }

  public add = (channel: SocketChannel) => {
    this.channels.push(channel);
  }

  public leave = (spaceKey: string) => {
    this.channels = this.channels.filter((c) => c.spaceKey !== spaceKey);
  }
}

