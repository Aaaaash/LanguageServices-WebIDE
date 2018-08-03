/* tslint:disable */
import * as net from 'net';

const port = parseInt(process.argv[2], 10);

const CR_LF = '\r\n';

const initialize = JSON.stringify({
  "arguments":{
    clientID:'cloud-studio',
    clientName:'cloud-studio',
    adapterID:'java',
    pathFormat:'path',
    linesStartAt1:true,
    columnsStartAt1:true,
    supportsVariableType:true,
    supportsVariablePaging:true,
    supportsRunInTerminalRequest:true,
    locale:'en-us'
  },
  "command":"initialize",
  "seq":1,
  "type":"request"
});

const initialized = JSON.stringify({
  "type":"event",
  "event":"initialized",
  "seq":2
});
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

const launch = JSON.stringify({
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
    "debugServer":`${port}`,
    "mainClass":"net.coding.demo.Application"
  },
});

const timeout = 5000;

const socket = net.createConnection({ port }, (connection) => {
  console.log(`connect, port: ${port}`);

  socket.emit('data', `Content-Length: ${Buffer.byteLength(initialize, 'utf8')}${CR_LF}${CR_LF}${initialize}`);

  setTimeout(() => {
    socket.emit('data', `Content-Length: ${Buffer.byteLength(initialized, 'utf8')}${CR_LF}${CR_LF}${initialized}`);
  }, timeout / 2)

  setTimeout(() => {
    socket.emit('data', `Content-Length: ${Buffer.byteLength(launch, 'utf8')}${CR_LF}${CR_LF}${launch}`);
  }, timeout);
});

socket.on('data', (data) => {
  console.log('response');
  console.log(data.toString());
});

socket.on('error', (err) => {
  console.log(err.message);
});
