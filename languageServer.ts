import * as WebSocket from 'ws';
import * as http from 'http';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express-serve-static-core';
import * as url from 'url';
import * as fs from "fs";
import * as cp from 'child_process';
import ChannelsManager from './ChannelsManager';
import SocketChannel from './SocketChannel';
import { Socket } from 'net';
import { ParsedUrlQuery } from "querystring";
import * as io from 'socket.io';
import { StreamMessageReader} from './messageReader';
import ProcessManager from "./ProcessManager";
import handleMessageIO from './handleMessageIO';

import { IProcess } from './ProcessManager';
const processManager = new ProcessManager();

const app = express();

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
      console.log(err.message);
    }
    res.send({
      data: data.toString(),
      code: 0
    });
  });
});

const socket = io(server);



function prepareParams() {
  let params = [];
  params.push(
    `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=19432,quiet=y`
  );
  params.push("-Declipse.application=org.eclipse.jdt.ls.core.id1");
  params.push("-Dosgi.bundles.defaultStartLevel=4");
  params.push("-Declipse.product=org.eclipse.jdt.ls.core.product");
  params.push("-Dlog.level=2");
  params.push("-jar");
  params.push(
    "/data/coding-ide-home/repository/plugins/org.eclipse.equinox.launcher_1.5.0.v20180207-1446.jar"
  );
  let configDir = "config_win";
  if (process.platform === "darwin") {
    configDir = "config_mac";
  } else if (process.platform === "linux") {
    configDir = "config_linux";
  }
  params.push("-configuration");
  params.push(`/data/coding-ide-home/repository/${configDir}`);
  return params;
}
function prepareExecutable() {
  let executable = Object.create(null);
  let options = Object.create(null);
  options.env = process.env;
  options.stdio = "pipe";
  executable.options = options;
  executable.command = "java";
  executable.args = prepareParams();
  return executable;
}

socket.on('connection', (websocket: io.Socket) => {
  const urlPart = url.parse(websocket.request.url, true)
  const { ws } = urlPart.query
  websocket.emit('open');
  websocket.join(<string>ws, () => {
    const rooms: Array<any> = Object.keys(websocket.rooms)
    let curProcess = processManager.getProcessByws(<string>ws);
    if (!curProcess) {
      const processCommand = prepareExecutable();
      const childprocess = cp.spawn(processCommand.command, processCommand.args);
      curProcess = { spacekey: <string>ws, process: childprocess }
      processManager.addProcess(curProcess);
    }
    handleMessageIO(websocket, curProcess.process);
    websocket.on('close', () => {
      processManager.kill(<string>ws);
    })
  });
});

server.listen(9988, () => {
  console.log('Web Server start in 9988 port!');
});

process.on('exit', () => {
  processManager.killAll();
});
