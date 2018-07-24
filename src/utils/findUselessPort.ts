import * as net from 'net';
import { resolve } from 'dns';

let portrange = 8080;

function findUselessPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const port = portrange;
    portrange += 1;

    const server = net.createServer();
    server.listen(port, (err) => {
      server.once('close', () => {
        resolve(port);
      });
      server.close();
    });
    server.on('error', () => {
      return findUselessPort();
    });
  });
}

export default findUselessPort;
