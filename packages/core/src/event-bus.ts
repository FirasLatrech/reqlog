import { EventEmitter } from 'events';
import type { ReqlogEntry } from './types.js';

export class EventBus extends EventEmitter {
  emitRequest(entry: ReqlogEntry): void {
    this.emit('request', entry);
  }

  onRequest(listener: (entry: ReqlogEntry) => void): this {
    return this.on('request', listener);
  }
}
