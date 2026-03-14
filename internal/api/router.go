package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/datakailabs/semblant/internal/resume"
)

type Server struct {
	resume      *resume.Resume
	pdfSecret   string
	corsOrigins []string
	webDir      string
}

func NewServer(r *resume.Resume, pdfSecret, corsOrigins, webDir string) *Server {
	origins := []string{"*"}
	if corsOrigins != "" && corsOrigins != "*" {
		origins = strings.Split(corsOrigins, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
	}
	return &Server{
		resume:      r,
		pdfSecret:   pdfSecret,
		corsOrigins: origins,
		webDir:      webDir,
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)
	r.Use(middleware.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: s.corsOrigins,
		AllowedMethods: []string{"GET", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	}))

	// Public endpoints with rate limiting
	r.With(rateLimit(200, time.Minute)).Get("/health", s.handleHealth)
	r.With(rateLimit(100, time.Minute)).Get("/api/resume", s.handleResume)

	// PDF: auth required + strict rate limit (5 req/min per IP)
	r.With(rateLimit(5, time.Minute), requireAuth(s.pdfSecret)).Get("/api/resume/pdf", s.handlePDF)

	// Serve Astro static build
	fs := http.FileServer(http.Dir(s.webDir))
	r.Handle("/*", fs)

	return r
}
