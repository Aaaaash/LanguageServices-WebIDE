import * as net from "net";
import * as express from "express";
import * as url from "url";
import * as ws from "ws";
import * as path from "path";
import * as cp from "child_process";
import * as fs from "fs";
import { StreamMessageReader } from "./messageReader";
import { Request, Response, NextFunction } from "express-serve-static-core";
import { ParsedUrlQuery } from "querystring";

import ProcessManager from "./ProcessManager";
import { IncomingMessage } from "http";
import workspaceConvert from './workspaceConvert';

const processManager = new ProcessManager();

function prepareParams() {
  let params = [];
  params.push(
    `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y`
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

const app = express();

app.all("*", function(req: Request, res: Response, next: NextFunction) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Content-Length, Authorization, Accept,X-Requested-With"
  );
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", " 3.2.1");
  if (req.method == "OPTIONS") res.send(200);
  /*让options请求快速返回*/ else next();
});

const httpserver = app.listen(9988, () => {
  console.log("httpserver listen in port : 9988");
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

const webSocket = new ws.Server({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 100 * 1024 * 1024
});

let ContentLength: string = "Content-Length: ";
let CRLF = "\r\n";

function launch(clientSocket) {
  const processCommand = prepareExecutable();
  const tspProcess = cp.spawn(processCommand.command, processCommand.args);

  processManager.addProcess(tspProcess);
  
  tspProcess.on("error", err => {
    console.warn(`java lsp has Error: ${err}`);
  });

  clientSocket.onMessage(data => {
    tspProcess.stdin.write(data);
  });

  clientSocket.onClose(() => {
    const killed = processManager.kill(tspProcess.pid);
    console.log(`${tspProcess.pid} has been killed!`);
  });

  /**
   * 将标准输出转化为messageReader流
   */
  const messageReader = new StreamMessageReader(tspProcess.stdout);
  messageReader.listen(data => {
    const jsonrpcData = JSON.stringify(data);
    Buffer.byteLength(jsonrpcData, "utf-8");
    let headers: string[] = [
      ContentLength,
      jsonrpcData.length.toString(),
      CRLF,
      CRLF
    ];
    clientSocket.send(`${headers.join("")}${jsonrpcData}`);
  });
}

httpserver.on("upgrade", (req: IncomingMessage, socket: net.Socket, head: Buffer) => {
  const pathname = req.url ? url.parse(req.url).pathname : undefined;
  if (pathname === "/java") {
    webSocket.handleUpgrade(req, socket, head, web_socket => {
      const socketconnect = {
        send: content =>
          web_socket.send(content, error => {
            if (error) {
              throw error;
            }
          }),
        write: content =>
          web_socket.send(content, error => {
            if (error) {
              throw error;
            }
          }),
        onMessage: cb => web_socket.on("message", cb),
        onError: cb => web_socket.on("error", cb),
        onClose: cb => web_socket.on("close", cb),
        dispose: () => web_socket.close()
      };
      if (web_socket.readyState === web_socket.OPEN) {
        launch(socketconnect);
      }
    });
  }
});

process.on("exit", () => {
  if (processManager.count >= 1) {
    processManager.killAll();
  }
});
