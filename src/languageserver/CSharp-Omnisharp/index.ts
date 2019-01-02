import * as io from 'socket.io';
import * as cp from 'child_process';
import * as path from 'path';
import * as vscodeUri from 'vscode-uri';
import * as rpc from 'vscode-ws-jsonrpc/lib';
import * as server from 'vscode-ws-jsonrpc/lib/server';
import * as lsp from 'vscode-languageserver';
import { EventEmitter } from 'events';
import { debounce } from 'lodash';

import { ReadLine, createInterface } from 'readline';
import {
  removeBOMFromString,
  removeBOMFromBuffer,
} from '../../utils/removeBOM';
import * as requests from './types';
import { IDispose } from '../../types';
import LanguageServerManager from '../../LanguageServerManager';
import { findMonoHome, findRazor } from '../../utils/findMonoPath';
import RequestQueueManager from './RequestQueueManager';
import {
  _kinds,
  commitCharactersWithoutSpace,
  allCommitCharacters,
} from './protocol';
import {
  getDocumentationString,
  DocumentationComment,
  AutoCompleteRequest,
  applyEdits,
  getPosition,
  extractSummaryText,
  GoToDefinitionResponse,
  MetadataResponse,
  QuickFixResponse,
  QuickFix,
  FormatRangeResponse,
  SignatureHelp,
} from '../../protocol/TextDocument';
import AbstractLanguageServer from '../AbstractLanguageServer';
import * as events from './envents';
import {
  sum,
  safeLength,
  createRequest,
  createCodeLenses,
  toLocationFromUri,
  createUri,
  toRange,
  asEditOptionation,
  getParameterDocumentation,
} from './helpers';

class CsharpLanguageServer extends AbstractLanguageServer {
  type: Symbol;
  private SERVER_HOME = 'lsp-csharp-server';

  public type = Symbol('csharp');

  /* tslint:disable */
  private _nextId = 1;

  private openedDocumentUris: Map<string, lsp.TextDocument> = new Map<
    string,
    lsp.TextDocument
  >();

  private openedMetadataResponses: Map<string, string> = new Map<
    string,
    string
  >();

  private servicesManager: LanguageServerManager;

  private serverProcess: cp.ChildProcess;

  public spaceKey: string;

  private socket: io.Socket;

  private websocket: rpc.IWebSocket;

  public destroyed: boolean = false;

  private rootPath: string;

  public requestQueue: RequestQueueManager<requests.CsharpLSPRequest>;
  public messageReader: rpc.WebSocketMessageReader;
  public messageWriter: rpc.WebSocketMessageWriter;

  public serverConnection: server.IConnection;
  public clientConnection: rpc.MessageConnection;
  private readLine: ReadLine;

  private eventBus = new EventEmitter();
  private disposes = [];

  private firstUpdateProject: boolean = true;

  private projectValidation: rpc.CancellationTokenSource;

  constructor(spaceKey: string, socket: io.Socket) {
    super(spaceKey, CsharpLanguageServer.name);
    this.spaceKey = spaceKey;
    this.socket = socket;
    this.servicesManager = LanguageServerManager.getInstance();
    this.logger.level = "debug";
    this.requestQueue = new RequestQueueManager(
      (request: requests.CsharpLSPRequest) => this._makeRequest(request)
    );
    this.websocket = {
      send: content =>
        this.socket.send(content, error => {
          if (error) {
            throw error;
          }
        }),
      onMessage: cb =>
        this.socket.on("message", data => {
          cb(data.message);
        }),
      onError: cb => this.socket.on("error", cb),
      onClose: cb => this.socket.on("disconnect", cb),
      dispose: () => this.socket.disconnect()
    };

    this.messageReader = new rpc.WebSocketMessageReader(this.websocket);
    this.messageWriter = new rpc.WebSocketMessageWriter(this.websocket);
    const logger = new rpc.ConsoleLogger();
    this.clientConnection = rpc.createMessageConnection(
      this.messageReader,
      this.messageWriter,
      logger
    );
    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.InitializeParams, any, any, any>("initialize"),
      (params, token) => {
        const { rootPath } = params;
        this.logger.info("Receive request initialize");
        this.rootPath = rootPath;
        this.start();
        return {
          capabilities: {
            textDocumentSync: 2,
            completionProvider: {
              // resolveProvider: true,
              triggerCharacters: [".", "@", "#"]
            },
            codeLensProvider: {
              resolveProvider: true
            },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: "}",
              moreTriggerCharacter: [";"]
            },
            documentHighlightProvider: true,
            documentRangeFormattingProvider: true,
            //documentSymbolProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ["("]
            },
            workspaceSymbolProvider: true,
            extended: {
              getCodeActionsProvider: true,
              runCodeActionProvider: true,
              implementationProvider: true,
              navigateProvider: true,
              highlightProvider: true
            }
          }
        };
      }
    );

    interface ICodeActionsResponse {
      CodeActions: lsp.Command[];
    }

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.CodeActionParams, any, any, any>(
        "textDocument/codeAction"
      ),
      async (params): Promise<lsp.Command[]> => {
        const {
          textDocument: { uri },
          range
        } = params;
        const selection = {
          Start: { Line: range.start.line, Column: range.start.character },
          End: { Line: range.end.line, Column: range.end.character }
        };
        const filePath = lsp.Files.uriToFilePath(uri);
        const request = {
          FileName: filePath,
          Line: range.start.line,
          Column: range.end.character,
          Selection: selection
        };
        const { CodeActions } = await this.makeRequest<ICodeActionsResponse>(
          requests.GetCodeActions,
          request
        );
        return CodeActions;
      }
    );

    this.clientConnection.onNotification(
      new rpc.NotificationType<lsp.DidOpenTextDocumentParams, void>(
        "textDocument/didOpen"
      ),
      async params => {
        const {
          textDocument: { uri, text, version, languageId }
        } = params;
        this.openedDocumentUris.set(
          uri,
          lsp.TextDocument.create(uri, languageId, version, text)
        );
        this.logger.info(`Receive textDocument/didOpen request: ${uri}`);
        const source = new rpc.CancellationTokenSource();
        const filePath = lsp.Files.uriToFilePath(uri);
        await this.makeRequest(requests.UpdateBuffer, {
          FileName: filePath,
          Buffer: text
        });
        
        this.validateDocument(this.openedDocumentUris.get(uri));
      }
    );

    interface IHoverResult {
      Documentation: string | null;
      Type: string;
      StructuredDocumentation: DocumentationComment;
    }
    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>(
        "textDocument/hover"
      ),
      async params => {
        const {
          textDocument: { uri },
          position
        } = params;
        this.logger.info(`Receive textDocument/hover rquest: ${uri}`);
        const lspDocument = this.openedDocumentUris.get(uri);
        const filePath = lsp.Files.uriToFilePath(uri);
        const request = {
          ...createRequest(lspDocument, position),
          IncludeDocumentation: true
        };
        const source = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<IHoverResult>(
          requests.TypeLookup,
          request,
          source.token
        );
        if (result && result.Type) {
          const documentation = getDocumentationString(
            result.StructuredDocumentation
          );
          const contents = [
            documentation,
            { language: "csharp", value: result.Type }
          ];
          return <lsp.Hover>{
            contents
          };
        }
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.CompletionParams, any, any, any>(
        "textDocument/completion"
      ),
      async params => {
        const {
          textDocument: { uri },
          position,
          context
        } = params;
        const lspDocument = this.openedDocumentUris.get(uri);

        this.logger.info(`Receive textDocument/completion rquest: ${uri}`);
        const { line, character } = position;
        const lspPosition = lsp.Position.create(line, character);
        const range = lsp.Range.create(lspPosition, lspPosition);
        const wordToComplete = lspDocument.getText(range) || "";
        this.logger.debug(`wordToComplete ${wordToComplete}`);
        const req = createRequest<AutoCompleteRequest>(lspDocument, position);
        const request: AutoCompleteRequest = {
          ...req,
          WordToComplete: wordToComplete,
          WantDocumentationForEveryCompletionResult: true,
          WantKind: true,
          WantReturnType: true,
          WantImportableTypes: true,
          WantMethodHeader: true,
          WantSnippet: true,
          TriggerCharacter: '.',
        };
        if (context.triggerKind === 1) {
          req.TriggerCharacter = context.triggerCharacter;
        }
        const responses = await this.makeRequest(
          requests.AutoComplete,
          request
        );
        if (!responses) {
          return [];
        }

        let result: lsp.CompletionItem[] = [];
        let completions: {
          [c: string]: { items: lsp.CompletionItem[]; preselect: boolean };
        } = Object.create(null);
        // transform AutoCompleteResponse to CompletionItem and
        // group by code snippet
        for (let response of responses as Array<any>) {
          let completion = lsp.CompletionItem.create(response.CompletionText);

          completion.detail = response.ReturnType
            ? `${response.ReturnType} ${response.DisplayText}`
            : response.DisplayText;

          completion.documentation = extractSummaryText(response.Description);
          completion.kind =
            _kinds[response.Kind] || lsp.CompletionItemKind.Property;
          completion.insertText = response.CompletionText.replace(/<>/g, "");
          completion.commitCharacters = response.IsSuggestionMode
            ? commitCharactersWithoutSpace
            : allCommitCharacters;

          completion.preselect = response.Preselect;

          let completionSet = completions[completion.label];
          if (!completionSet) {
            completions[completion.label] = {
              items: [completion],
              preselect: completion.preselect
            };
          } else {
            completionSet.preselect =
              completionSet.preselect || completion.preselect;
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
          } else {
            // indicate that there is more
            suggestion.detail = `${
              suggestion.detail
            } (+ ${overloadCount} overload(s))`;
            suggestion.preselect = completions[key].preselect;
          }

          result.push(suggestion);
        }

        // for short completions (up to 1 character), treat the list as incomplete
        // because the server has likely witheld some matches due to performance constraints
        return lsp.CompletionList.create(
          result,
          wordToComplete.length > 1 ? false : true
        );
      }
    );

    this.clientConnection.onNotification(
      new rpc.NotificationType<lsp.DidChangeTextDocumentParams, void>(
        "textDocument/didChange"
      ),
      async params => {
        const {
          contentChanges,
          textDocument: { uri, version }
        } = params;
        this.logger.info(`Receive textDocument/didChange rquest: ${uri}`);
        const filePath = lsp.Files.uriToFilePath(uri);
        const lspDocument = this.openedDocumentUris.get(uri);
        const afterDocument = applyEdits(
          lspDocument.getText(),
          contentChanges.map(e => {
            const range =
              e.range ||
              lsp.Range.create(
                lsp.Position.create(0, 0),
                getPosition(e.rangeLength || 0)
              );
            return lsp.TextEdit.replace(range, e.text);
          })
        );
        this.openedDocumentUris.set(
          uri,
          lsp.TextDocument.create(
            uri,
            lspDocument.languageId,
            version,
            afterDocument
          )
        );

        const request = {
          FileName: filePath,
        };
        await this.makeRequest(requests.UpdateBuffer, { ...request, Buffer: afterDocument });
        // if (contentChanges.length === 1 && !contentChanges[0].range) {
          
        // } else if (contentChanges.length > 0) {
        //   const changes = contentChanges.map((change) => ({
        //     NewText: change.text,
        //     FileName: filePath,
        //     StartColumn: change.range!.start.character,
        //     StartLine: change.range!.start.line,
        //     EndColumn: change.range!.end.character,
        //     EndLine: change.range!.end.line,
        //   }));
        //   this.logger.debug(`changeBuffer request: ${JSON.stringify(changes)}`);
        //   await this.makeRequest(requests.ChangeBuffer, { ...request, ...changes });
        // }
        this.validateDocument(this.openedDocumentUris.get(uri));
      }
    );

    interface ICodeLens {
      Elements: any;
    }

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.CodeLensParams, any, any, any>(
        "textDocument/codeLens"
      ),
      async params => {
        const {
          textDocument: { uri }
        } = params;
        const filePath = lsp.Files.uriToFilePath(uri);
        const result = await this.makeRequest<ICodeLens>(
          requests.CodeStructure,
          { FileName: filePath }
        );
        if (result && result.Elements) {
          return createCodeLenses(result.Elements, filePath);
        }
        return [];
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.CodeLens, any, any, any>("codeLens/resolve"),
      async params => {
        const { data, range } = params;
        if (!data || !data[1].line || !data[1].character) {
          return;
        }
        const fileName = data[0].startsWith("/") ? data[0] : "";
        const request = {
          FileName: fileName,
          Line: data[1].line,
          Column: data[1].character,
          OnlyThisFile: false,
          ExcludeDefinition: true
        };
        const result = await this.makeRequest<QuickFixResponse>(
          requests.FindUsages,
          request
        );
        if (!result || !result.QuickFixes) {
          return;
        }
        const quickFixes = result.QuickFixes;
        const count = quickFixes.length;
        return {
          range,
          data,
          command: {
            title: count === 1 ? "1 references" : `${count} references`,
            command: "editor.actions.showReferences",
            arguments: [
              fileName,
              range.start,
              quickFixes.map(quickfix => {
                return toLocationFromUri(quickfix.FileName, quickfix);
              })
            ]
          }
        };
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>(
        "textDocument/definition"
      ),
      async params => {
        const { textDocument, position } = params;
        this.logger.info(
          `Receive textDocument/definition rquest: ${textDocument.uri}`
        );
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = createRequest(lspDocument, position);
        const result = await this.makeRequest<GoToDefinitionResponse>(
          requests.GoToDefinition,
          { ...request, WantMetadata: true }
        );
        this.logger.info(`gotoDefinition response`);
        console.log(result);
        if (result && result.FileName) {
          if (result.FileName.startsWith("$metadata$")) {
            const uri = createUri(result.FileName);
            return toLocationFromUri(uri.toString(), result);
          }
          const fileName = vscodeUri.default.file(result.FileName);
          const response = toLocationFromUri(fileName.toString(), result);
          return response;
        } else if (result.MetadataSource) {
          const metadataSource = result.MetadataSource;
          const metadataResponse = await this.makeRequest<MetadataResponse>(
            requests.Metadata,
            {
              Timeout: 5000,
              AssemblyName: metadataSource.AssemblyName,
              VersionNumber: metadataSource.VersionNumber,
              ProjectName: metadataSource.ProjectName,
              Language: metadataSource.Language,
              TypeName: metadataSource.TypeName
            }
          );
          if (
            !metadataResponse ||
            !metadataResponse.Source ||
            !metadataResponse.SourceName
          ) {
            return;
          }
          const uri = createUri(metadataResponse.SourceName);
          this.openedMetadataResponses.set(
            metadataResponse.SourceName,
            metadataResponse.Source
          );
          const position = lsp.Position.create(
            result.Line - 1,
            result.Column - 1
          );
          const location = lsp.Location.create(
            uri.toString(),
            lsp.Range.create(position, position)
          );
          return location;
        }
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<any, any, any, any>("omnisharp/metadata"),
      async params => {
        const { uri } = params;
        return this.openedMetadataResponses.get(uri) || "";
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>(
        "textDocument/documentHighlight"
      ),
      async params => {
        const { textDocument, position } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = {
          ...createRequest(lspDocument, position),
          OnlyThisFile: true,
          ExcludeDefinition: false
        };

        const cancelToken = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<QuickFixResponse>(
          requests.FindUsages,
          request,
          cancelToken.token
        );
        if (result && Array.isArray(result.QuickFixes)) {
          return result.QuickFixes.map(quickFix =>
            lsp.DocumentHighlight.create(toRange(quickFix))
          );
        }
        return [];
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.ReferenceParams, any, any, any>(
        "textDocument/references"
      ),
      async params => {
        const { textDocument, position, context } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = {
          ...createRequest(lspDocument, position),
          OnlyThisFile: true,
          ExcludeDefinition: false
        };

        const cancelToken = new rpc.CancellationTokenSource();
        const result = await this.makeRequest<QuickFixResponse>(
          requests.FindUsages,
          request,
          cancelToken.token
        );

        if (result && Array.isArray(result.QuickFixes)) {
          return result.QuickFixes.map(location => {
            const uri = vscodeUri.default.file(location.FileName);
            return toLocationFromUri(uri.toString(), location);
          });
        }
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.DocumentFormattingParams, any, any, any>(
        "textDocument/formatting"
      ),
      async params => {
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
          WantsTextChanges: true
        };
        const result = await this.makeRequest<FormatRangeResponse>(
          requests.CodeFormat,
          request
        );
        if (result && Array.isArray(result.Changes)) {
          return result.Changes.map(asEditOptionation);
        }
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.DocumentRangeFormattingParams, any, any, any>(
        "textDocument/rangeFormatting"
      ),
      async params => {
        const { textDocument, range } = params;
        const filePath = lsp.Files.uriToFilePath(textDocument.uri);
        const request = {
          FileName: filePath,
          Line: range.start.line + 1,
          Column: range.start.character + 1,
          EndLine: range.end.line + 1,
          EndColumn: range.end.character + 1,
          WantsTextChanges: true
        };

        const result = await this.makeRequest<FormatRangeResponse>(
          requests.CodeFormat,
          request
        );
        if (result && Array.isArray(result.Changes)) {
          return result.Changes.map(asEditOptionation);
        }
      }
    );

    this.clientConnection.onRequest(
      new rpc.RequestType<lsp.TextDocumentPositionParams, any, any, any>(
        "textDocument/signatureHelp"
      ),
      async params => {
        const { textDocument, position } = params;
        const lspDocument = this.openedDocumentUris.get(textDocument.uri);
        const request = createRequest(lspDocument, position);
        const result = await this.makeRequest<SignatureHelp>(
          requests.SignatureHelp,
          request
        );
        // result.
        const signatures: lsp.SignatureInformation[] = [];
        const ret = {
          activeSignature: result.ActiveSignature,
          activeParameter: result.ActiveParameter
        };
        for (const signature of result.Signatures) {
          let signatureInfo = lsp.SignatureInformation.create(
            signature.Label,
            signature.StructuredDocumentation.SummaryText
          );
          signatures.push(signatureInfo);

          for (let parameter of signature.Parameters) {
            let parameterInfo = lsp.ParameterInformation.create(
              parameter.Label,
              getParameterDocumentation(parameter)
            );

            signatureInfo.parameters.push(parameterInfo);
          }
        }
        return {
          ...ret,
          signatures
        };
      }
    );

    this.clientConnection.onClose(() => {
      console.log('disconnect');
      this.dispose();
    });
    this.clientConnection.listen();
  }

  private addListener(event: string, listener: (e: any) => any): () => any{
    const eventListener = listener.bind(this);
    this.eventBus.addListener(event, eventListener);
    return () => this.eventBus.removeListener(event, eventListener);
  }

  private fireEvent(event: string, args: any): void {
    this.eventBus.emit(event, args);
  }

  public async validateDocument(document: lsp.TextDocument) {
    this.logger.debug(`Handler codecheck for ${document.uri}`);
    const source = new rpc.CancellationTokenSource();
    const value = await this.makeRequest<QuickFixResponse>(
      requests.CodeCheck,
      { FileName: lsp.Files.uriToFilePath(document.uri) },
      source.token
    );
    const quickFixes = value.QuickFixes.filter((quickFix) => quickFix.LogLevel.toLowerCase() !== 'hidden');
    // if no diagnostics, clear
    if (quickFixes.length === 0) {
      return;
    }

    const diagnostics = quickFixes.map(CsharpLanguageServer.asDiagnostic);

    const diagnosticNotification = new rpc.NotificationType<lsp.PublishDiagnosticsParams, void>('textDocument/publishDiagnostics');
    this.clientConnection.sendNotification(diagnosticNotification, { uri: document.uri, diagnostics })
  }

  private static asDiagnostic(quickFix: QuickFix): lsp.Diagnostic{
    const { LogLevel, Projects, Text } = quickFix;
    const severity = CsharpLanguageServer.asDiagnosticServerity(LogLevel);
    const message = `${Text} [${Projects.map((n) => CsharpLanguageServer.asProjectLabel(n)).join(', ')}]`;
    return lsp.Diagnostic.create(toRange(quickFix), message, severity);
  }

  private static asDiagnosticServerity(logLevel: string): lsp.DiagnosticSeverity{
    switch (logLevel.toLowerCase()) {
      case 'error':
        return lsp.DiagnosticSeverity.Error;
      case 'warning':
        return lsp.DiagnosticSeverity.Warning;
      default:
        return lsp.DiagnosticSeverity.Information
    }
  }

  private static asProjectLabel(projectName: string): string {
    const idx = projectName.indexOf('+');
    return projectName.substr(idx + 1);
  }

  public async start(): Promise<IDispose> {
    if (!this.rootPath) return;
    const executable = await this.resolveExecutable();
    const razor= await findRazor();
    const args = [
      '--assembly-loader=strict',
      path.resolve(
        __dirname,
        "../../../csharp-lsp/.omnisharp/1.32.8/omnisharp/OmniSharp.exe"
      ),
      "-s",
      this.rootPath,
      "--hostPID",
      process.pid.toString(),
      "--stdio",
      "DotNet:enablePackageRestore=true",
      "MSBuild:enablePackageRestore=true",
      "--edcoding",
      "utf-8",
      "--loglevel",
      "error",
      "--plugin",
      razor
    ];
    const processEnv = {
      ...process.env,
      PATH: path.join(executable, 'bin') + path.delimiter + process.env['PATH'],
      MONO_GAC_PREFIX: executable,
    };
    this.serverProcess = cp.spawn(executable, args, { cwd: this.rootPath, env: processEnv });
    this.logger.info(`CSharp-Omisharp is running:${executable} ${args.join(" ")}`);
    this.makeRequest(requests.Projects).then((response: any) => {
      if (response.DotNet && response.DotNet.Projects.length > 0) {
        this.logger.info(`
            DotNet projects count: ${response.DotNet.Projects.length}
          `);
        this.logger.info(`
            DotNet projects file count: ${sum(
              response.DotNet.Projects,
              (p: any) => safeLength(p.SourceFiles)
            )}
          `);
      }

      if (response.MsBuild && response.MsBuild.Projects.length > 0) {
        this.logger.info(`
            MsBuild projects count: ${response.MsBuild.Projects.length}
          `);
        this.logger.info(`
            MsBuild projects file count: ${sum(
              response.MsBuild.Projects,
              (p: any) => safeLength(p.SourceFiles)
            )}
          `);
        // @TODO
      }

      this.firstUpdateProject = false;
    });
    
    this.readLine = createInterface({
      input: this.serverProcess.stdout,
      output: this.serverProcess.stdin,
      terminal: false
    });

    this.readLine.addListener("line", this.lineReceived);

    this.serverProcess.on("error", err => {
      this.logger.error(`Error: ${err.message}`);
    });

    this.serverProcess.stderr.on("data", (data: Buffer) => {
      let trimData = removeBOMFromBuffer(data);
      this.logger.error(`Error: ${trimData}`);
    });

    /**
     * bind omnisharp events
     */
    this.disposes.push(
      this.addListener(events.UnresolvedDependencies, this.onUnresolveDependencies),
    );

    this.disposes.push(
      this.addListener(events.ProjectAdded, this.onProjectAdded),
    );

    this.disposes.push(
      this.addListener(events.ProjectChanged, this.onProjectChanged),
    );

    this.disposes.push(
      this.addListener(events.PackageRestoreStarted, this.onPackageRestoreStarted),
    );

    return Promise.resolve(this.dispose);
  }

  private debounceRequestWorkspaceInfomation() {
    if(!this.firstUpdateProject) {
      debounce(this.requestWorkspaceInfomation.bind(this), 1500, null);
    }
  }

  private async requestWorkspaceInfomation() {
    const infomation = await this.makeRequest(requests.Project);
    console.log(infomation);
  }

  private onPackageRestoreStarted(message): void {
    this.logger.debug('Handler PackageRestoreStarted event.');
    console.log(message);
    this.validateProject();
  }

  private onUnresolveDependencies (message) {
    this.logger.debug(`Handler unresolveDependencies event, Try execute dotnet restore command in ${this.rootPath}`);
    cp.exec('dotnet restore', { cwd: this.rootPath }, (err, stdout, stderr) => {
      if (err) {
        this.logger.error('dotnet restore execute failed.');
      }

      console.log(stdout);
    });
  }

  private onProjectAdded (message) {
    this.logger.debug('Handler ProjectAdded event.');
    this.debounceRequestWorkspaceInfomation();
  }

  private async onProjectChanged(message) {
    this.logger.debug('Handler ProjectChanged event.');
    this.debounceRequestWorkspaceInfomation();

    this.validateProject();
    // const result = await this.makeRequest(requests.CodeCheck, { FileName: null }, this.projectValidation.token);

  }

  private lineReceived = (lineString: string) => {
    const line = removeBOMFromString(lineString);
    if (line[0] !== "{") {
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
      case "response":
        this._handleResponsePacket(packet);
        break;
      case "event":
        this._handleEventPacket(packet);
        break;
      default:
        this.logger.error(`Unknown packet type: ${packet.Type}`);
        break;
    }
  };

  private validateProject() {
    if (this.projectValidation) {
      this.projectValidation.cancel();
    }
    this.projectValidation = new rpc.CancellationTokenSource();
    const handle = setTimeout(() => {
      this.makeRequest<QuickFixResponse>(requests.CodeCheck, { FileName: null }, this.projectValidation.token)
        .then((value) => {
          const quickFixes = value.QuickFixes
            .filter((quickFix) => quickFix.LogLevel.toLowerCase() !== 'hidden')
            .sort((a, b) => a.FileName.localeCompare(b.FileName));
          let entries = [];
          let lastEntry;
          for (const quickFix of quickFixes) {
            const diag = CsharpLanguageServer.asDiagnostic(quickFix);
            const uri = vscodeUri.default.file(quickFix.FileName);
            if (lastEntry && lastEntry[0].toString() === uri.toString()) {
              lastEntry[1].push(diag);
            }
            else {
              // We're replacing all diagnostics in this file. Pushing an entry with undefined for
              // the diagnostics first ensures that the previous diagnostics for this file are
              // cleared. Otherwise, new entries will be merged with the old ones.
              entries.push([uri, undefined]);
              lastEntry = [uri, [diag]];
              entries.push(lastEntry);
            }
          }

          const diagnosticsForFile = entries.filter((diagnostics) => !!diagnostics[1])
            .reduce((pre, cur) => {
              if (pre.find((filePath) => filePath === cur[0].path)) {

              }
            }, []);
          console.log('Get diagnostices from validateProject method:');
          console.log(entries);
          const diagnosticNotification = new rpc.NotificationType<lsp.PublishDiagnosticsParams, void>('textDocument/publishDiagnostics');
          // this.clientConnection.sendNotification(diagnosticNotification, { uri: document.uri, diagnostics })
        });
    }, 3000);
    this.projectValidation.token.onCancellationRequested(() => {
      clearTimeout(handle);
    });
  }

  private _handleResponsePacket(packet: { Command: string; Request_seq: number; Success: any; Body: any; Message: any; }) {
    const request = this.requestQueue.dequeue(
      packet.Command,
      packet.Request_seq
    );
    if (!request) {
      this.logger.error(
        `Received response for ${packet.Command} but could not find request.`
      );
      return;
    }

    this.logger.info(
      `handleResponse: ${packet.Command} (${packet.Request_seq})`
    );

    if (packet.Success) {
      request.onSuccess(packet.Body);
    } else {
      request.onError(packet.Message || packet.Body);
    }

    this.requestQueue.drain();
  }

  private _handleEventPacket(packet: { Body: any; Event?: any; }) {
    if (packet.Event === "log") {
      const { Body: { LogLevel, Name, Message } } = packet;
      const logLevel = LogLevel.toLowerCase();
      console.log(`[${logLevel}]-${Name}: ${Message}`);
    } else {
      this.fireEvent(packet.Event, packet.Body);
    }
  }

  public async resolveExecutable(): Promise<string> {
    const monopath = await findMonoHome();
    return Promise.resolve(monopath);
  }

  public dispose = () => {
    this.logger.info(`${this.spaceKey} is disconnect.`);
    this.servicesManager.dispose(this.spaceKey);
    this.serverProcess.kill();
    this.destroyed = true;

    this.logger.info('Clean all event listeners.');  
    for (const dispose of this.disposes) {
      dispose();
    }
  };

  public makeRequest<TResponse>(
    command: string,
    data?: any,
    token?: rpc.CancellationToken
  ): Promise<TResponse> {
    // if (!this.serverProcess) {
    //   const errMsg = "server has been stopped or not started.";
    //   this.logger.error(errMsg);
    //   return Promise.reject<TResponse>(errMsg);
    // }

    let startTime: number;
    let request: requests.CsharpLSPRequest;

    const promise = new Promise<TResponse>((resolve, reject) => {
      startTime = Date.now();
      request = {
        command,
        data,
        onSuccess: value => {
          resolve(value);
        },
        onError: err => reject(err)
      };

      this.requestQueue.enqueue(request);
    });

    if (token) {
      token.onCancellationRequested(() => {
        this.logger.info(`Cancel request: ${request.command}`);
        this.requestQueue.cancelRequest(request);
      });
    }

    return promise.then(response => {
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
    const id = (this._nextId += 1);
    const requestPacket = {
      Type: "request",
      Seq: id,
      Command: request.command,
      Arguments: request.data
    };
    this.serverProcess.stdin.write(JSON.stringify(requestPacket) + "\n");
    return id;
  }
}

export default CsharpLanguageServer;
