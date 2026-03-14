package config

import (
	"log"
	"os"
)

type Config struct {
	Port        string
	ResumePath  string
	WebDir      string
	PDFSecret   string
	CORSOrigins string
}

func Load() *Config {
	return &Config{
		Port:        envOr("SEMBLANT_PORT", "5173"),
		ResumePath:  envOr("SEMBLANT_RESUME_PATH", "data/resume.yaml"),
		WebDir:      envOr("SEMBLANT_WEB_DIR", "web/dist"),
		PDFSecret:   os.Getenv("SEMBLANT_PDF_AUTH_SECRET"),
		CORSOrigins: envOr("SEMBLANT_CORS_ORIGINS", "*"),
	}
}

func (c *Config) Validate() {
	if c.PDFSecret == "" {
		log.Println("WARN: SEMBLANT_PDF_AUTH_SECRET is empty — PDF endpoint is unprotected")
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
