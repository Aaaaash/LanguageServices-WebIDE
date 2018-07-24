import * as cp from 'child_process';
import * as io from 'socket.io';
import * as glob from 'glob';
import * as log4js from 'log4js';
import { ILanguageServer, IDispose, IExecutable } from '../types';

class PythonLanguageServer implements ILanguageServer {

  private SERVER_HOME = 'lsp-python-server';

  public type = Symbol('python');

  private logger: log4js.Logger = log4js.getLogger('PythonLanguageServer');

  private executable: IExecutable;

  private process: cp.ChildProcess;

  private spaceKey: string;

  public async start(): Promise<IDispose> {
    await this.prepareExecutable();
    this.process = cp.spawn('pyls', ['-vv']);
    return this.dispose;
  }

  public dispose() {

  }

  private prepareExecutable() {

  }

}

export default PythonLanguageServer;
