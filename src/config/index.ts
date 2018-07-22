export const BASE_URI = (SERVER_HOME) => {
  return process.env.NODE_ENV === 'dev'
    ? `/Users/sakura/lsp/node-lsp-tcp/${SERVER_HOME}`
    : `/data/coding-ide-home/node-lsp-tcp/${SERVER_HOME}`;
};

export const PORT = 9988;

export const ContentLength: string = 'Content-Length: ';
export const CRLF = '\r\n';
