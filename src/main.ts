import * as http from 'http';
import * as log4js from 'log4js';
import * as io from 'socket.io';
import * as url from 'url';

import { PORT } from './config';
import LanguageServerManager from './LanguageServerManager';
/* tslint:disable */
import serverProfiles from './languageserver';
import DebugAdapter from './debugAdapter';
/* tslint:enable */

if (process.env.NODE_ENV === 'prod') {
  log4js.configure({
    appenders: {
      out: { type: 'stdout' },
      languageServer: {
        type: 'file',
        filename: 'languageServer.log',
        maxLogSize: 50 * 1024 * 1024,
        numBackups: 5,
        compress: true,
        encoding: 'utf-8',
      },
    },
    categories: { default: { appenders: ['out', 'languageServer'], level: 'info' } },
  });
}

const servicesManager = LanguageServerManager.getInstance();

const server = http.createServer();

const logger = log4js.getLogger('main');
logger.level = 'debug';

const socket = io(server, {
  path: '',
  serveClient: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
});

socket.on('connection', (websocket: io.Socket) => {
  const urlPart = url.parse(websocket.request.url, true);
  const { ws, language, port, debug } = urlPart.query;

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

  if (debug) {
    if (!port) {
      logger.error(`Missing required parameter 'port'.`);
      websocket.send({ data: `Missing required parameter 'port'.` });
      return;
    }

    logger.info(`${language} debugAdapter port is ${port}`);

    const  debugAdapter = new DebugAdapter(Number(port as string), websocket);
  } else {
    if (servicesManager.servicesIsExisted(ws as string)) {
      websocket.send({ data: `${ws} is already exists.` });
      logger.warn(`${ws} is already exists.`);
    } else {
      /* tslint:disable */
      const ServerClass = serverProfiles.find(l => l.language === language).server;
      /* tslint:enable */
      const languageServer = new (<any>ServerClass)(<string>ws, websocket);
      const dispose = languageServer.start();
      servicesManager.push({ dispose, spaceKey: <string>ws, server: languageServer });
    }
  }
});

socket.on('error', (err) => {
  logger.error(err.message);
});

server.listen(PORT, () => {
  logger.info(`Web Server start in ${PORT} port!`);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', err.stack);
  log4js.shutdown(() => {});
});

process.on('SIGINT', clear);

process.on('SIGTERM', clear);

function clear() {
  servicesManager.disposeAll();
  log4js.shutdown(() => {});
  process.exit();
}
