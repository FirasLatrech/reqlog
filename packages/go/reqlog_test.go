package reqlog

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("failed to get free port: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	return port
}

func TestRingBuffer_PushAndToSlice(t *testing.T) {
	rb := NewRingBuffer[ReqlogEntry](3)

	rb.Push(ReqlogEntry{ID: "1"})
	rb.Push(ReqlogEntry{ID: "2"})

	items := rb.ToSlice()
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].ID != "1" || items[1].ID != "2" {
		t.Fatalf("unexpected order: %v", items)
	}
}

func TestRingBuffer_Overflow(t *testing.T) {
	rb := NewRingBuffer[ReqlogEntry](2)

	rb.Push(ReqlogEntry{ID: "1"})
	rb.Push(ReqlogEntry{ID: "2"})
	rb.Push(ReqlogEntry{ID: "3"})

	items := rb.ToSlice()
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].ID != "2" || items[1].ID != "3" {
		t.Fatalf("expected oldest overwritten, got: %v", items)
	}
}

func TestRingBuffer_FindByID(t *testing.T) {
	rb := NewRingBuffer[ReqlogEntry](10)
	rb.Push(ReqlogEntry{ID: "abc", URL: "/test"})
	rb.Push(ReqlogEntry{ID: "def", URL: "/other"})

	entry, found := rb.FindByID("abc")
	if !found {
		t.Fatal("expected to find entry")
	}
	if entry.URL != "/test" {
		t.Fatalf("expected /test, got %s", entry.URL)
	}

	_, found = rb.FindByID("nonexistent")
	if found {
		t.Fatal("expected not found")
	}
}

func TestMiddleware_CapturesRequests(t *testing.T) {
	rl := New(Options{Port: 0, MaxRequests: 100, SlowThreshold: 200})

	handler := rl.Middleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(201)
		fmt.Fprint(w, `{"ok":true}`)
	}))

	req := httptest.NewRequest("POST", "/api/test?q=1", strings.NewReader(`{"name":"reqlog"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Host = "localhost:3000"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	// Give broadcast goroutine time to complete
	time.Sleep(50 * time.Millisecond)

	entries := rl.buffer.ToSlice()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	entry := entries[0]
	if entry.Method != "POST" {
		t.Errorf("expected POST, got %s", entry.Method)
	}
	if entry.URL != "/api/test?q=1" {
		t.Errorf("expected /api/test?q=1, got %s", entry.URL)
	}
	if entry.StatusCode != 201 {
		t.Errorf("expected 201, got %d", entry.StatusCode)
	}
	if entry.AppHost != "localhost:3000" {
		t.Errorf("expected localhost:3000, got %s", entry.AppHost)
	}
}

func TestMiddleware_BlockedInProduction(t *testing.T) {
	t.Setenv("GO_ENV", "production")

	rl := New(Options{Port: 0})
	err := rl.Start()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer rl.Stop()

	if !rl.IsBlocked() {
		t.Fatal("expected reqlog to be blocked in production")
	}

	if rl.Port() != 0 {
		t.Fatal("expected no port when blocked")
	}
}

func TestMiddleware_AllowInProd(t *testing.T) {
	t.Setenv("GO_ENV", "production")

	rl := New(Options{Port: freePort(t), AllowInProd: true})
	err := rl.Start()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	defer rl.Stop()

	if rl.IsBlocked() {
		t.Fatal("expected reqlog to NOT be blocked with AllowInProd")
	}

	if rl.Port() == 0 {
		t.Fatal("expected server to be listening")
	}
}

func TestServer_StartsAndServesAPI(t *testing.T) {
	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	port := rl.Port()
	if port == 0 {
		t.Fatal("expected non-zero port")
	}

	// GET /api/requests should return empty array
	resp, err := http.Get(fmt.Sprintf("http://localhost:%d/api/requests", port))
	if err != nil {
		t.Fatalf("failed to GET /api/requests: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var entries []ReqlogEntry
	json.NewDecoder(resp.Body).Decode(&entries)
	if len(entries) != 0 {
		t.Fatalf("expected empty array, got %d entries", len(entries))
	}
}

func TestServer_APIRequestsReturnsEntries(t *testing.T) {
	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	rl.buffer.Push(ReqlogEntry{ID: "test-1", Method: "GET", URL: "/hello"})

	resp, err := http.Get(fmt.Sprintf("http://localhost:%d/api/requests", rl.Port()))
	if err != nil {
		t.Fatalf("failed to GET: %v", err)
	}
	defer resp.Body.Close()

	var entries []ReqlogEntry
	json.NewDecoder(resp.Body).Decode(&entries)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].ID != "test-1" {
		t.Fatalf("expected test-1, got %s", entries[0].ID)
	}
}

func TestReplay_LocalhostOnly(t *testing.T) {
	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	rl.buffer.Push(ReqlogEntry{
		ID:      "remote-1",
		Method:  "GET",
		URL:     "/test",
		AppHost: "example.com:3000",
	})

	client := &http.Client{}
	req, _ := http.NewRequest("POST", fmt.Sprintf("http://localhost:%d/api/replay/remote-1", rl.Port()), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to POST: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 403 {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "Replay only allowed to localhost") {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestReplay_NotFound(t *testing.T) {
	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	client := &http.Client{}
	req, _ := http.NewRequest("POST", fmt.Sprintf("http://localhost:%d/api/replay/nonexistent", rl.Port()), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to POST: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestReplay_ForwardsToLocalhost(t *testing.T) {
	// Start a target server
	targetHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(201)
		fmt.Fprint(w, `{"replayed":true}`)
	})
	targetServer := httptest.NewServer(targetHandler)
	defer targetServer.Close()

	// Extract port from target
	_, targetPort, _ := net.SplitHostPort(strings.TrimPrefix(targetServer.URL, "http://"))

	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	rl.buffer.Push(ReqlogEntry{
		ID:             "local-1",
		Method:         "GET",
		URL:            "/hello",
		AppHost:        fmt.Sprintf("localhost:%s", targetPort),
		RequestHeaders: map[string]string{"content-type": "application/json"},
	})

	client := &http.Client{}
	req, _ := http.NewRequest("POST", fmt.Sprintf("http://localhost:%d/api/replay/local-1", rl.Port()), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to POST: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, body)
	}

	var result replayResponse
	json.NewDecoder(resp.Body).Decode(&result)
	if result.Status != 201 {
		t.Fatalf("expected replay status 201, got %d", result.Status)
	}
}

func TestSSE_ReceivesEntries(t *testing.T) {
	rl := New(Options{Port: freePort(t), MaxRequests: 100})
	err := rl.Start()
	if err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer rl.Stop()

	// Connect to SSE
	resp, err := http.Get(fmt.Sprintf("http://localhost:%d/events", rl.Port()))
	if err != nil {
		t.Fatalf("failed to connect to SSE: %v", err)
	}
	defer resp.Body.Close()

	if resp.Header.Get("Content-Type") != "text/event-stream" {
		t.Fatalf("expected text/event-stream, got %s", resp.Header.Get("Content-Type"))
	}

	// Broadcast an entry
	rl.broadcast(ReqlogEntry{ID: "sse-test", URL: "/sse", Method: "GET", StatusCode: 200})

	// Read from SSE stream with timeout
	done := make(chan string, 1)
	go func() {
		buf := make([]byte, 4096)
		n, _ := resp.Body.Read(buf)
		done <- string(buf[:n])
	}()

	select {
	case data := <-done:
		if !strings.Contains(data, "sse-test") {
			t.Fatalf("expected sse-test in SSE data, got: %s", data)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("SSE timeout — no data received")
	}
}

func TestIsLocalHost(t *testing.T) {
	tests := []struct {
		host     string
		expected bool
	}{
		{"localhost:3000", true},
		{"127.0.0.1:8080", true},
		{"[::1]:3000", true},
		{"0.0.0.0:3000", false},
		{"example.com:3000", false},
		{"192.168.1.1:3000", false},
	}

	for _, tt := range tests {
		if got := isLocalHost(tt.host); got != tt.expected {
			t.Errorf("isLocalHost(%q) = %v, want %v", tt.host, got, tt.expected)
		}
	}
}
