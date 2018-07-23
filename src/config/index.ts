export const serverBaseUri = (SERVER_HOME): string => {
  return process.env.NODE_ENV === 'dev'
    ? `/Users/sakura/lsp/node-lsp-tcp/${SERVER_HOME}`
    : `/data/coding-ide-home/node-lsp-tcp/${SERVER_HOME}`;
};

export const temporaryData = (spaceKey: string): string => {
  return process.env.NODE_ENV === 'dev'
    ? `/Users/sakura/lsp/lsp-workspace/${spaceKey}`
    : `/data/coding-ide-home/lsp-workspace/${spaceKey}`;
}

export const PORT = 9988;

export const ContentLength: string = 'Content-Length: ';
export const CRLF = '\r\n';

export const MAX_JAVA_SERVICES = 20;
