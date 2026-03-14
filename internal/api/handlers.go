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
