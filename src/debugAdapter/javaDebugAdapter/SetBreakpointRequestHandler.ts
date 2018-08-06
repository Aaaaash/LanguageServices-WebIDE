import IRequestHandler from '../../debugProtocol/IRequestHandler';
import IDebugContext from '../../debugProtocol/IDebugContext';

export default class SetBreakpointRequestHandler implements IRequestHandler {
  public command = 'setBreakpoint';

  constructor(public debugContext: IDebugContext) {}

  public initialize() {

  }

  public handle(...args: any[]): void {
    // @TODO
  }
}
