import IRequestHandler from '../../debugProtocol/IRequestHandler';
import IDebugContext from '../../debugProtocol/IDebugContext';

export default class ConfigurationDoneRequestHandler implements IRequestHandler {
  public command = 'configurationDone';

  constructor(public debugContext: IDebugContext) {}

  public initialize() {

  }

  public handle(...arg: any[]): void {
    // @TODO
  }
}
