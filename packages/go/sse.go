package reqlog

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

const (
	maxSSEClients = 50
	pingInterval  = 30 * time.Second
)

type sseClient struct {
	mu      sync.Mutex
	w       http.ResponseWriter
	flusher http.Flusher
	done    chan struct{}
}

func (c *sseClient) write(data string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	fmt.Fprint(c.w, data)
	c.flusher.Flush()
}

type sseManager struct {
	mu      sync.Mutex
	clients map[*sseClient]struct{}
}

func newSSEManager() *sseManager {
	return &sseManager{
		clients: make(map[*sseClient]struct{}),
	}
}

// Handle registers a new SSE client, sends existing entries, then keeps the connection open.
func (m *sseManager) Handle(w http.ResponseWriter, r *http.Request, existing []ReqlogEntry) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	m.mu.Lock()
	if len(m.clients) >= maxSSEClients {
		m.mu.Unlock()
		http.Error(w, "Too many SSE clients", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	client := &sseClient{
		w:       w,
		flusher: flusher,
		done:    make(chan struct{}),
	}

	// Send existing entries before registering (still under lock, no broadcasts yet for this client)
	for _, entry := range existing {
		data, err := json.Marshal(entry)
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
	}
	flusher.Flush()

	// Register client — check + add in same critical section to prevent TOCTOU
	m.clients[client] = struct{}{}
	m.mu.Unlock()

	// Keepalive ping
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			m.remove(client)
			return
		case <-client.done:
			return
		case <-ticker.C:
			client.write(": ping\n\n")
		}
	}
}

// Broadcast sends data to all connected SSE clients.
func (m *sseManager) Broadcast(data string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for client := range m.clients {
		client.write(data)
	}
}

// CloseAll disconnects all SSE clients.
func (m *sseManager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for client := range m.clients {
		close(client.done)
		delete(m.clients, client)
	}
}

func (m *sseManager) remove(client *sseClient) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.clients, client)
}
