import IDebugContext from './IDebugContext';

export default interface IRequestHandler {
  readonly command: string;
  debugContext: IDebugContext;
  initialize: (...arg: any[]) => void;
  handle: (...arg: any[]) => void;
}
