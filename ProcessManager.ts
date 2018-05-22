import * as net from 'net';
import * as cp from 'child_process';

import getPort from './getPort';

export default class ProcessManager {
  private processList: Array<cp.ChildProcess>
  constructor () {
    this.processList = [];
  }

  get count(): number {
    return this.processList.length;
  }
  /**
   * 
   * @param process ChildProcess
   */
  public addProcess(process: cp.ChildProcess) {
    this.processList.push(process);
    const length = this.processList.length;
    console.warn(`current process list has ${length} process`);
  }
  /**
   * 
   * @param pid process ID
   */
  public kill (pid: number) {
    const process = this.processList.find((p) => p.pid === pid);
    if (process) {
      process.kill();
      this.processList = this.processList.filter((p) => p.pid !== pid);
      const length = this.processList.length;
      console.warn(`current process list has ${length} process`);
      return true;
    }
    return false;
  }

  /**
   * kill all ChildProcess
   */
  public killAll() {
    for (let i = 0; i < this.processList.length; i += 1) {
      this.kill(this.processList[i].pid);
    }
  }
}
