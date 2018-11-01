import * as io from 'socket.io';

import { IDispose } from '../types';
import AbstractLanguageServer from './AbstractLanguageServer';
import LanguageServerManager from '../LanguageServerManager';

class TypeScriptLanguageServer extends AbstractLanguageServer {
  public type = Symbol('typescript');

  public destroyed: boolean = false;

  constructor (public spaceKey: string, private socket: io.Socket) {
    super(spaceKey, TypeScriptLanguageServer.name, LanguageServerManager.getInstance());
  }

  public start(): Promise<IDispose> {
    return Promise.resolve(this.dispose);
  }

  public dispose = () => {

  }
}

export default TypeScriptLanguageServer;
