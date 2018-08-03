import * as net from 'net';

const port = parseInt(process.argv[2], 10);

const initialize = `Content-Length: 312\r\n
\r\n
{
    "arguments": {
        "adapterID": "PyDev",
        "clientID": "vscode",
        "clientName": "Visual Studio Code",
        "columnsStartAt1": true,
        "linesStartAt1": true,
        "locale": "en-us",
        "pathFormat": "path",
        "supportsRunInTerminalRequest": true,
        "supportsVariablePaging": true,
        "supportsVariableType": true
    },
    "command": "initialize",
    "seq": 1,
    "type": "request"
}`;

const initialized = `Content-Length: 51\r\n\r\b{"type": "event", "event": "initialized", "seq": 2}`;
const socket = net.createConnection({ port }, (connection) => {
  console.log(`connect, port: ${port}`);

  socket.emit('data', initialize);
});

socket.on('data', (data) => {
  console.log('response');
  console.log(data.toString());

  socket.emit('data', initialized);
});
