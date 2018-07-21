export type IExecutable = {
  options: any;
  command: string;
  args: Array<string>;
};

export interface ILanguageServer {
  start(): void;
  dispose(): void;
  type: Symbol;
}

// export type LanguageServer = typeof

export type LanguageServerProfile<T> = {
  language: string;
  server: T;
};

export interface IDispose {
  (): void;
}