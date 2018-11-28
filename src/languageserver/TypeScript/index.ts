import * as io from 'socket.io';
import * as cp from 'child_process';
import * as lsp from 'vscode-languageserver';
import * as rpc from 'vscode-ws-jsonrpc/lib';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import { ReadLine, createInterface } from 'readline';
import { uriToFilePath } from 'vscode-languageserver/lib/files';

import RequestQueueManager from './RequestQueueManager';
import { IDispose } from '../../types';
import AbstractLanguageServer from '../AbstractLanguageServer';
import LanguageServerManager from '../../LanguageServerManager';
import { TypescriptRequest } from './types';
import { CommandTypes, EventTypes } from '../../protocol';

export const WORKSPACE_EDIT_COMMAND = 'workspace-edit';

const completionKindsMapping: { [name: string]: lsp.CompletionItemKind } = {
  class: lsp.CompletionItemKind.Class,
  constructor: lsp.CompletionItemKind.Constructor,
  enum: lsp.CompletionItemKind.Enum,
  field: lsp.CompletionItemKind.Field,
  file: lsp.CompletionItemKind.File,
  function: lsp.CompletionItemKind.Function,
  interface: lsp.CompletionItemKind.Interface,
  keyword: lsp.CompletionItemKind.Keyword,
  method: lsp.CompletionItemKind.Method,
  module: lsp.CompletionItemKind.Module,
  property: lsp.CompletionItemKind.Property,
  reference: lsp.CompletionItemKind.Reference,
  snippet: lsp.CompletionItemKind.Snippet,
  text: lsp.CompletionItemKind.Text,
  unit: lsp.CompletionItemKind.Unit,
  value: lsp.CompletionItemKind.Value,
  variable: lsp.CompletionItemKind.Variable,
};

export function toPosition(location: any): lsp.Position {
  return {
    line: location.line - 1,
    character: location.offset - 1,
  };
}

function toTextEdit(edit: any): lsp.TextEdit {
  return {
    range: {
      start: toPosition(edit.start),
      end: toPosition(edit.end),
    },
    newText: edit.newText,
  };
}

function toTextDocumentEdit(change: any): lsp.TextDocumentEdit {
  return {
    textDocument: {
      uri: uriToFilePath(change.fileName),
      version: 0, // I don't know TODO what?
    },
    edits: change.textChanges.map(c => toTextEdit(c)),
  };
}

function toLocation(fileSpan: any): lsp.Location {
  return {
    uri: uriToFilePath(fileSpan.file),
    range: {
      start: toPosition(fileSpan.start),
      end: toPosition(fileSpan.end),
    },
  };
}

class TypeScriptLanguageServer extends AbstractLanguageServer {
  public type = Symbol('typescript');

  public destroyed: boolean = false;
  public messageReader: rpc.WebSocketMessageReader;
  public messageWriter: rpc.WebSocketMessageWriter;
  private websocket: rpc.IWebSocket;

  private readLine: ReadLine;

  private requestQueue: RequestQueueManager<TypescriptRequest>;

  private initializeParams: lsp.InitializeParams;

  private seq: number = 0;

  private openedDocumentUris: Map<string, lsp.TextDocument> = new Map<string, lsp.TextDocument>();

  constructor(public spaceKey: string, private socket: io.Socket) {
    super(
      spaceKey,
      TypeScriptLanguageServer.name,
      LanguageServerManager.getInstance(),
    );
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.serviceManager = LanguageServerManager.getInstance();
    this.logger.level = 'debug';

    this.requestQueue = new RequestQueueManager<TypescriptRequest>(
      (request: TypescriptRequest) => this._makeRequest(request),
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

    this.messageReader = new rpc.WebSocketMessageReader(this.websocket);
    this.messageWriter = new rpc.WebSocketMessageWriter(this.websocket);
    const connection = rpc.createMessageConnection(
      this.messageReader,
      this.messageWriter,
    );

    // const wsConnection = server.createConnection(this.messageReader, this.messageWriter, () => this.websocket.dispose());
    // const serverConnection = server.createServerProcess('ts', 'node_modules/typescript-language-server/lib/cli.js', ['--logLevel=4', '--stdio']);
    // server.forward(wsConnection, serverConnection, (message) => {
    //   if (rpc.isRequestMessage(message)) {
    //     if (message.method === lsp.InitializeRequest.type.method) {
    //       const initializeParams = message.params as lsp.InitializeParams;
    //       initializeParams.processId = process.pid;
    //     }
    //   }
    //   return message;
    // });

    connection.onRequest(
      new rpc.RequestType<lsp.InitializeParams, any, any, any>('initialize'),
      async (params, token) => {
        this.logger.info('Receive request initialize');
        this.initializeParams = params;
        const args: string[] = ['--logVerbosity', 'verbose'];
        this.process = cp.spawn('tsserver', args);
        this.readLine = createInterface({
          input: this.process.stdout,
          output: this.process.stdin,
          terminal: false,
        });

        this.readLine.addListener('line', this.lineReceived);
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
              commands: [WORKSPACE_EDIT_COMMAND],
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

    connection.onRequest(
      new rpc.RequestType<lsp.CodeActionParams, any, any, any>(
        'textDocument/codeAction',
      ),
      async (params) => {
        const { textDocument, range, context } = params;
        this.logger.info(`Receive request codeAction: ${textDocument.uri}`);
        if (!this.openedDocumentUris.get(textDocument.uri)) return [];
        const request = {
          file: uriToFilePath(textDocument.uri),
          startLine: range.start.line + 1,
          startOffset: range.start.character + 1,
          endLine: range.end.line + 1,
          endOffset: range.end.character + 1,
          errorCodes: context.diagnostics.map(d => d.code),
        };
        const result: any = await this.makeRequest(
          CommandTypes.GetCodeFixes,
          request,
        );
        if (!result.body) {
          return [];
        }

        const response = [];
        for (const fix of result.body) {
          response.push({
            title: fix.description,
            command: WORKSPACE_EDIT_COMMAND,
            arguments: [
              <lsp.WorkspaceEdit>{
                documentChanges: fix.changes.map(c => toTextDocumentEdit(c)),
              },
            ],
          });
        }
        return response;
      },
    );

    connection.onNotification(
      new rpc.NotificationType<lsp.DidOpenTextDocumentParams, void>(
        'textDocument/didOpen',
      ),
      async (params) => {
        const {
          textDocument: { uri, languageId, version, text },
        } = params;
        this.logger.info(`Receive textDocument/didOpen request: ${uri}`);
        if (!this.openedDocumentUris.get(uri)) {
          this.openedDocumentUris.set(
            uri,
            lsp.TextDocument.create(uri, languageId, version, text),
          );
          const path = uriToFilePath(uri);
          const request = {
            file: path,
            fileContent: text,
          };

          await this.makeRequest(CommandTypes.Open, request);

          await this.requestDiagnostics();
        } else {
          // @TODO didchange
        }
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/hover'),
      async (params) => {
        const { textDocument, position } = params;
        this.logger.info(`Receive textDocument/hover request: ${textDocument.uri}`);
        const path = uriToFilePath(textDocument.uri);
        const request = {
          file: path,
          line: position.line + 1,
          offset: position.character + 1,
        };
        const result: any = await this.makeRequest(CommandTypes.Quickinfo, request);
        // console.log(result);

        if (!result.body) {
          return {
            contents: [],
          };
        }

        const range = {
          start: toPosition(result.body.start),
          end: toPosition(result.body.end),
        };

        const contents: lsp.MarkedString[] = [
          { language: 'typescript', value: result.body.displayString },
        ];
        if (result.body.documentation) {
          contents.push(result.body.documentation);
        }
        return {
          contents,
          range,
        };
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/definition'),
      async (params) => {
        const { textDocument, position } = params;
        const path = uriToFilePath(textDocument.uri);
        this.logger.info(`Receive textDocument/definition request: ${path}`);
        const request = {
          file: path,
          line: position.line + 1,
          offset: position.character + 1,
        };
        const result: any = await this.makeRequest(CommandTypes.Definition, request);
        return result.body ? result.body.map(fileSpan => toLocation(fileSpan)) : [];
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/completion'),
      async (params) => {
        const { textDocument, position } = params;
        const path = uriToFilePath(textDocument.uri);
        this.logger.info(`Receive textDocument/completion request: ${path}`);

        const request = {
          file: path,
          line: position.line + 1,
          offset: position.character + 1,
          prefix: '',
          includeExternalModuleExports: true,
          includeInsertTextCompletions: true,
        };

        const response: any = await this.makeRequest(CommandTypes.Completions, request);
        return {
          isIncomplete: false,
          items: response.body ? response.body
            .map((item) => {
              return <lsp.CompletionItem>{
                label: item.name,
                kind: completionKindsMapping[item.kind],
                // store information for resolve
                data: {
                  file: path,
                  line: position.line + 1,
                  offset: position.character + 1,
                },
              };
            }) : [],
        };
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.CompletionItem, any, any, any>('completionItem/resolve'),
      async (params) => {
        const { label, data } = params;
        const request = {
          entryName: [label],
          file: data.file,
          line: data.file,
          offset: data.offset,
        };

        const response: any = await this.makeRequest(CommandTypes.CompletionDetails, request);

        if (!response.body) {
          return params;
        }

        if (response.body[0] && response.body[0].documentation) {
          params.documentation = response.body[0].documentation.map(i => i.text).join('\n');
        }
        return params;
      },
    );

    connection.onNotification(
      new rpc.NotificationType<lsp.DidChangeTextDocumentParams, void>('textDocument/didChange'),
      async (params) => {
        const { textDocument, contentChanges } = params;
        const path = uriToFilePath(textDocument.uri);
        this.logger.info(`Receive textDocument/didChange request: ${path}`);

        const document = this.openedDocumentUris.get(textDocument.uri);

        if (!document) {
          this.logger.error(`Received change on non-opened document ${textDocument.uri}`);
        }

        for (const change of contentChanges) {
          let line;
          let offset;
          let endLine;
          let endOffset = 0;
          if (!change.range) {
            line = 1;
            offset = 1;
            const endPos = document.positionAt(document.getText().length);
            endLine = endPos.line + 1;
            endOffset = endPos.character + 1;
          } else {
            line = change.range.start.line + 1;
            offset = change.range.start.character + 1;
            endLine = change.range.end.line + 1;
            endOffset = change.range.end.character + 1;
          }
          const request = {
            line,
            offset,
            endLine,
            endOffset,
            file: path,
            insertString: change.text,
          };
          this.makeRequest(CommandTypes.Change, request);
        }
        await this.requestDiagnostics();
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/references'),
      async (params) => {
        const { textDocument, position } = params;
        const path = uriToFilePath(textDocument.uri);

        this.logger.info(`Receive textDocument/references request: ${path}`);

        const request = {
          file: path,
          line: position.line + 1,
          offset: position.character + 1,
        };
        const response: any = await this.makeRequest(CommandTypes.References, request);

        if (!response.body) {
          return [];
        }

        return response.body.refs.map(fileSpan => toLocation(fileSpan));
      },
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/hightlight'),
      async (params) => {
        // @TODO
      },
    );

    socket.on('disconnect', this.dispose.bind(this));
    connection.listen();
  }

  private lineReceived = (line: string) => {
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
    if (!packet.type) {
      // Bogus packet
      return;
    }
    switch (packet.type) {
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
  /* tslint:disable */
  private _handleResponsePacket(packet) {
    this.logger.info(`Handler response: ${packet.command}`);
    const request = this.requestQueue.dequeue(
      packet.command,
      packet.request_seq
    );
    if (!request) {
      this.logger.error(
        `Received response for ${packet.command} but could not find request.`
      );
      return;
    }
    if (packet.success) {
      request.onSuccess(packet);
    } else {
      this.logger.error(packet.message);
      request.onError(packet.message || packet.body);
    }

    this.requestQueue.drain();
  }

  private requestDiagnostics(): Promise<any> {
    const files: string[] = [];
    // sort by least recently usage
    const orderedUris = [...this.openedDocumentUris.entries()]
      .sort((a, b) => a[1].version - b[1].version)
      .map(e => e[0]);
    for (const uri of orderedUris) {
      files.push(uriToFilePath(uri));
    }
    const args = {
      files,
      delay: 0,
    };
    return this.makeRequest(CommandTypes.Geterr, args);
  }

  private _handleEventPacket(packet) {
    if (packet.type === EventTypes.SementicDiag) {
      this.logger.info('Handler SementicDiag event.');
      console.log(packet);
    } else if (packet.type === EventTypes.SyntaxDiag) {
      this.logger.info('Handler SyntaxDiag event.');
    } else {
      this.logger.info(`Ignored event: ${packet.event}`);
    }
  }
  /* tslint:enable */
  public start(): Promise<IDispose> {
    return Promise.resolve(this.dispose);
  }

  public dispose = () => {
    this.destroyed = true;
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.serviceManager.dispose(this.spaceKey);
    if (this.process) {
      this.process.kill();
    }
  }

  public makeRequest<TResponse>(
    command: string,
    data?: any,
    token?: rpc.CancellationToken,
  ): Promise<TResponse> {
    if (!this.process) {
      const errMsg = 'server has been stopped or not started.';
      this.logger.error(errMsg);
      return Promise.reject<TResponse>(errMsg);
    }

    let startTime: number;
    let request: any;

    const promise = new Promise<TResponse>((resolve, reject) => {
      startTime = Date.now();
      request = {
        command,
        data,
        onSuccess: value => resolve(value),
        onError: (err) => {
          this.logger.error(`Receive error: ${err.message || err.body}`);
          resolve(err);
        },
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
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      // @todo
      return response;
    });
  }

  /* tslint:disable */
  public _makeRequest(request: TypescriptRequest): number {
    if (!this.process) {
      return;
    }
    this.seq = this.seq + 1;
    const requestPacket = {
      command: request.command,
      seq: this.seq,
      type: "request",
      arguments: request.data
    };
    // console.log(requestPacket);
    this.process.stdin.write(JSON.stringify(requestPacket) + "\n");
    return this.seq;
  }
}

export default TypeScriptLanguageServer;
