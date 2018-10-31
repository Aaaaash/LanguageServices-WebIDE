import * as io from 'socket.io';

import { ILanguageServer, IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';

class TypeScriptLanguageServer extends ILanguageServer {
  public type = Symbol('typescript');

  public destroyed: boolean = false;

  constructor (public spaceKey: string, private socket: io.Socket) {
    super(spaceKey, LanguageServerManager.getInstance());
  }

  public start(): Promise<IDispose> {
    return Promise.resolve(this.dispose);
  }

  public dispose = () => {

  }
}

export default TypeScriptLanguageServer;
