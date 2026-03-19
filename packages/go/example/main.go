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
	mux.HandleFunc("GET /hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"message":"Hello from Go!"}`)
	})
	mux.HandleFunc("GET /users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]`)
	})
	mux.HandleFunc("POST /echo", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(201)
		buf := make([]byte, 1024)
		n, _ := r.Body.Read(buf)
		fmt.Fprintf(w, `{"echoed":%s}`, buf[:n])
	})

	fmt.Println("[app] Server running at http://localhost:3000")
	fmt.Println("[app] Dashboard at http://localhost:9000")
	http.ListenAndServe(":3000", rl.Middleware()(mux))
}
