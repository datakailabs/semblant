package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/datakailabs/semblant/internal/api"
	"github.com/datakailabs/semblant/internal/config"
	"github.com/datakailabs/semblant/internal/resume"
)

func main() {
	cfg := config.Load()
	cfg.Validate()

	r, err := resume.Load(cfg.ResumePath)
	if err != nil {
		log.Fatalf("Failed to load resume: %v", err)
	}

	log.Printf("Loaded resume for %s (%d experience entries, %d skill groups)",
		r.Personal.Name, len(r.Experience), len(r.Skills))

	srv := api.NewServer(r, cfg.PDFSecret, cfg.CORSOrigins, cfg.WebDir)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Semblant listening on %s", addr)
	if err := http.ListenAndServe(addr, srv.Router()); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
