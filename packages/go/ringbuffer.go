package reqlog

import "sync"

// RingBuffer is a thread-safe circular buffer that overwrites the oldest entries when full.
type RingBuffer[T interface{ GetID() string }] struct {
	mu       sync.RWMutex
	items    []T
	capacity int
	head     int
	count    int
}

// NewRingBuffer creates a new ring buffer with the given capacity.
func NewRingBuffer[T interface{ GetID() string }](capacity int) *RingBuffer[T] {
	return &RingBuffer[T]{
		items:    make([]T, capacity),
		capacity: capacity,
	}
}

// Push adds an item to the buffer, overwriting the oldest if full.
func (rb *RingBuffer[T]) Push(item T) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	idx := (rb.head + rb.count) % rb.capacity
	if rb.count == rb.capacity {
		// Overwrite oldest
		rb.items[rb.head] = item
		rb.head = (rb.head + 1) % rb.capacity
	} else {
		rb.items[idx] = item
		rb.count++
	}
}

// ToSlice returns all items in order from oldest to newest.
func (rb *RingBuffer[T]) ToSlice() []T {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	result := make([]T, rb.count)
	for i := 0; i < rb.count; i++ {
		result[i] = rb.items[(rb.head+i)%rb.capacity]
	}
	return result
}

// FindByID finds an item by its ID. Returns the item and true if found.
func (rb *RingBuffer[T]) FindByID(id string) (T, bool) {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	for i := 0; i < rb.count; i++ {
		item := rb.items[(rb.head+i)%rb.capacity]
		if item.GetID() == id {
			return item, true
		}
	}
	var zero T
	return zero, false
}

// GetID implements the ID interface for ReqlogEntry.
func (e ReqlogEntry) GetID() string {
	return e.ID
}
