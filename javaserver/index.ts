import * as cp from 'child_process';
import * as io from 'socket.io';

import findJavaHome from '../utils/find-java-home';

import { LanguageServer } from '../interface';
import { IExecutable } from '../config';

class JavaLanguageServer {
  public type = Symbol('java');

  private executable: IExecutable;

  private process: cp.ChildProcess;

  constructor (
    private socket: io.Socket,
  ) {
    this.init();
  }

  private async init() {
    this.executable = await this.prepareExecutable();
  }

  public start(): void {
    this.process = cp.spawn(this.executable.command, this.executable.args);
    // todo
  }

  private async prepareExecutable(): Promise<IExecutable> {
    const executable = Object.create(null);
    const options = Object.create(null);
    options.env = process.env;
    options.stdio = 'pipe';
    executable.options = options;
    executable.command = await findJavaHome() + '/bin/java';
    executable.args = params;
    return executable;
  }
}
