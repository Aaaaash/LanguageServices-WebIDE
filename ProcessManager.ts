import * as net from 'net';
import * as cp from 'child_process';

export interface IProcess {
  spacekey: string;
  process: cp.ChildProcess;
}
export default class ProcessManager {
  private processList: Array<IProcess>
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
  public addProcess(process: IProcess) {
    this.processList.push(process);
    const length = this.processList.length;
    console.warn(`current process list has ${length} process`);
  }

  public getProcessByws(spacekey: string): IProcess {
    return this.processList.find((p) => p.spacekey === spacekey);
  }
  /**
   * 
   * @param pid process ID
   */
  public kill (spacekey: string): boolean {
    const iprocess = this.processList.find((p) => p.spacekey === spacekey);
    if (iprocess) {
      console.log('process is find');
      iprocess.process.kill();
      this.processList = this.processList.filter((p) => p.spacekey !== spacekey);
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
      this.kill(this.processList[i].spacekey);
    }
  }
}
