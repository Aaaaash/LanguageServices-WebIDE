import IDebugContext from './IDebugContext';

export default interface IDebugAdapter {
  debugContext: IDebugContext;
  dispatchRequest: (any) => any;
}
