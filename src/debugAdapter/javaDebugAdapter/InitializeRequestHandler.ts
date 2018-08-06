import IRequestHandler from '../../debugProtocol/IRequestHandler';
import IDebugContext from '../../debugProtocol/IDebugContext';

export default class InitializeRequestHandler implements IRequestHandler {
  public command: string = 'initialize';

  constructor(public debugContext: IDebugContext) {}

  public initialize() {

  }

  public handle(...args: any[]): void {
    console.log(args);
  }
}
