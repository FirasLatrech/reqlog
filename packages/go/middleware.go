package reqlog

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

const maxBodySize = 1 << 20 // 1MB

// Middleware returns a standard net/http middleware that captures requests and responses.
func (r *Reqlog) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			r.mu.RLock()
			blocked := r.blocked
			r.mu.RUnlock()
			if blocked {
				next.ServeHTTP(w, req)
				return
			}

			start := time.Now()

			// Capture request body
			var reqBody []byte
			var reqBodyTruncated bool
			if req.Body != nil {
				reqBody, _ = io.ReadAll(io.LimitReader(req.Body, maxBodySize+1))
				req.Body.Close()
				if len(reqBody) > maxBodySize {
					reqBodyTruncated = true
				}
				// Always restore the full body for downstream handlers
				req.Body = io.NopCloser(bytes.NewReader(reqBody))
			}

			// Wrap response writer to capture
			recorder := &responseRecorder{
				ResponseWriter: w,
				body:           &bytes.Buffer{},
				statusCode:     200,
			}

			next.ServeHTTP(recorder, req)

			latency := time.Since(start).Milliseconds()

			// Build entry
			entry := ReqlogEntry{
				ID:              newUUID(),
				Timestamp:       start.UnixMilli(),
				Method:          req.Method,
				URL:             req.URL.RequestURI(),
				StatusCode:      recorder.statusCode,
				Latency:         latency,
				Slow:            latency > int64(r.opts.SlowThreshold),
				RequestHeaders:  normalizeHeaders(req.Header),
				ResponseHeaders: normalizeHeaders(recorder.Header()),
				AppHost:         req.Host,
			}

			// Request body
			if reqBodyTruncated {
				entry.RequestBody = "[truncated — body exceeded 1MB]"
			} else if len(reqBody) > 0 {
				entry.RequestBody = tryParseJSON(reqBody)
			}

			// Response body
			respBytes := recorder.body.Bytes()
			if len(respBytes) > maxBodySize {
				entry.ResponseBody = "[truncated — body exceeded 1MB]"
			} else {
				entry.ResponseBody = tryParseJSON(respBytes)
			}

			go r.broadcast(entry)
		})
	}
}

func normalizeHeaders(h http.Header) map[string]string {
	result := make(map[string]string, len(h))
	for k, v := range h {
		result[strings.ToLower(k)] = strings.Join(v, ", ")
	}
	return result
}

func tryParseJSON(data []byte) any {
	if len(data) == 0 {
		return nil
	}
	var parsed any
	if err := json.Unmarshal(data, &parsed); err != nil {
		return string(data)
	}
	return parsed
}

// responseRecorder wraps http.ResponseWriter to capture the response.
type responseRecorder struct {
	http.ResponseWriter
	body       *bytes.Buffer
	statusCode int
	wroteHeader bool
}

// Unwrap returns the underlying ResponseWriter, allowing the http package
// to access optional interfaces like http.Hijacker and http.Flusher.
func (r *responseRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}

func (r *responseRecorder) WriteHeader(code int) {
	if !r.wroteHeader {
		r.statusCode = code
		r.wroteHeader = true
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	if !r.wroteHeader {
		r.wroteHeader = true
	}
	if remaining := maxBodySize - r.body.Len(); remaining > 0 {
		if len(b) <= remaining {
			r.body.Write(b)
		} else {
			r.body.Write(b[:remaining])
		}
	}
	return r.ResponseWriter.Write(b)
}
