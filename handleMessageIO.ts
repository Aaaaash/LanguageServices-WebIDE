import * as io from 'socket.io';
import * as cp from 'child_process';
import { StreamMessageReader } from './messageReader';

let ContentLength: string = "Content-Length: ";
let CRLF = "\r\n";

export default function handleMessageIO(socket: io.Socket, process: cp.ChildProcess) {
  socket.on('message', ({ uri, message }) => {
    let fileUri;
    fileUri = uri;
    process.stdin.write(message);

    const messageReader = new StreamMessageReader(process.stdout);
    messageReader.listen((data) => {
      const jsonrpcData = JSON.stringify(data);
      Buffer.byteLength(jsonrpcData, "utf-8");
      let headers: string[] = [
        ContentLength,
        jsonrpcData.length.toString(),
        CRLF,
        CRLF
      ];
      socket.send({ uri: fileUri, data: `${headers.join("")}${jsonrpcData}` });
    });
  });
}
