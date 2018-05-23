import * as io from 'socket.io';
import * as cp from 'child_process';
import { StreamMessageReader } from './messageReader';

let ContentLength: string = "Content-Length: ";
let CRLF = "\r\n";

export default function handleMessageIO(socket: io.Socket, process: cp.ChildProcess) {
  socket.on('message', ({ id, data }) => {
    process.stdin.write(data);
  });

  /**
   * 将标准输出转化为messageReader流
   */
  const messageReader = new StreamMessageReader(process.stdout);
  messageReader.listen(data => {
    const jsonrpcData = JSON.stringify(data);
    Buffer.byteLength(jsonrpcData, "utf-8");
    let headers: string[] = [
      ContentLength,
      jsonrpcData.length.toString(),
      CRLF,
      CRLF
    ];
    console.log(socket.id)
    socket.send(`${headers.join("")}${jsonrpcData}`);
  });
}
