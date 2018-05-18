import * as net from 'net';
import * as express from 'express';
import * as url from 'url';
import * as ws from 'ws';
import * as socket from 'socket.io';
import * as path from 'path';
import * as rpc from 'vscode-ws-jsonrpc';
import * as cp from 'child_process';
import * as readline from 'readline';
import { StreamMessageReader, StreamMessageWriter, createProtocolConnection, Logger, InitializeRequest, DidOpenTextDocumentNotification, ParameterInformation, MessageReader } from 'vscode-languageserver-protocol';
import { createConnection } from 'vscode-languageserver/lib/main';


function prepareParams(workspacePath = '/Users/sakura/Documents/java/spring-boot-start') {
  let params = [];
	params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=10345,quiet=y');
	params.push('-Declipse.application=org.eclipse.jdt.ls.core.id1');
  params.push('-Dosgi.bundles.defaultStartLevel=4');
  params.push('-Declipse.product=org.eclipse.jdt.ls.core.product');
  params.push('-Dlog.level=ALL');
	params.push('-jar');
	params.push('/Users/sakura/lsp/vscode-java/server/plugins/org.eclipse.equinox.launcher_1.5.0.v20180207-1446.jar')
	let configDir = 'config_win';
	if (process.platform === 'darwin') {
			configDir = 'config_mac';
	}
	else if (process.platform === 'linux') {
			configDir = 'config_linux';
	}
	params.push('-configuration');
	params.push('/Users/sakura/lsp/vscode-java/server/config_mac');
	params.push('-data');
	params.push(workspacePath);
	return params;
}
function prepareExecutable() {
	const javahome = '/Library/java/JavaVirtualMachines/jdk1.8.0_131.jdk/Contents/Home';
	let executable = Object.create(null);
	let options = Object.create(null);
	options.env = process.env;
	options.stdio = 'pipe';
	executable.options = options;
	executable.command = 'java';
	executable.args = prepareParams();
	return executable;
}

const app = express()

const httpserver = app.listen(9988, () => {
	console.log('httpserver listen in port : 9988');
});

const webSocket = new ws.Server({
	noServer: true,
  perMessageDeflate: false,
  maxPayload: 100 * 1024 * 1024,
});

let tcpServr;
let tcpSocket;
let clientSocket;
tcpServr = net.createServer((socket) => {
  tcpSocket = socket;
  socket.on('connect', () => {
    console.log('java lsp is connected!');
  })

  socket.on('data', (data) => {
    if (clientSocket) {
      clientSocket.send(data.toString());
    }
    console.log(data.toString());
  })

  socket.on('end', (end) => {
    console.log(end, 'the end');
  })
  socket.pipe(socket);
})

tcpServr.listen(13245, () => {
  console.log('waitting for java lsp connect!');
})
function launch(socketconnect) {
  clientSocket = socketconnect;
  const args = prepareParams();  

  const envOptions = {
    env: {
      CLIENT_PORT: 13245,
    }
  }

  if (socketconnect && tcpSocket) {
    socketconnect.onMessage((data) => {
      tcpSocket.write(data);
    })
  }
  // const tspProcess: cp.ChildProcess = cp.spawn('java', args, envOptions);
  // tspProcess.on('error', (err) => {
  //   console.log(err);
  // });
  socketconnect.onClose(() => {
    // tspProcess.kill();
  });
  // if (!tcpServr) {
    
  // }
}

httpserver.on('upgrade', (req, socket, head) => {
	const pathname = req.url ? url.parse(req.url).pathname : undefined;
	if (pathname === '/java') {
		webSocket.handleUpgrade(req, socket, head, (web_socket) => {
			const socketconnect = {
				send: content =>
				web_socket.send(content, (error) => {
            if (error) {
              throw error;
            }
          }),
        onMessage: cb => web_socket.on('message', cb),
        onError: cb => web_socket.on('error', cb),
        onClose: cb => web_socket.on('close', cb),
        dispose: () => web_socket.close(),
			};
			if (web_socket.readyState === web_socket.OPEN) {
        launch(socketconnect);
      }
		})
	}
})
