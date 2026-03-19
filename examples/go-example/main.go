package main

import (
	"fmt"
	"net/http"

	reqlog "github.com/reqlog/reqlog-go"
)

func main() {
	rl := reqlog.New(reqlog.Options{Port: 9000})
	if err := rl.Start(); err != nil {
		panic(err)
	}
	defer rl.Stop()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"users":["alice","bob","carol"]}`)
	})
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(201)
		buf := make([]byte, 1024)
		n, _ := r.Body.Read(buf)
		fmt.Fprintf(w, `{"token":"abc123","body":%s}`, buf[:n])
	})
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	fmt.Println("Go app running on http://localhost:3000")
	fmt.Println("reqlog dashboard on http://localhost:9000")
	http.ListenAndServe(":3000", rl.Middleware()(mux))
}
