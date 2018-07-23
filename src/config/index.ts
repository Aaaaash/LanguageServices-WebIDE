export const serverBaseUri = (serverHome): string => {
  return process.env.NODE_ENV === 'dev'
    ? `${process.cwd()}/${serverHome}`
    : `${process.cwd()}/${serverHome}`;
};

export const temporaryData = (spaceKey: string): string => {
  return process.env.NODE_ENV === 'dev'
    ? `/Users/sakura/lsp/lsp-workspace/${spaceKey}`
    : `/data/coding-ide-home/lsp-workspace/${spaceKey}`;
};

export const PORT = 9988;

export const contentLength: string = 'Content-Length: ';
export const CRLF = '\r\n';

export const MAX_JAVA_SERVICES = 20;

export const JAVA_CONFIG_DIR = process.platform === 'darwin'
  ? 'config_mac'
  : process.platform === 'linux'
    ? 'config_linux'
    : 'config_win';
