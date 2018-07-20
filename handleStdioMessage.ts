import * as io from 'socket.io';
import * as cp from 'child_process';
import { StreamMessageReader } from './messageReader';

import { logger } from './languageServer';
import { IProcess } from './ProcessManager';

const ContentLength: string = 'Content-Length: ';
const CRLF = '\r\n';

export default function handleStdioMessage(socket: io.Socket, lspServerProcess: IProcess) {
  socket.on('message', ({ message }) => {
    try {
      lspServerProcess.process.stdin.write(message);
    } catch (err) {
      if (err.message) {
        logger.error(err.message);
      } else {
        logger.error(err);
      }
    }
  });

  const messageReader = new StreamMessageReader(lspServerProcess.process.stdout);

  messageReader.onError((err) => {
    logger.error(err.message);
  });

  messageReader.listen((data) => {
    const jsonrpcData = JSON.stringify(data);
    Buffer.byteLength(jsonrpcData, 'utf-8');
    const headers: string[] = [
      ContentLength,
      jsonrpcData.length.toString(),
      CRLF,
      CRLF,
    ];
    socket.send({ data: `${headers.join('')}${jsonrpcData}` });
  });
}
