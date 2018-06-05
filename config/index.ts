export * from './javaLspConfig';

export const BASE_URI = process.env.NODE_ENV === 'dev' ? '/Users/sakura/lsp/vscode-java/server' : '/data/coding-ide-home/repository';
export const CONFIG_DIR = process.platform === 'darwin' ? 'config_mac' : process.platform === 'linux' ? 'config_linux' : 'config_win';
