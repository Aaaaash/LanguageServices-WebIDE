import * as io from 'socket.io';
import * as cp from 'child_process';
import * as readline from 'readline';
import * as lsp from 'vscode-languageserver';

import { contentLength, CRLF } from '../config';
import { IDispose } from '../types';
import AbstractLanguageServer from './AbstractLanguageServer';
import LanguageServerManager from '../LanguageServerManager';
import { WebSocketMessageReader } from '../jsonrpc/messageReader';
import { WebSocketMessageWriter } from '../jsonrpc/messageWriter';
import findTsserverHome from '../utils/findTsserverHome';
import { Commands } from '../protocol';

class TypeScriptLanguageServer extends AbstractLanguageServer {
  public type = Symbol('typescript');

  public destroyed: boolean = false;

  public websocketMessageReader: WebSocketMessageReader;
  public websocketMessageWriter: WebSocketMessageWriter;

  constructor (public spaceKey: string, private socket: io.Socket) {
    super(spaceKey, TypeScriptLanguageServer.name, LanguageServerManager.getInstance());
    this.websocketMessageReader = new WebSocketMessageReader(this.socket);
    this.websocketMessageWriter = new WebSocketMessageWriter(this.socket);
    socket.on('disconnect', this.dispose.bind(this));
  }

  public async start(): Promise<IDispose> {
    const tsserverPath = await this.prepareExexutable();
    this.logger.info(`command: ${tsserverPath.join(' ')}`);
    this.process = cp.spawn(tsserverPath.join(' '));
    this.logger.info('TypeScript Language Server is running.');

    this.startCoversion();

    this.process.on('exit', (code: number, signal: string) => {
      this.logger.info(`tsserver exit, code: ${code}, signal: ${signal}`);
      this.dispose();
    });
    return Promise.resolve(this.dispose);
  }

  startCoversion(): any {

    const readlineInterface = readline.createInterface(
      this.process.stdout, this.process.stdin, undefined,
    );

    readlineInterface.on('line', (line: string) => {
      const messageString = line.trim();
      if (!messageString.startsWith('Content-Length')) {
        console.log(messageString);
      }
    });

    this.websocketMessageReader.listen((data) => {
      const params = JSON.parse(data.message.split('\r\n').pop());
      console.log(data.message);
      if (params.method === 'initialize') {
        this.onInitialize(params);
      }
    });
    this.process.on('data', (data) => {
      console.log(data.toString());
    });
  }
  onInitialize(params: any): void {
    const result = JSON.stringify({
      jsonrpc: '2.0',
      id: params.id,
      result: {
        capabilities: {
          textDocumentSync: lsp.TextDocumentSyncKind.Incremental,
          completionProvider: {
            triggerCharacters: ['.', '"', '\'', '/', '@', '<'],
            resolveProvider: true,
          },
          codeActionProvider: true,
          definitionProvider: true,
          documentFormattingProvider: true,
          documentHighlightProvider: true,
          documentSymbolProvider: true,
          executeCommandProvider: {
            commands: [
              Commands.APPLY_WORKSPACE_EDIT,
              Commands.APPLY_CODE_ACTION,
              Commands.APPLY_REFACTORING,
              Commands.ORGANIZE_IMPORTS,
              Commands.APPLY_RENAME_FILE,
            ],
          },
          hoverProvider: true,
          renameProvider: true,
          referencesProvider: true,
          signatureHelpProvider: {
            triggerCharacters: ['(', ',', '<'],
          },
          workspaceSymbolProvider: true,
          implementationProvider: true,
          typeDefinitionProvider: true,
          foldingRangeProvider: true,
        },
      },
    });
    const header: string[] = [
      contentLength,
      Buffer.byteLength(result, 'utf-8').toString(),
      CRLF,
      CRLF,
    ];
    this.websocketMessageWriter.write({ data: `${header.join('')}${result}` });
  }

  async prepareExexutable(): Promise<string[]> {
    try {
      const tsserverPath = await findTsserverHome();
      return Promise.resolve([tsserverPath]);
    } catch (e) {
      this.logger.error(e.message || 'Tserver could not be located');
    }
  }

  public dispose = () => {

  }
}

export default TypeScriptLanguageServer;
