import IDebugAdapter from './IDebugAdapter';

export default interface IProtocolServer {
  type: string;
  debugAdapter: IDebugAdapter;
  getPort: () => number;
  start: () => void;
  stop: () => void;
}
