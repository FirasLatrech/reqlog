package reqlog

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

var allowedReplayHosts = map[string]bool{
	"localhost": true,
	"127.0.0.1": true,
	"::1":       true,
}

func isLocalHost(appHost string) bool {
	host := appHost
	if h, _, err := net.SplitHostPort(appHost); err == nil {
		host = h
	}
	return allowedReplayHosts[host]
}

type replayResponse struct {
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    any               `json:"body"`
}

func (r *Reqlog) handleReplay(w http.ResponseWriter, req *http.Request) {
	id := req.PathValue("id")

	entry, found := r.buffer.FindByID(id)
	if !found {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Request %s not found", id)})
		return
	}

	if !isLocalHost(entry.AppHost) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(403)
		json.NewEncoder(w).Encode(map[string]string{"error": "Replay only allowed to localhost"})
		return
	}

	// Build the replay request
	var bodyReader io.Reader
	if entry.RequestBody != nil {
		bodyBytes, err := json.Marshal(entry.RequestBody)
		if err == nil {
			bodyReader = bytes.NewReader(bodyBytes)
		}
	}

	targetURL := fmt.Sprintf("http://%s%s", entry.AppHost, entry.URL)
	proxyReq, err := http.NewRequest(entry.Method, targetURL, bodyReader)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(500)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to build replay request"})
		return
	}

	// Copy original request headers
	for k, v := range entry.RequestHeaders {
		proxyReq.Header.Set(k, v)
	}

	// Disable redirects to prevent SSRF via redirect to internal services
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return errors.New("redirects are disabled for replay")
		},
	}
	resp, err := client.Do(proxyReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(502)
		json.NewEncoder(w).Encode(map[string]string{"error": "Replay request failed"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	// Normalize response headers
	headers := make(map[string]string)
	for k, v := range resp.Header {
		headers[strings.ToLower(k)] = strings.Join(v, ", ")
	}

	// Try to parse body as JSON
	var parsedBody any
	if err := json.Unmarshal(respBody, &parsedBody); err != nil {
		parsedBody = string(respBody)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(replayResponse{
		Status:  resp.StatusCode,
		Headers: headers,
		Body:    parsedBody,
	})
}
