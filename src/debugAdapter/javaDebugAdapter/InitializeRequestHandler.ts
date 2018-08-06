import * as log4js from 'log4js';

import IRequestHandler from '../../debugProtocol/IRequestHandler';
import IDebugContext from '../../debugProtocol/IDebugContext';

import { contentLength, CRLF } from '../../config';

interface InitializeRequestArguments {
  /** The ID of the (frontend) client using this adapter. */
  clientID?: string;
  /** The human readable name of the (frontend) client using this adapter. */
  clientName?: string;
  /** The ID of the debug adapter. */
  adapterID: string;
  /** The ISO-639 locale of the (frontend) client using this adapter, e.g. en-US or de-CH. */
  locale?: string;
  /** If true all line numbers are 1-based (default). */
  linesStartAt1?: boolean;
  /** If true all column numbers are 1-based (default). */
  columnsStartAt1?: boolean;
  /** Determines in what format paths are specified. The default is 'path',
   *  which is the native format.
   * Values: 'path', 'uri', etc.
  */
  pathFormat?: string;
  /** Client supports the optional type attribute for variables. */
  supportsVariableType?: boolean;
  /** Client supports the paging of variables. */
  supportsVariablePaging?: boolean;
  /** Client supports the runInTerminal request. */
  supportsRunInTerminalRequest?: boolean;
}

export default class InitializeRequestHandler implements IRequestHandler {
  public command: string = 'initialize';

  private logger: log4js.Logger = log4js.getLogger('InitializeRequestHandler');

  constructor(public debugContext: IDebugContext) {}

  public initialize() {}

  public handle(params: InitializeRequestArguments): void {
    const request = JSON.stringify({
      command: this.command,
      arguments: params,
      seq: this.debugContext.seq,
      type: 'request',
    });
    const length = Buffer.byteLength(request, 'utf-8');
    this.logger.info(`Receive request: ${this.command}\r\nparams: ${request}`);

    const jsonrpc = [contentLength, length, CRLF, CRLF, request];
    this.debugContext.messageWriter.write({
      jsonrpc: jsonrpc.join(''),
    });
  }
}
