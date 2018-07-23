import * as io from 'socket.io';

export type IExecutable = {
  options: any;
  command: string;
  args: string[];
};

export interface ILanguageServerConstructor {
  new (spaceKey: string, socket: io.Socket): ILanguageServer;
}

export interface ILanguageServer {
  start: () => Promise<IDispose>;
  dispose: () => void;
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
