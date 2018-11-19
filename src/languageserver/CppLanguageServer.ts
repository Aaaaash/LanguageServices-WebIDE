import * as cp from 'child_process';
import * as io from 'socket.io';

import AbstractLanguageServer from './AbstractLanguageServer';
import { contentLength, CRLF } from '../config';
import { IExecutable, IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';
import { WebSocketMessageReader } from '../jsonrpc/messageReader';
import { WebSocketMessageWriter } from '../jsonrpc/messageWriter';
import findCppLanguageSercerHome from '../utils/findCppLanguageSercerHome';
import { StreamMessageReader } from 'vscode-jsonrpc';

class CppLanguageServer extends AbstractLanguageServer {
  private SERVER_HOME = 'cppRuntimeDependencies';
  public type = Symbol('cpp');
  private socket: io.Socket;
  private executeable: IExecutable;

  public websocketMessageReader: WebSocketMessageReader;
  public websocketMessageWriter: WebSocketMessageWriter;
  constructor(spaceKey: string, socket: io.Socket) {
    super(spaceKey, CppLanguageServer.name, LanguageServerManager.getInstance());
    this.socket = socket;
    this.websocketMessageReader = new WebSocketMessageReader(this.socket);
    this.websocketMessageWriter = new WebSocketMessageWriter(this.socket);
    socket.on('disconnect', this.dispose.bind(this));
  }

  public async start(): Promise<IDispose> {
    const cppServerModule = this.prepareExecutable();
    this.logger.info(`Cpp Executable is ready.`);

    this.logger.info(`command: ${cppServerModule}`);
    try {
      this.process = cp.spawn(cppServerModule);
      this.logger.info('Cpp Language Servcer is running.');

      this.startCoversion();

      this.process.on('exit', (code: number, signal: string) => {
        this.logger.info(`Cpp lsp is exit, code: ${code}, signal: ${signal}`);
        this.dispose();
      });
      return Promise.resolve(this.dispose);
    } catch (err) {
      this.logger.error(`
        Start LLVM failed, reason: ${err.message}
        ${err.stack}
      `);
    }
  }

  private startCoversion() {
    const messageReader = new StreamMessageReader(this.process.stdout);
    this.websocketMessageReader.listen((data) => {
      this.process.stdin.write(data.message);
    });

    messageReader.listen((data) => {
      const jsonrpcData = JSON.stringify(data);
      const length = Buffer.byteLength(jsonrpcData, 'utf-8');
      const headers: string[] = [
        contentLength,
        length.toString(),
        CRLF,
        CRLF,
      ];
      this.websocketMessageWriter.write({ data: `${headers.join('')}${jsonrpcData}` });
    });
  }

  prepareExecutable() {
    const cppServerModule = findCppLanguageSercerHome();
    return cppServerModule;
  }
}

export default CppLanguageServer;
