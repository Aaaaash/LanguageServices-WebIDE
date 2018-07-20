import * as http from "http";
import * as log4js from "log4js";
import * as io from "socket.io";
import * as url from "url";

import { PORT } from "./config";
import LanguageServerManager from "./LanguageServerManager";
import languages from "./languageserver";

log4js.configure({
  appenders: {
    languageServer: { type: "file", filename: "languageServer.log" }
  },
  categories: { default: { appenders: ["languageServer"], level: "info" } }
});

const servicesManager = LanguageServerManager.getInstance();

const server = http.createServer();

const logger = log4js.getLogger("main");
logger.level = "debug";

const socket = io(server);

socket.on("connection", (websocket: io.Socket) => {
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

  if (servicesManager.servicesIsExisted(ws as string)) {
    websocket.send({ data: `${ws} is already exists.` });
    logger.warn(`${ws} is already exists.`);
    return false;
  } else {
    const ServerClass = languages.find(l => l.language === language).server;
    const languageServer = new ServerClass(<string>ws, websocket);
    languageServer.start();
    servicesManager.push({ spaceKey: <string>ws, server: languageServer });
  }
});

socket.on("error", err => {
  logger.error(err.message);
});

server.listen(PORT, () => {
  logger.info("Web Server start in 9988 port!");
});

process.on("uncaughtException", function(err) {
  logger.error("uncaughtException", err.stack);
});

process.on("exit", () => {
  servicesManager.disposeAll();
});
