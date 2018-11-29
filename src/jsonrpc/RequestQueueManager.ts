import RequestQueue from './RequestQueue';
import {
  isPriorityCommand,
  isDeferredCommand,
  isNormalCommand,
} from './csharpRequests';

class RequestQueueManager {
  /* tslint:disable */
  private _isProcessing: boolean;
  private _priorityQueue: RequestQueue;
  private _normalQueue: RequestQueue;
  private _deferredQueue: RequestQueue;
  /* tslint:enable */
  constructor(makeRequest: (request) => number) {
    this._priorityQueue = new RequestQueue('Priority', 1, makeRequest);
    this._normalQueue = new RequestQueue('Normal', 8, makeRequest);
    this._deferredQueue = new RequestQueue(
      'Deferred',
      Math.max(Math.floor(8 / 4), 2),
      makeRequest,
    );
  }

  /* tslint:disable */
  private getQueue(command: string) {
    if (isPriorityCommand(command)) {
      return this._priorityQueue;
    } else if (isNormalCommand(command)) {
      return this._normalQueue;
    } else {
      return this._deferredQueue;
    }
  }

  public isEmpty() {
    return (
      !this._deferredQueue.hasPending() &&
      !this._normalQueue.hasPending() &&
      !this._priorityQueue.hasPending()
    );
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

    if (this._priorityQueue.isFull()) {
      return false;
    }

    if (this._normalQueue.isFull() && this._deferredQueue.isFull()) {
      return false;
    }

    this._isProcessing = true;

    if (this._priorityQueue.hasPending()) {
      this._priorityQueue.processPending();
      this._isProcessing = false;
      return;
    }

    if (this._normalQueue.hasPending()) {
      this._normalQueue.processPending();
    }

    if (this._deferredQueue.hasPending()) {
      this._deferredQueue.processPending();
    }

    this._isProcessing = false;
  }
}

export default RequestQueueManager;
