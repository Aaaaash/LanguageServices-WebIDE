import * as io from 'socket.io';
export interface MessageEvent {
  message: string;
}

export interface WebSocketEventMap {
  close: never;
  error: any;
  message: MessageEvent;
  open: {};
}

export interface WebSocket {
  readonly readyState: string;
  close(code?: number, reason?: string): void;
  send(data: string): void;
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
  ): void;
  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
  ): void;
  readonly OPEN: string;
}

export function closeIfOpen(socket: io.Socket): void {
  if (socket.conn.readyState === 'open') {
    // 1000 means normal closure. See
    // https://www.iana.org/assignments/websocket/websocket.xml#close-code-number.
    socket.server.close();
  }
}
