import RequestQueue from '../../protocol/RequestQueue';
import { LSPRequest } from '../../protocol/Request';

class RequestQueueManager<T extends LSPRequest>{
  /* tslint:disable */
  private _isProcessing: boolean;
  private _defaultQueue: RequestQueue<T>;
  /* tslint:enable */
  constructor(makeRequest: (request) => number) {
    this._defaultQueue = new RequestQueue('Default', 8, makeRequest);
  }

  /* tslint:disable */
  private getQueue(command: string) {
    return this._defaultQueue;
  }

  public isEmpty() {
    return !this._defaultQueue.hasPending();
  }

  public enqueue(request) {
    const queue = this.getQueue(request.command);
    queue.enqueue(request);

    this.drain();
  }

  public dequeue(command: string, seq: number) {
    const queue = this.getQueue(command);
    return queue.dequeue(seq);
  }

  public cancelRequest(request) {
    const queue = this.getQueue(request.command);
    queue.cancelRequest(request);
  }

  public drain() {
    if (this._isProcessing) {
      return false;
    }

    if (this._defaultQueue.isFull()) {
      return false;
    }
    this._isProcessing = true;

    if (this._defaultQueue.hasPending()) {
      this._defaultQueue.processPending();
      this._isProcessing = false;
      return;
    }

    this._isProcessing = false;
  }
}

export default RequestQueueManager;