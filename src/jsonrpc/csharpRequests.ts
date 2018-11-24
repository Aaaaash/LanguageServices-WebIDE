/* tslint:disable */
export const AddToProject = '/addtoproject';
export const AutoComplete = '/autocomplete';
export const CodeCheck = '/codecheck';
export const CodeFormat = '/codeformat';
export const ChangeBuffer = '/changebuffer';
export const FilesChanged = '/filesChanged';
export const FindSymbols = '/findsymbols';
export const FindUsages = '/findusages';
export const FormatAfterKeystroke = '/formatAfterKeystroke';
export const FormatRange = '/formatRange';
export const GoToDefinition = '/gotoDefinition';
export const FindImplementations = '/findimplementations';
export const Project = '/project';
export const Projects = '/projects';
export const RemoveFromProject = '/removefromproject';
export const Rename = '/rename';
export const SignatureHelp = '/signatureHelp';
export const TypeLookup = '/typelookup';
export const UpdateBuffer = '/updatebuffer';
export const Metadata = '/metadata';
export const GetCodeActions = '/v2/getcodeactions';
export const RunCodeAction = '/v2/runcodeaction';
export const GetTestStartInfo = '/v2/getteststartinfo';
export const RunTest = '/v2/runtest';
export const RunAllTestsInClass = "/v2/runtestsinclass";
export const DebugTestGetStartInfo = '/v2/debugtest/getstartinfo';
export const DebugTestsInClassGetStartInfo = '/v2/debugtestsinclass/getstartinfo';
export const DebugTestLaunch = '/v2/debugtest/launch';
export const DebugTestStop = '/v2/debugtest/stop';
export const BlockStructure = '/v2/blockstructure';
export const CodeStructure = '/v2/codestructure';

const priorityCommands = [
  ChangeBuffer,
  FormatAfterKeystroke,
  FormatRange,
  UpdateBuffer,
];

const normalCommands = [
  AutoComplete,
  FilesChanged,
  FindSymbols,
  FindUsages,
  GetCodeActions,
  GoToDefinition,
  RunCodeAction,
  SignatureHelp,
  TypeLookup,
];

const prioritySet = new Set<string>(priorityCommands);
const normalSet = new Set<string>(normalCommands);
const deferredSet = new Set<string>();

const nonDeferredSet = new Set<string>();

for (const command of priorityCommands) {
  nonDeferredSet.add(command);
}

for (const command of normalCommands) {
  nonDeferredSet.add(command);
}

export function isPriorityCommand(command: string) {
  return prioritySet.has(command);
}

export function isNormalCommand(command: string) {
  return normalSet.has(command);
}

export function isDeferredCommand(command: string) {
  if (deferredSet.has(command)) {
    return true;
  }

  if (nonDeferredSet.has(command)) {
    return false;
  }

  deferredSet.add(command);
  return true;
}

export interface CsharpLSPRequest {
  command: string;
  data?: any;
  onSuccess(value: any): void;
  onError(err: any): void;
  startTime?: number;
  endTime?: number;
}

export interface Event<T> {

  /**
   * A function that represents an event to which you subscribe by calling it with
   * a listener function as argument.
   *
   * @param listener The listener function will be called when the event happens.
   * @param thisArgs The `this`-argument which will be used when calling the event listener.
   * @param disposables An array to which a [disposable](#Disposable) will be added.
   * @return A disposable which unsubscribes the event listener.
   */
  (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
}

export interface Disposable {
  /**
   * Dispose this object.
   */
  dispose(): any;
}


export interface CancellationToken {

  /**
   * Is `true` when the token has been cancelled, `false` otherwise.
   */
  isCancellationRequested: boolean;

  /**
   * An [event](#Event) which fires upon cancellation.
   */
  onCancellationRequested: Event<any>;
}
