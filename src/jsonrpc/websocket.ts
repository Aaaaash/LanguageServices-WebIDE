export interface MessageEvent {
  data: string;
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

export function closeIfOpen(socket: WebSocket): void {
  if (socket.readyState === socket.OPEN) {
    // 1000 means normal closure. See
    // https://www.iana.org/assignments/websocket/websocket.xml#close-code-number.
    socket.close(1000);
  }
}
