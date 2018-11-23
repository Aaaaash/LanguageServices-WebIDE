import * as io from 'socket.io';
import * as log4js from 'log4js';
import * as cp from 'child_process';
import * as path from 'path';
import * as rpc from 'vscode-ws-jsonrpc/lib';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import * as lsp from 'vscode-languageserver/lib/main';
import { ReadLine, createInterface } from 'readline';

import { removeBOMFromString, removeBOMFromBuffer } from '../utils/removeBOM';
import * as requests from '../jsonrpc/csharpRequests';
import { IExecutable, ILanguageServer, IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';
import findMonoPath from '../utils/findMonoPath';
import RequestQueueManager from '../jsonrpc/RequestQueueManager';
import { LspDocument } from '../protocol/TextDocument';

class CsharpLanguageServer implements ILanguageServer {
  private SERVER_HOME = 'lsp-csharp-server';

  public type = Symbol('csharp');

  /* tslint:disable */
  private _nextId = 1;

  private openedDocumentUris: Map<string, LspDocument> = new Map<string, LspDocument>();

  private logger: log4js.Logger = log4js.getLogger('CsharpLanguageServer');

  private executable: IExecutable;

  private process: cp.ChildProcess;

  private servicesManager: LanguageServerManager;

  private serverProcess: cp.ChildProcess;

  private spaceKey: string;

  private socket: io.Socket;

  private websocket: rpc.IWebSocket;

  public destroyed: boolean = false;

  public requestQueue: RequestQueueManager;
  public messageReader: rpc.WebSocketMessageReader;
  public messageWriter: rpc.WebSocketMessageWriter;

  public serverConnection: server.IConnection;

  private readLine: ReadLine;

  constructor(spaceKey: string, socket: io.Socket) {
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.servicesManager = LanguageServerManager.getInstance();
    this.logger.level = 'debug';
    this.requestQueue = new RequestQueueManager(
      (request: requests.CsharpLSPRequest) => this._makeRequest(request),
    );
    this.websocket = {
      send: content =>
        this.socket.send(content, (error) => {
          if (error) {
            throw error;
          }
        }),
      onMessage: cb =>
        this.socket.on('message', (data) => {
          cb(data.message);
        }),
      onError: cb => this.socket.on('error', cb),
      onClose: cb => this.socket.on('close', cb),
      dispose: () => this.socket.disconnect(),
    };

    this.messageReader = new rpc.WebSocketMessageReader(
      this.websocket,
    );
    this.messageWriter = new rpc.WebSocketMessageWriter(
      this.websocket,
    );
    const logger = new rpc.ConsoleLogger();
    const connection = rpc.createMessageConnection(
      this.messageReader,
      this.messageWriter,
      logger,
    );
    connection.onRequest(
      new rpc.RequestType<any, any, any, any>('initialize'),
      (params, token) => {
        this.logger.info('Receive request initialize');
        return {
          capabilities: {
            textDocumentSync: lsp.TextDocumentSyncKind.Incremental,
            completionProvider: {
              triggerCharacters: ['.'],
              resolveProvider: true,
            },
            codeActionProvider: true,
            definitionProvider: true,
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            executeCommandProvider: {
              commands: ['WORKSPACE_EDIT_COMMAND'],
            },
            hoverProvider: true,
            renameProvider: true,
            referencesProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ','],
            },
            workspaceSymbolProvider: true,
          },
        };
      },
    );

    // connection.onRequest(
    //   new rpc.RequestType<any, any, any, any>('textDocument/didOpen'),
    //   (params) => {
    //     console.log(params);
    //     return {};
    //   });

    type CodeActionResult = {
      CodeActions: lsp.Command[];
    };

    connection.onRequest(
      new rpc.RequestType<lsp.CodeActionParams, any, any, any>('textDocument/codeAction'),
      async (params): Promise<lsp.Command[]> => {
        const { textDocument: { uri }, range } = params;
        const selection = {
          Start: { Line: range.start.line, Column: range.start.character },
          End: { Line: range.end.line, Column: range.end.character },
        };
        const request = {
          FileName: uri.split('/').pop(),
          Line: range.start.line,
          Column: range.end.character,
          Selection: selection,
        };
        // lsp.CodeAC
        const result = await this.makeRequest<CodeActionResult>(requests.GetCodeActions, request);
        return result.CodeActions;
      });

    connection.onNotification(
      new rpc.NotificationType<lsp.DidOpenTextDocumentParams, void>('textDocument/didOpen'),
      async (params) => {
        const { textDocument: { uri } } = params;
        this.openedDocumentUris.set(uri, new LspDocument(params.textDocument));
        this.logger.info(`Receive textDocument/didOpen request: ${uri}`);
        const fileName = uri.split('/').pop();
        const source  = new rpc.CancellationTokenSource();
        return await this.makeRequest(requests.CodeCheck, { FileName: fileName }, source.token);
      });

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/hover'),
      async (params) => {
        const { textDocument: { uri }, position } = params;
        this.logger.info(`Receive textDocument/hover rquest: ${uri}`);
        const lspDocument = this.openedDocumentUris.get(uri);
        const request = {
          FileName: uri.split('/').pop(),
          Buffer: lspDocument.text,
          Line: position.line,
          Column: position.character,
        };
        const source = new rpc.CancellationTokenSource();
        return await this.makeRequest(requests.TypeLookup, request, source.token);
      });

    this.start();
    this.websocket.onClose(() => this.dispose());
    connection.listen();
  }

  public async start(): Promise<IDispose> {
    const executable = await this.resolveExecutable();
    const args = [
      path.resolve(
        __dirname,
        '../../csharp-lsp/.omnisharp/1.32.8/omnisharp/OmniSharp.exe',
      ),
      '-s',
      '/Users/sakura/Documents/coding/csharp-language-server-protocol/LSP.sln',
      '--hostPID',
      process.pid.toString(),
      '--stdio',
      'DotNet:enablePackageRestore=false',
      '--edcoding',
      'utf-8',
      '--loglevel',
      'infomation',
      '--plugin',
      path.resolve(
        __dirname,
        '../../csharp-lsp/.razor/OmniSharpPlugin/Microsoft.AspNetCore.Razor.OmniSharpPlugin.dll',
      ),
    ];
    this.serverProcess = cp.spawn('mono', args);

    this.readLine = createInterface({
      input: this.serverProcess.stdout,
      output: this.serverProcess.stdin,
      terminal: false,
    });

    this.readLine.addListener('line', this.lineReceived);
    // this.serverConnection = server.createServerProcess('csharp-lsp', 'mono', args);
    // this.serverConnection.reader.listen(this.onServerReceive);
    // // this.serverConnection.reader.onPartialMessage((data) => {
    // //   console.log(data);
    // // });
    // this.serverConnection.reader.onError((err) => {
    //   console.log(err);
    // });
    // this.serverConnection.writer.onError((err) => {
    //   console.log(err);
    // });
    return Promise.resolve(this.dispose);
  }

  private lineReceived = (lineString: string) => {
    const line = removeBOMFromString(lineString);
    if (line[0] !== '{') {
      return;
    }

    let packet;
    try {
      packet = JSON.parse(line);
    } catch (err) {
      // This isn't JSON
      return;
    }

    if (!packet.Type) {
      // Bogus packet
      return;
    }
    switch (packet.Type) {
      case 'response':
        this._handleResponsePacket(packet);
        break;
      case 'event':
        this._handleEventPacket(packet);
        break;
      default:
        this.logger.error(`Unknown packet type: ${packet.Type}`);
        break;
    }
  }

  private _handleResponsePacket(packet) {
    const request = this.requestQueue.dequeue(packet.Command, packet.Request_seq);

    if (!request) {
      this.logger.error(`Received response for ${packet.Command} but could not find request.`);
      return;
    }

    this.logger.info(`handleResponse: ${packet.Command} (${packet.Request_seq})`);

    if (packet.Success) {
      request.onSuccess(packet.Body);
    } else {
      request.onError(packet.Message || packet.Body);
    }

    this.requestQueue.drain();
  }

  private _handleEventPacket (packet) {
    if (packet.Event === 'log') {
      // this.logger.info(packet.Body.Message);
    } else {
      // this._fireEvent(packet.Event, packet.Body);
    }
  }

  public async resolveExecutable(): Promise<string> {
    const monopath = await findMonoPath();
    const ominisharpPath = path.resolve(
      __dirname,
      '../../csharp-lsp/.omnisharp/1.32.8/omnisharp/OmniSharp.exe',
    );
    return Promise.resolve(monopath);
  }

  public dispose() {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.servicesManager.dispose(this.spaceKey);
    this.serverProcess.kill();
  }

  public makeRequest<TResponse> (
    command: string,
    data?: any,
    token?: rpc.CancellationToken,
  ) :Promise<TResponse> {
    if (!this.serverProcess) {
      const errMsg = 'server has been stopped or not started.';
      this.logger.error(errMsg);
      return Promise.reject<TResponse>(errMsg);
    }

    let startTime: number;
    let request: requests.CsharpLSPRequest;

    const promise = new Promise<TResponse>((resolve, reject) => {
      startTime = Date.now();
      request = {
        command,
        data,
        onSuccess: (value) => {
          resolve(value);
        },
        onError: err => reject(err),
      };

      this.requestQueue.enqueue(request);
    });

    if (token) {
      token.onCancellationRequested(() => {
        this.logger.info(`Cancel request: ${request.command}`);
        this.requestQueue.cancelRequest(request);
      });
    }

    return promise.then((response) => {
      let endTime = Date.now();
      let elapsedTime = endTime - startTime;
      // this.
      // @todo
      return response;
    });
  }

  /* tslint:disable */
  public _makeRequest(request: requests.CsharpLSPRequest): number {
    if (!this.serverProcess) {
      return;
    }
    const id = this._nextId += 1;
    const requestPacket = {
      Type: 'request',
      Seq: id,
      Command: request.command,
      Arguments: request.data,
    };
    this.serverProcess.stdin.write(JSON.stringify(requestPacket) + '\n');
    return id;
  }
}

export default CsharpLanguageServer;
