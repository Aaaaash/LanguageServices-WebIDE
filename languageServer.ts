import * as http from 'http';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express-serve-static-core';
import * as url from 'url';
import * as fs from "fs";
import * as cp from 'child_process';
import ChannelsManager from './ChannelsManager';
import SocketChannel from './SocketChannel';
import { ParsedUrlQuery } from "querystring";
import * as io from 'socket.io';
import { prepareExecutable, PORT } from './config';
import ProcessManager from "./ProcessManager";
import * as log4js from 'log4js';
const app = express();

export const logger = log4js.getLogger();
logger.level = 'debug';

const server = http.createServer(app);

app.all("*", function(req: Request, res: Response, next: NextFunction) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Content-Length, Authorization, Accept,X-Requested-With"
  );
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", " 3.2.1");
  if (req.method == "OPTIONS") res.send(200);
  else next();
});


app.get("/content", (req: Request, res: Response) => {
  const urlPart: url.UrlWithParsedQuery = url.parse(req.url, true);
  const queryString: ParsedUrlQuery = urlPart.query;
  const { ws, file } = queryString;
  fs.readFile(`${ws}${file}`, (err: NodeJS.ErrnoException, data: Buffer) => {
    if (err) {
      logger.warn(err.message);
    }
    res.send({
      data: data.toString(),
      code: 0
    });
  });
});

const socket = io(server);

export const channelsManager = new ChannelsManager();
export const processManager = new ProcessManager();

socket.on('connection', (websocket: io.Socket) => {
  const urlPart = url.parse(websocket.request.url, true)
  const { ws } = urlPart.query
  if (!channelsManager.hasWs(<string>ws)) {
    const rooms: Array<any> = Object.keys(websocket.rooms)
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
