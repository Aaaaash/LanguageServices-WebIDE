import IRequestHandler from '../../debugProtocol/IRequestHandler';
import IDebugContext from '../../debugProtocol/IDebugContext';

export default class LaunchRequestHandler implements IRequestHandler {
  public command = 'launch';

  constructor(public debugContext: IDebugContext) {}

  public initialize() {

  }

  public handle(...args: any[]): void {
    // @TODO
  }
}
