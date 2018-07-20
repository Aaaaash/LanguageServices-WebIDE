import * as http from "http";
import * as url from "url";
import * as cp from "child_process";
import ChannelsManager from "./ChannelsManager";
import SocketChannel from "./SocketChannel";
import * as io from "socket.io";
import { prepareExecutable, PORT } from "./config";
import ProcessManager from "./ProcessManager";
import * as log4js from "log4js";

export const logger = log4js.getLogger('Language-Services');
logger.level = "debug";

const server = http.createServer();

const socket = io(server);

export const channelsManager = new ChannelsManager();
export const processManager = new ProcessManager();

socket.on('connection', async (websocket: io.Socket) => {
  const urlPart = url.parse(websocket.request.url, true);

  const { ws, language } = urlPart.query;
  if (!ws) {
    logger.error(`Missing required parameter 'ws'.`);
    websocket.send({ data: `Missing required parameter 'ws'.` });
    return;
  }

  if (!language) {
    logger.error(`Missing required parameter 'language'.`);
    websocket.send({ data: `Missing required parameter 'language'.` });
    return;
  }

  if (!channelsManager.hasWs(<string>ws)) {
    const processCommand = await prepareExecutable();
    logger.info(`${language}: ${processCommand.command}. workSpace: ${ws}`);
    const newArgs = ["-data", `${ws}`];
    try {
      const childprocess = cp.spawn(processCommand.command, [
        ...processCommand.args,
        ...newArgs
      ]);
      processManager.addProcess({
        spacekey: <string>ws,
        process: childprocess,
        language: <string>language
      });
      const languageServer = processManager.getProcessByws(ws as string);
      const socketChannel = new SocketChannel(<string>ws, languageServer);
      socketChannel.join(websocket);
      channelsManager.add(socketChannel);
    } catch (err) {
      logger.error(err);
    }
  } else {
    websocket.send({ data: `${ws} is already exists!` });
    logger.warn(`${ws} is already exists!`);
  }
});

socket.on("error", err => {
  logger.error(err.message);
});

server.listen(PORT, () => {
  logger.info("Web Server start in 9988 port!");
});

process.on("uncaughtException", function(err) {
  logger.error(err.stack);
});

process.on("exit", () => {
  processManager.killAll();
});
