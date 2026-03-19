package reqlog

import "net/http"

// ChiMiddleware returns a Chi-compatible middleware.
// Chi uses the standard net/http middleware signature, so this is an alias for Middleware().
func (r *Reqlog) ChiMiddleware() func(http.Handler) http.Handler {
	return r.Middleware()
}
