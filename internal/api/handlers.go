package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/datakailabs/semblant/internal/pdf"
	"github.com/datakailabs/semblant/internal/resume"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func (s *Server) handleResume(w http.ResponseWriter, r *http.Request) {
	var data *resume.Resume

	// Return full resume only with valid auth (constant-time comparison)
	token := r.Header.Get("Authorization")
	if r.URL.Query().Get("full") == "true" && constantTimeAuth(token, s.pdfSecret) {
		data = s.resume
	} else {
		data = resume.FilterPublic(s.resume)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	return strings.Trim(slugRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func (s *Server) handlePDF(w http.ResponseWriter, r *http.Request) {
	filename := fmt.Sprintf("%s-cv.pdf", slugify(s.resume.Personal.Name))

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	if err := pdf.NewRenderer().Render(w, s.resume); err != nil {
		log.Printf("PDF generation failed: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
}

func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	if s.chat == nil {
		http.Error(w, `{"error":"chat not configured"}`, http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Message == "" {
		http.Error(w, `{"error":"message is required"}`, http.StatusBadRequest)
		return
	}

	if len(req.Message) > 500 {
		http.Error(w, `{"error":"message too long (max 500 chars)"}`, http.StatusBadRequest)
		return
	}

	answer, err := s.chat.Ask(req.Message)
	if err != nil {
		log.Printf("Chat failed: %v", err)
		http.Error(w, `{"error":"failed to generate response"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"answer": answer})
}
