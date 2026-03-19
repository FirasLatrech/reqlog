import { describe, it, expect } from 'bun:test';
import { RingBuffer } from '../ring-buffer.ts';

describe('RingBuffer', () => {
  it('push adds items', () => {
    const buf = new RingBuffer<{ id: string; value: number }>(3);
    buf.push({ id: 'a', value: 1 });
    buf.push({ id: 'b', value: 2 });
    expect(buf.toArray()).toHaveLength(2);
    expect(buf.toArray()[0]).toEqual({ id: 'a', value: 1 });
    expect(buf.toArray()[1]).toEqual({ id: 'b', value: 2 });
  });

  it('push evicts oldest item when at capacity', () => {
    const buf = new RingBuffer<{ id: string; value: number }>(2);
    buf.push({ id: 'a', value: 1 });
    buf.push({ id: 'b', value: 2 });
    buf.push({ id: 'c', value: 3 });
    const arr = buf.toArray();
    expect(arr).toHaveLength(2);
    expect(arr[0].id).toBe('b');
    expect(arr[1].id).toBe('c');
  });

  it('toArray returns a copy', () => {
    const buf = new RingBuffer<{ id: string }>(3);
    buf.push({ id: 'x' });
    const arr = buf.toArray();
    arr.push({ id: 'injected' });
    expect(buf.toArray()).toHaveLength(1);
  });

  it('findById returns correct item', () => {
    const buf = new RingBuffer<{ id: string; value: number }>(3);
    buf.push({ id: 'a', value: 10 });
    buf.push({ id: 'b', value: 20 });
    const found = buf.findById('b');
    expect(found).toBeDefined();
    expect(found?.value).toBe(20);
  });

  it('findById returns undefined for missing id', () => {
    const buf = new RingBuffer<{ id: string }>(3);
    buf.push({ id: 'a' });
    expect(buf.findById('nonexistent')).toBeUndefined();
  });

  it('zero-capacity does not throw and toArray returns []', () => {
    expect(() => new RingBuffer<{ id: string }>(0)).not.toThrow();
    const buf = new RingBuffer<{ id: string }>(0);
    expect(buf.toArray()).toEqual([]);
  });
});
