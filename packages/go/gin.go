//go:build gin

package reqlog

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
)

// GinMiddleware returns a Gin middleware that captures requests and responses.
func (r *Reqlog) GinMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		r.mu.RLock()
		blocked := r.blocked
		r.mu.RUnlock()
		if blocked {
			c.Next()
			return
		}

		start := time.Now()

		// Capture request body
		var reqBody []byte
		if c.Request.Body != nil {
			reqBody, _ = io.ReadAll(io.LimitReader(c.Request.Body, maxBodySize+1))
			c.Request.Body.Close()
			truncated := len(reqBody) > maxBodySize
			if truncated {
				reqBody = nil
			}
			c.Request.Body = io.NopCloser(bytes.NewReader(reqBody))
		}

		// Capture response body
		blw := &ginBodyWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		latency := time.Since(start).Milliseconds()

		entry := ReqlogEntry{
			ID:              newUUID(),
			Timestamp:       start.UnixMilli(),
			Method:          c.Request.Method,
			URL:             c.Request.URL.RequestURI(),
			StatusCode:      c.Writer.Status(),
			Latency:         latency,
			Slow:            latency > int64(r.opts.SlowThreshold),
			RequestHeaders:  normalizeHeaders(c.Request.Header),
			ResponseHeaders: normalizeHeaders(c.Writer.Header()),
			AppHost:         c.Request.Host,
		}

		if reqBody != nil && len(reqBody) <= maxBodySize {
			entry.RequestBody = tryParseJSON(reqBody)
		} else if reqBody == nil && c.Request.ContentLength > 0 {
			entry.RequestBody = "[truncated — body exceeded 1MB]"
		}

		respBytes := blw.body.Bytes()
		if len(respBytes) > maxBodySize {
			entry.ResponseBody = "[truncated — body exceeded 1MB]"
		} else {
			entry.ResponseBody = tryParseJSON(respBytes)
		}

		go r.broadcast(entry)
	}
}

type ginBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *ginBodyWriter) Write(b []byte) (int, error) {
	if w.body.Len() < maxBodySize {
		w.body.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

func (w *ginBodyWriter) WriteString(s string) (int, error) {
	if w.body.Len() < maxBodySize {
		w.body.WriteString(s)
	}
	return w.ResponseWriter.WriteString(s)
}
