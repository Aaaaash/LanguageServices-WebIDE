/* tslint:disable */
import * as net from 'net';

const port = parseInt(process.argv[2], 10);

const initialize = `Content-Length: 312\r\n
\r\n
{
    "arguments": {
      clientID: 'cloud-studio',
      clientName: 'cloud-studio',
      adapterID: 'java',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true,
      locale: 'en-us'
    },
    "command": "initialize",
    "seq": 1,
    "type": "request"
}`;

const initialized = `Content-Length: 51\r\n\r\b
{
  "type": "event",
  "event": "initialized",
  "seq": 2
}`;
/**
		 * {
		 * 	type: "request",
		 * 	seq: 3,
		 *  command: "launch",
		 * 	arguments: {
		 * "type": "java",
			"name": "Debug (Launch)",
			"request": "launch",
			"cwd": "${workspaceFolder}",
			"console": "internalConsole",
			"stopOnEntry": false,
			"args": "",
			// "output": ""
			"internalConsoleOptions": "neverOpen",
			"debugServer": 4711,
		 * }
		 * }
		 */

const launch = `Content-Length: 338 \r\n\r\n
{
  "type":"request",
  "seq":3,"command":"launch",
  "arguments":{
    "type":"java",
    "name":"Debug (Launch)",
    "request":"launch",
    "cwd":"file:///data/coding-ide-home/workspace/esyfrs/working-dir",
    "console":"internalConsole",
    "stopOnEntry":false,
    "args":"",
    "internalConsoleOptions":"neverOpen",
    "debugServer":4711,
    "mainClass":"net.coding.demo.Application"
  }
}`;

const timeout = 10000;

const socket = net.createConnection({ port }, (connection) => {
  console.log(`connect, port: ${port}`);

  socket.emit('data', initialize);

  socket.emit('data', initialized);
  setTimeout(() => {
    socket.emit('data', launch);
  }, timeout);
});

socket.on('data', (data) => {
  console.log('response');
  console.log(data.toString());
});
