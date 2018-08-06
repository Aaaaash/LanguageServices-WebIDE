import IDebugAdapter from './IDebugAdapter';

export default interface IProtocolServer {
  type: string;
  getPort: () => number;
  start: () => void;
  stop: () => void;
}
