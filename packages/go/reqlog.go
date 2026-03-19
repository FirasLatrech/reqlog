// Package reqlog provides a live HTTP request dashboard for Go web applications.
// It captures every request hitting your server and displays them in a real-time
// browser dashboard with full request/response inspection, latency tracking, and replay.
package reqlog

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ReqlogEntry represents a captured HTTP request/response pair.
type ReqlogEntry struct {
	ID              string            `json:"id"`
	Timestamp       int64             `json:"timestamp"`
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	StatusCode      int               `json:"statusCode"`
	Latency         int64             `json:"latency"`
	Slow            bool              `json:"slow"`
	RequestHeaders  map[string]string `json:"requestHeaders"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	RequestBody     any               `json:"requestBody"`
	ResponseBody    any               `json:"responseBody"`
	AppHost         string            `json:"appHost"`
}

// Options configures the reqlog instance.
type Options struct {
	Port          int  // Dashboard port (default: 9000)
	MaxRequests   int  // Max entries in ring buffer (default: 200)
	SlowThreshold int  // Latency threshold in ms to flag slow requests (default: 200)
	AutoOpen      bool // Auto-open browser on start (default: true)
	AllowInProd   bool // Allow running in production (default: false)
}

func (o Options) withDefaults() Options {
	if o.Port == 0 {
		o.Port = 9000
	}
	if o.MaxRequests == 0 {
		o.MaxRequests = 200
	}
	if o.SlowThreshold == 0 {
		o.SlowThreshold = 200
	}
	return o
}

// Reqlog is the main reqlog instance that runs the dashboard server and provides middleware.
type Reqlog struct {
	opts       Options
	buffer     *RingBuffer[ReqlogEntry]
	sse        *sseManager
	server     *http.Server
	listener   net.Listener
	blocked    bool
	mu         sync.RWMutex
	dashboardFS fs.FS
}

// New creates a new Reqlog instance with the given options.
func New(opts Options) *Reqlog {
	opts = opts.withDefaults()
	r := &Reqlog{
		opts:   opts,
		buffer: NewRingBuffer[ReqlogEntry](opts.MaxRequests),
		sse:    newSSEManager(),
	}
	return r
}

var localOriginRe = regexp.MustCompile(`^https?://(localhost|127\.0\.0\.1)(:\d+)?$`)

func (r *Reqlog) buildMux() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /events", r.handleSSE)
	mux.HandleFunc("GET /api/requests", r.handleGetRequests)
	mux.HandleFunc("POST /api/replay/{id}", r.handleReplay)

	// Dashboard static files
	if r.dashboardFS != nil {
		fileServer := http.FileServer(http.FS(r.dashboardFS))
		mux.Handle("/", fileServer)
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			fmt.Fprint(w, "<html><body><h1>reqlog</h1><p>Dashboard not available (embedded files not found)</p></body></html>")
		})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		origin := req.Header.Get("Origin")
		if localOriginRe.MatchString(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}

		if req.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}

		mux.ServeHTTP(w, req)
	})
}

func (r *Reqlog) handleGetRequests(w http.ResponseWriter, req *http.Request) {
	entries := r.buffer.ToSlice()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func (r *Reqlog) handleSSE(w http.ResponseWriter, req *http.Request) {
	r.sse.Handle(w, req, r.buffer.ToSlice())
}

// Start starts the dashboard HTTP server. It blocks until the server is ready.
// In production (GO_ENV=production or APP_ENV=production), it will no-op unless AllowInProd is set.
func (r *Reqlog) Start() error {
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = os.Getenv("APP_ENV")
	}
	if strings.EqualFold(env, "production") && !r.opts.AllowInProd {
		log.Println("[reqlog] BLOCKED: reqlog is disabled in production. To override, set AllowInProd: true — only do this if you understand the security implications.")
		r.mu.Lock()
		r.blocked = true
		r.mu.Unlock()
		return nil
	}

	r.dashboardFS = getDashboardFS()

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", r.opts.Port))
	if err != nil {
		return fmt.Errorf("[reqlog] failed to listen on port %d: %w", r.opts.Port, err)
	}
	r.listener = ln

	r.server = &http.Server{
		Handler:           r.buildMux(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	actualPort := ln.Addr().(*net.TCPAddr).Port
	log.Printf("[reqlog] Dashboard running at http://localhost:%d", actualPort)

	go r.server.Serve(ln)
	return nil
}

// Stop gracefully shuts down the dashboard server.
func (r *Reqlog) Stop() error {
	r.sse.CloseAll()
	if r.server == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return r.server.Shutdown(ctx)
}

func (r *Reqlog) broadcast(entry ReqlogEntry) {
	r.mu.RLock()
	blocked := r.blocked
	r.mu.RUnlock()
	if blocked {
		return
	}

	r.buffer.Push(entry)
	data, err := json.Marshal(entry)
	if err != nil {
		return
	}
	r.sse.Broadcast(fmt.Sprintf("data: %s\n\n", data))
}

// IsBlocked returns true if reqlog is blocked (e.g. production mode without AllowInProd).
func (r *Reqlog) IsBlocked() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.blocked
}

// Port returns the actual port the dashboard is listening on, or 0 if not started.
func (r *Reqlog) Port() int {
	if r.listener == nil {
		return 0
	}
	return r.listener.Addr().(*net.TCPAddr).Port
}
