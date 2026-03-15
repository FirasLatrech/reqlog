export class RingBuffer<T extends { id: string }> {
  private buf: (T | undefined)[];
  private head = 0;
  private size = 0;
  private cap: number;

  constructor(capacity: number) {
    this.cap = capacity > 0 ? capacity : 1;
    this.buf = new Array(this.cap);
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.cap;
    if (this.size < this.cap) this.size++;
  }

  toArray(): T[] {
    if (this.size < this.cap) {
      return this.buf.slice(0, this.size) as T[];
    }
    const tail = this.buf.slice(this.head) as T[];
    const front = this.buf.slice(0, this.head) as T[];
    return [...tail, ...front];
  }

  findById(id: string): T | undefined {
    return this.toArray().find(item => item.id === id);
  }
}
