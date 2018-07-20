
export interface LanguageServer {
  type: Symbol;
  start: () => void;
  init: () => void;
  prepareExecutable: () => Promise<any>;
}
