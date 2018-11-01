import * as io from 'socket.io';
import AbstractLanguageServer from '../languageserver/AbstractLanguageServer';

export type IExecutable = {
  options: any;
  command: string;
  args: string[];
};

export interface ILanguageServerConstructor {
  new (spaceKey: string, socket: io.Socket): AbstractLanguageServer;
}

export type LanguageServerProfile<T extends AbstractLanguageServer> = {
  language: string;
  server: T;
};

export interface IDispose {
  (): void;
}
