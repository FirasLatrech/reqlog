import { describe, it, expect } from 'bun:test';
import { EventBus } from '../event-bus.ts';
import type { ReqlogEntry } from '../types.ts';

function makeEntry(overrides: Partial<ReqlogEntry> = {}): ReqlogEntry {
  return {
    id: 'test-id',
    timestamp: Date.now(),
    method: 'GET',
    url: '/test',
    statusCode: 200,
    latency: 10,
    slow: false,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: undefined,
    appHost: 'localhost:3000',
    ...overrides,
  };
}

describe('EventBus', () => {
  it('emitRequest triggers onRequest listener with the entry', () => {
    const bus = new EventBus();
    const received: ReqlogEntry[] = [];

    bus.onRequest((entry) => {
      received.push(entry);
    });

    const entry = makeEntry({ id: 'abc-123' });
    bus.emitRequest(entry);

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(entry);
    expect(received[0].id).toBe('abc-123');
  });

  it('multiple listeners all receive the event', () => {
    const bus = new EventBus();
    const calls: number[] = [];

    bus.onRequest(() => calls.push(1));
    bus.onRequest(() => calls.push(2));
    bus.onRequest(() => calls.push(3));

    bus.emitRequest(makeEntry());

    expect(calls).toEqual([1, 2, 3]);
  });
});
