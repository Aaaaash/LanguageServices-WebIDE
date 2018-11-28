import { LSPRequest } from './Request';

class RequestQueue<T extends LSPRequest> {
  /* tslint:disable */
  private _pending: any[] = [];
  private _waiting: Map<number, any> = new Map<number, any>();

  public constructor(
    private _name: string,
    private _maxSize: number,
    private _makeRequest: (request: T) => number,
    /* tslint:enable */
  ) {}

  /**
   * Enqueue a new request.
   */
  public enqueue(request: T) {
    this._pending.push(request);
  }

  /**
   * Dequeue a request that has completed.
   */
  public dequeue(id: number) {
    const request = this._waiting.get(id);

    if (request) {
      this._waiting.delete(id);
    }

    return request;
  }

  public cancelRequest(request: T) {
    const index = this._pending.indexOf(request);
    if (index !== -1) {
      this._pending.splice(index, 1);

      // Note: This calls reject() on the promise returned by OmniSharpServer.makeRequest
      request.onError(
        new Error(`Pending request cancelled: ${request.command}`),
      );
    }

    // TODO: Handle cancellation of a request already waiting on the OmniSharp server.
  }

  /**
   * Returns true if there are any requests pending to be sent to the OmniSharp server.
   */
  public hasPending() {
    return this._pending.length > 0;
  }

  public isFull() {
    return this._waiting.size >= this._maxSize;
  }

  /**
   * Process any pending requests and send them to the OmniSharp server.
   */
  public processPending() {
    if (this._pending.length === 0) {
      return;
    }
    const slots = this._maxSize - this._waiting.size;

    for (let i = 0; i < slots && this._pending.length > 0; i += 1) {
      const item = this._pending.shift();
      item.startTime = Date.now();

      const id = this._makeRequest(item);
      this._waiting.set(id, item);

      if (this.isFull()) {
        break;
      }
    }
  }
}

export default RequestQueue;
