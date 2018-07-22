import * as cp from 'child_process';
import * as io from 'socket.io';
import * as glob from 'glob';
import * as log4js from 'log4js';
import { ILanguageServer, IDispose } from '../types';

class PythonLanguageServer implements ILanguageServer {
  
  public type = Symbol('python');

  public async start(): Promise<IDispose> {
    return this.dispose;
  }

  public dispose() {

  }
}

export default PythonLanguageServer;
