import * as io from 'socket.io';
import * as log4js from 'log4js';
import * as cp from 'child_process';
import * as path from 'path';
import * as vscodeUri from 'vscode-uri';
import * as rpc from 'vscode-ws-jsonrpc/lib';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import * as lsp from 'vscode-languageserver';

import { ReadLine, createInterface } from 'readline';
import { removeBOMFromString, removeBOMFromBuffer } from '../utils/removeBOM';
import * as requests from '../jsonrpc/csharpRequests';
import { ILanguageServer, IDispose } from '../types';
import LanguageServerManager from '../LanguageServerManager';
import findMonoPath from '../utils/findMonoPath';
import RequestQueueManager from '../jsonrpc/RequestQueueManager';
import {
  getDocumentationString,
  DocumentationComment,
  AutoCompleteRequest,
  Request,
  applyEdits,
  getPosition,
  extractSummaryText,
  GoToDefinitionResponse,
  MetadataResponse,
  QuickFixResponse,
  CodeElement,
  ReferencesCodeLens,
  FormatRangeResponse,
  TextChange,
} from '../protocol/TextDocument';

export function sum<T>(arr: T[], selector: (item: T) => number): number {
  return arr.reduce((prev, curr) => prev + selector(curr), 0);
}

/** Retrieve the length of an array. Returns 0 if the array is `undefined`. */
export function safeLength<T>(arr: T[] | undefined) {
  return arr ? arr.length : 0;
}

function createRequest<T extends Request>(
  document: lsp.TextDocument,
  where: any,
  includeBuffer: boolean = false,
): T {
  const line: number = where.start ? where.start.line : where.line;
  const column: number = where.end ? where.end.line : where.character;
  const fileUri = vscodeUri.default.parse(document.uri);
  const uriFileName = fileUri.fsPath;
  const fileName = fileUri.scheme === 'omnisharp-metadata' ?
        `${fileUri.authority}${uriFileName.replace('[metadata] ', '')}` :
        uriFileName;

  return <T>{
    Line: line + 1,
    Column: column + 1,
    Buffer: includeBuffer ? document.getText() : undefined,
    FileName: fileName,
  };
}

/* tslint:disable */
export module SymbolPropertyNames {
  export const Accessibility = 'accessibility';
  export const Static = 'static';
  export const TestFramework = 'testFramework';
  export const TestMethodName = 'testMethodName';
}
export module SymbolRangeNames {
  export const Attributes = 'attributes';
  export const Full = 'full';
  export const Name = 'name';
}


const filteredSymbolNames: { [name: string]: boolean } = {
  'Equals': true,
  'Finalize': true,
  'GetHashCode': true,
  'ToString': true,
};

/* tslint:enable */

function createUri(sourceName: string) : vscodeUri.default {
  return vscodeUri.default.parse('omnisharp-metadata' + '://' +
    sourceName.replace(/\\/g, '').replace(/(.*)\/(.*)/g, '$1/[metadata] $2'));
}

function toLocationFromUri(uri, location: any) {
  const position = lsp.Position.create(location.Line, location.Column);
  const endLine = location.EndLine;
  const endColumn = location.EndColumn;

  if (endLine !== undefined && endColumn !== undefined) {
    const endPosition = lsp.Position.create(endLine, endColumn);
    return lsp.Location.create(uri, lsp.Range.create(position, endPosition));
  }
  return lsp.Location.create(uri, lsp.Range.create(position, position));
}

function toRange(rangeLike: any) {
  const { Line, Column, EndLine, EndColumn } = rangeLike;
  const start = lsp.Position.create(Line, Column);
  const end = lsp.Position.create(EndLine, EndColumn);
  return lsp.Range.create(start, end);
}

function walkCodeElements(
  elements: CodeElement[],
  action: (element: CodeElement, parentElement?: CodeElement,
) => void) {
  function walker(elements: CodeElement[], parentElement?: CodeElement) {
    for (const element of elements) {
      action(element, parentElement);

      if (element.Children) {
        walker(element.Children, element);
      }
    }
  }

  walker(elements);
}

function isValidElementForReferencesCodeLens(element: CodeElement): boolean {
  if (element.Kind === 'namespace') {
    return false;
  }

  if (element.Kind === 'method' && filteredSymbolNames[element.Name]) {
    return false;
  }

  return true;
}

function isValidMethodForTestCodeLens(element: CodeElement): boolean {
  if (element.Kind !== 'method') {
    return false;
  }

  if (!element.Properties ||
    !element.Properties[SymbolPropertyNames.TestFramework] ||
    !element.Properties[SymbolPropertyNames.TestMethodName]) {
    return false;
  }

  return true;
}

function createCodeLensesForElement(
  element: CodeElement,
  fileName: string,
): lsp.CodeLens[] {
  const results: lsp.CodeLens[] = [];

  if (isValidElementForReferencesCodeLens(element)) {
    const range = element.Ranges['name'];
    if (range) {
      results.push(new ReferencesCodeLens(range, fileName));
    }
  }

  return results;
}

function createCodeLenses(elements: CodeElement[], fileName: string): any[] {
  const result: lsp.CodeLens[] = [];
  walkCodeElements(elements, (element) => {
    const codeLenses = createCodeLensesForElement(element, fileName);
    result.push(...codeLenses);
  });
  return result.map(codelen => ({
    data: [
      fileName,
      {
        line: codelen.range.start.line,
        character: codelen.range.start.character,
      },
      'references',
    ],
    range: codelen.range,
  }));
}

function asEditOptionation(change: TextChange): lsp.TextEdit {
  const start = lsp.Position.create(change.StartLine - 1, change.StartColumn - 1);
  const end = lsp.Position.create(change.EndLine - 1, change.EndColumn - 1);
  return lsp.TextEdit.replace(lsp.Range.create(start, end), change.NewText);
}

const commitCharactersWithoutSpace = [
  '{', '}', '[', ']', '(', ')', '.', ',', ':',
  ';', '+', '-', '*', '/', '%', '&', '|', '^', '!',
  '~', '=', '<', '>', '?', '@', '#', '\'', '\"', '\\'];

const allCommitCharacters = [
  ' ', '{', '}', '[', ']', '(', ')', '.', ',', ':',
  ';', '+', '-', '*', '/', '%', '&', '|', '^', '!',
  '~', '=', '<', '>', '?', '@', '#', '\'', '\"', '\\'];
/* tslint:disable */
const _kinds: { [kind: string]: lsp.CompletionItemKind; } = Object.create(null);
/* tslint:enable */

// types
_kinds['Class'] = lsp.CompletionItemKind.Class;
_kinds['Delegate'] = lsp.CompletionItemKind.Class; // need a better option for this.
_kinds['Enum'] = lsp.CompletionItemKind.Enum;
_kinds['Interface'] = lsp.CompletionItemKind.Interface;
_kinds['Struct'] = lsp.CompletionItemKind.Struct;

// variables
_kinds['Local'] = lsp.CompletionItemKind.Variable;
_kinds['Parameter'] = lsp.CompletionItemKind.Variable;
_kinds['RangeVariable'] = lsp.CompletionItemKind.Variable;

// members
_kinds['Const'] = lsp.CompletionItemKind.Constant;
_kinds['EnumMember'] = lsp.CompletionItemKind.EnumMember;
_kinds['Event'] = lsp.CompletionItemKind.Event;
_kinds['Field'] = lsp.CompletionItemKind.Field;
_kinds['Method'] = lsp.CompletionItemKind.Method;
_kinds['Property'] = lsp.CompletionItemKind.Property;

// other stuff
_kinds['Label'] = lsp.CompletionItemKind.Unit; // need a better option for this.
_kinds['Keyword'] = lsp.CompletionItemKind.Keyword;
_kinds['Namespace'] = lsp.CompletionItemKind.Module;

class CsharpLanguageServer implements ILanguageServer {
  private SERVER_HOME = 'lsp-csharp-server';

  public type = Symbol('csharp');

  /* tslint:disable */
  private _nextId = 1;

  private openedDocumentUris: Map<string, lsp.TextDocument> = new Map<string, lsp.TextDocument>();

  private openedMetadataResponses: Map<string, string> = new Map<string, string>();

  private logger: log4js.Logger = log4js.getLogger('CsharpLanguageServer');

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
            textDocumentSync: 2,
            completionProvider: {
              // resolveProvider: true,
              triggerCharacters: ['.', '@', '#'],
            },
            codeLensProvider: {
              resolveProvider: true,
            },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: '}',
              moreTriggerCharacter: [';'],
            },
            documentHighlightProvider: true,
            documentRangeFormattingProvider: true,
            //documentSymbolProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['('],
            },
            workspaceSymbolProvider: true,
            extended: {
              getCodeActionsProvider: true,
              runCodeActionProvider: true,
              implementationProvider: true,
              navigateProvider: true,
              highlightProvider: true,
            },
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

    interface ICodeActionsResponse {
      CodeActions: lsp.Command[];
    }

    connection.onRequest(
      new rpc.RequestType<lsp.CodeActionParams, any, any, any>('textDocument/codeAction'),
      async (params): Promise<lsp.Command[]> => {
        const { textDocument: { uri }, range } = params;
        const selection = {
          Start: { Line: range.start.line, Column: range.start.character },
          End: { Line: range.end.line, Column: range.end.character },
        };
        const filePath = lsp.Files.uriToFilePath(uri);
        const request = {
          FileName: filePath,
          Line: range.start.line,
          Column: range.end.character,
          Selection: selection,
        };
        const { CodeActions } = await this.makeRequest<ICodeActionsResponse>(requests.GetCodeActions, request);
        return CodeActions;
      });

    connection.onNotification(
      new rpc.NotificationType<lsp.DidOpenTextDocumentParams, void>('textDocument/didOpen'),
      async (params) => {
        const { textDocument: { uri, text, version, languageId } } = params;
        this.openedDocumentUris.set(uri, lsp.TextDocument.create(uri, languageId, version, text));
        this.logger.info(`Receive textDocument/didOpen request: ${uri}`);
        const source  = new rpc.CancellationTokenSource();
        const filePath = lsp.Files.uriToFilePath(uri);
        await this.makeRequest(requests.UpdateBuffer, { FileName: filePath, Buffer: text });
        const reuslt = await this.makeRequest(requests.CodeCheck, { FileName: filePath }, source.token);
        return reuslt;
      });

      interface IHoverResult {
        Documentation: string | null;
        Type: string;
        StructuredDocumentation: DocumentationComment;
      }
    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/hover'),
      async (params) => {
        const { textDocument: { uri }, position } = params;
        this.logger.info(`Receive textDocument/hover rquest: ${uri}`);
        const lspDocument = this.openedDocumentUris.get(uri);
        const filePath = lsp.Files.uriToFilePath(uri);
        const request = {
          FileName: filePath,
          Buffer: lspDocument.getText(),
          Line: position.line,
          Column: position.character,
        };
        const source = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<IHoverResult>(requests.TypeLookup, request, source.token);
        if (result && result.Type) {
          const documentation = getDocumentationString(result.StructuredDocumentation);
          const contents = [documentation, { language: 'csharp', value: result.Type}];
          return <lsp.Hover>{
            contents,
          };
        }
      });

    connection.onRequest(
      new rpc.RequestType<lsp.CompletionParams, any, any, any>('textDocument/completion'),
      async (params) => {
        const { textDocument: { uri }, position, context } = params;
        const lspDocument = this.openedDocumentUris.get(uri);
        
        this.logger.info(`Receive textDocument/completion rquest: ${uri}`);
        const { line, character } = position;
        const lspPosition = lsp.Position.create(line, character);
        const range = lsp.Range.create(lspPosition, lspPosition);
        const wordToComplete = lspDocument.getText(range) || '';
        this.logger.debug(`wordToComplete ${wordToComplete}`);
        const req = createRequest<AutoCompleteRequest>(lspDocument, position);
        const request: AutoCompleteRequest = {
          ...req,
          WordToComplete: wordToComplete,
          WantDocumentationForEveryCompletionResult: true,
          WantKind: true,
          WantReturnType: true,
          WantImportableTypes: true,
          // WantMethodHeader: true,
          WantSnippet: true,
          TriggerCharacter: '.',
        };
        if (context.triggerKind === 1) {
          req.TriggerCharacter = context.triggerCharacter;
        }
        const responses = await this.makeRequest(requests.AutoComplete, request);
        if (!responses) {
          return [];
        }

        let result: lsp.CompletionItem[] = [];
        let completions: { [c: string]: { items: lsp.CompletionItem[], preselect : boolean } } = Object.create(null);
        // transform AutoCompleteResponse to CompletionItem and
        // group by code snippet
        for (let response of responses as Array<any>) {
            let completion = lsp.CompletionItem.create(response.CompletionText);

            completion.detail = response.ReturnType
                ? `${response.ReturnType} ${response.DisplayText}`
                : response.DisplayText;

            completion.documentation = extractSummaryText(response.Description);
            completion.kind = _kinds[response.Kind] || lsp.CompletionItemKind.Property;
            completion.insertText = response.CompletionText.replace(/<>/g, '');

            completion.commitCharacters = response.IsSuggestionMode
                ? commitCharactersWithoutSpace
                : allCommitCharacters;

            completion.preselect = response.Preselect;

            let completionSet = completions[completion.label];
            if (!completionSet) {
                completions[completion.label] = { items: [completion], preselect: completion.preselect };
            }
            else {
                completionSet.preselect = completionSet.preselect  || completion.preselect;
                completionSet.items.push(completion);
            }
        }

        // per suggestion group, select on and indicate overloads
        for (let key in completions) {

            let suggestion = completions[key].items[0],
                overloadCount = completions[key].items.length - 1;

            if (overloadCount === 0) {
                // remove non overloaded items
                delete completions[key];

            }
            else {
                // indicate that there is more
                suggestion.detail = `${suggestion.detail} (+ ${overloadCount} overload(s))`;
                suggestion.preselect = completions[key].preselect;
            }

            result.push(suggestion);
        }

        // for short completions (up to 1 character), treat the list as incomplete
        // because the server has likely witheld some matches due to performance constraints
        return lsp.CompletionList.create(result, wordToComplete.length > 1 ? false : true);
      }
    )

    connection.onNotification(
      new rpc.NotificationType<lsp.DidChangeTextDocumentParams, void>('textDocument/didChange'),
      async (params) => {
        const { contentChanges, textDocument: { uri, version } } = params;
        this.logger.info(`Receive textDocument/didChange rquest: ${uri}`);
        const filePath = lsp.Files.uriToFilePath(uri);
        const lspDocument = this.openedDocumentUris.get(uri);
        const afterDocument = applyEdits(lspDocument.getText(), contentChanges.map(e => {
          const range = e.range || lsp.Range.create(lsp.Position.create(0, 0), getPosition(e.rangeLength || 0));
          return lsp.TextEdit.replace(range, e.text);
        }));
        this.openedDocumentUris.set(uri, lsp.TextDocument.create(uri, lspDocument.languageId, version, afterDocument));
        const request = {
          Buffer: afterDocument,
          Filename: filePath,
        };

        const result = await this.makeRequest(requests.UpdateBuffer, request);
      }
    );

    interface ICodeLens {
      Elements: any;
    }
  
    connection.onRequest(
      new rpc.RequestType<lsp.CodeLensParams, any, any, any>('textDocument/codeLens'),
      async (params) => {
        const { textDocument: { uri } } = params;
        const filePath = lsp.Files.uriToFilePath(uri);
        const result = await this.makeRequest<ICodeLens>(requests.CodeStructure, { FileName: filePath });
        if (result && result.Elements) {
          return createCodeLenses(result.Elements, filePath);
        }
        return [];
      }
    );

    connection.onRequest(
      new rpc.RequestType<lsp.CodeLens, any, any, any>('codeLens/resolve'),
      async (params) => {
        const { data, range } = params;
        if (!data || !data[1].line || !data[1].character) {
          return;
        }
        const fileName = data[0].startsWith('/') ? data[0] : '';
        const request = {
          FileName: fileName,
          Line: data[1].line,
          Column: data[1].character,
          OnlyThisFile: false,
          ExcludeDefinition: true,
        };
        const result = await this.makeRequest<QuickFixResponse>(requests.FindUsages, request);
        if (!result || !result.QuickFixes) {
          return;
        }
        const quickFixes = result.QuickFixes;
        const count = quickFixes.length;
        return {
          range,
          data,
          command: {
            title: count === 1 ? '1 references' : `${count} references`,
            command: 'editor.actions.showReferences',
            arguments: [
              fileName,
              range.start,
              quickFixes.map((quickfix) => {
                return toLocationFromUri(quickfix.FileName, quickfix);
              }),
            ],
          },
        };
      }
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/definition'),
      async (params) => {
        const { textDocument, position } = params;
        this.logger.info(`Receive textDocument/definition rquest: ${textDocument.uri}`);
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = createRequest(lspDocument, position);
        const result = await this.makeRequest<GoToDefinitionResponse>(requests.GoToDefinition, { ...request, WantMetadata: true });
        this.logger.info(`gotoDefinition response`);
        console.log(result);
        if (result && result.FileName) {

          if (result.FileName.startsWith('$metadata$')) {
            const uri = createUri(result.FileName);
            return toLocationFromUri(uri.toString(), result);
          }
          const fileName = vscodeUri.default.file(result.FileName);
          const response = toLocationFromUri(fileName.toString(), result);
          return response;
        } else if (result.MetadataSource) {
          const metadataSource = result.MetadataSource;
          const metadataResponse =  await this.makeRequest<MetadataResponse>(requests.Metadata, {
            Timeout: 5000,
            AssemblyName: metadataSource.AssemblyName,
            VersionNumber: metadataSource.VersionNumber,
            ProjectName: metadataSource.ProjectName,
            Language: metadataSource.Language,
            TypeName: metadataSource.TypeName
          });
          if (!metadataResponse || !metadataResponse.Source || !metadataResponse.SourceName) {
            return;
          }
          const uri = createUri(metadataResponse.SourceName);
          this.openedMetadataResponses.set(metadataResponse.SourceName, metadataResponse.Source);
          const position = lsp.Position.create(result.Line - 1, result.Column - 1);
          const location = lsp.Location.create(uri.toString(), lsp.Range.create(position, position));
          return location;
        }
      }
    );

    connection.onRequest(
      new rpc.RequestType<any, any, any, any>('omnisharp/metadata'),
      async (params) => {
        const { uri } = params;
        return this.openedMetadataResponses.get(uri) || '';
      }
    );

    connection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>('textDocument/documentHighlight'),
      async (params) => {
        const { textDocument, position } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = {
          ...createRequest(lspDocument, position),
          OnlyThisFile: true,
          ExcludeDefinition: false,
        };
        
        const cancelToken = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<QuickFixResponse>(requests.FindUsages, request, cancelToken.token);
        if (result && Array.isArray(result.QuickFixes)) {
          return result.QuickFixes.map((quickFix) => lsp.DocumentHighlight.create(toRange(quickFix)))
        }
        return [];
      }
    );

    connection.onRequest(
      new rpc.RequestType<lsp.ReferenceParams, any, any, any>('textDocument/references'),
      async (params) => {
        const { textDocument, position, context } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = {
          ...createRequest(lspDocument, position),
          OnlyThisFile: true,
          ExcludeDefinition: false,
        }

        const cancelToken = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<QuickFixResponse>(requests.FindUsages, request, cancelToken.token);

        if (result && Array.isArray(result.QuickFixes)) {
          return result.QuickFixes.map((location) => {
            const uri = vscodeUri.default.file(location.FileName);
            return toLocationFromUri(uri.toString(), location);
          });
        }
      }
    );
    connection.onRequest(
      new rpc.RequestType<lsp.DocumentFormattingParams, any, any, any>('textDocument/formatting'),
        async (params) => {
        const { textDocument, options } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const lineCount = lspDocument.lineCount;
        const filePath = lsp.Files.uriToFilePath(textDocument.uri);
        const request = {
          FileName: filePath,
          Line: 1,
          Column: 1,
          EndLine: lineCount,
          EndColumn: 1,
          WantsTextChanges: true,
        };
        const result = await this.makeRequest<FormatRangeResponse>(requests.CodeFormat, request);
        if (result && Array.isArray(result.Changes)) {
          return result.Changes.map(asEditOptionation)
        }
      }
    );

    connection.onRequest(
      new rpc.RequestType<lsp.DocumentRangeFormattingParams, any, any, any>
      ('textDocument/rangeFormatting'),
      async (params) => {
        const { textDocument, range } = params;
        const filePath = lsp.Files.uriToFilePath(textDocument.uri);
        const request = {
          FileName: filePath,
          Line: range.start.line + 1,
          Column: range.start.character + 1,
          EndLine: range.end.line + 1,
          EndColumn: range.end.character + 1,
          WantsTextChanges: true,
        };

        const result = await this.makeRequest<FormatRangeResponse>(requests.CodeFormat, request);
        if (result && Array.isArray(result.Changes)) {
          return result.Changes.map(asEditOptionation)
        }
      }
    );

    connection.onClose(() => this.dispose());
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
      `/data/coding-ide-home/workspace/${this.spaceKey}/working-dir`,
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
    this.serverProcess = cp.spawn(executable, args);
    this.logger.info(`CSharp lsp is running:${executable} ${args.join(' ')}`);
    this.makeRequest(requests.Projects)
      .then((response: any) => {
        if (response.DotNet && response.DotNet.Projects.length > 0) {
          this.logger.info(`
            DotNet projects count: ${response.DotNet.Projects.length}
          `);
          this.logger.info(`
            DotNet projects file count: ${sum(response.DotNet.Projects, (p : any) => safeLength(p.SourceFiles))}
          `);
        }

        if (response.MsBuild && response.MsBuild.Projects.length > 0) {
          this.logger.info(`
            MsBuild projects count: ${response.MsBuild.Projects.length}
          `);
          this.logger.info(`
            MsBuild projects file count: ${sum(response.MsBuild.Projects, (p: any) => safeLength(p.SourceFiles))}
          `);
          // @TODO
        }
      });
    this.readLine = createInterface({
      input: this.serverProcess.stdout,
      output: this.serverProcess.stdin,
      terminal: false,
    });

    this.readLine.addListener('line', this.lineReceived);

    this.serverProcess.on('error', (err) => {
      this.logger.error(`Error: ${err.message}`);
    });
  
    this.serverProcess.stderr.on('data', (data: Buffer) => {
      let trimData = removeBOMFromBuffer(data);
      this.logger.error(`Error: ${trimData}`);
    });

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
