import * as http from 'http';
import * as url from 'url';
import * as cp from 'child_process';
import ChannelsManager from './ChannelsManager';
import SocketChannel from './SocketChannel';
import * as io from 'socket.io';
import { prepareExecutable, PORT } from './config';
import ProcessManager from "./ProcessManager";
import * as log4js from 'log4js';

export const logger = log4js.getLogger();
logger.level = 'debug';

const server = http.createServer();

const socket = io(server);

export const channelsManager = new ChannelsManager();
export const processManager = new ProcessManager();

socket.on('connection', (websocket: io.Socket) => {
  const urlPart = url.parse(websocket.request.url, true)
  const { ws } = urlPart.query
  if (!channelsManager.hasWs(<string>ws)) {
    const processCommand = prepareExecutable();
    const newArgs = [
      '-data',
      `${ws}`
    ];
    try {
      const childprocess = cp.spawn(processCommand.command, [...processCommand.args, ...newArgs]);
      processManager.addProcess({ spacekey: <string>ws, process: childprocess });
      const socketChannel = new SocketChannel(<string>ws, childprocess);
      socketChannel.join(websocket);
      channelsManager.add(socketChannel);
    } catch(err) {
      logger.info(err.message);
    }
  } else {
    logger.warn(`${ws} is ready`);
  }
});

socket.on('error', (err) => {
  logger.error(err.message);
});

server.listen(PORT, () => {
  logger.info('Web Server start in 9988 port!');
});

process.on('uncaughtException', function(err) {
  logger.error(err.stack);
});

process.on('exit', () => {
  processManager.killAll();
});
