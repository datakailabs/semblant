package config

import (
	"log"
	"os"
)

type Config struct {
	Port           string
	ResumePath     string
	WebDir         string
	PDFSecret      string
	CORSOrigins    string
	AnthropicKey   string
	AnthropicModel string
}

func Load() *Config {
	return &Config{
		Port:           envOr("SEMBLANT_PORT", "5173"),
		ResumePath:     envOr("SEMBLANT_RESUME_PATH", "data/resume.yaml"),
		WebDir:         envOr("SEMBLANT_WEB_DIR", "web/dist"),
		PDFSecret:      os.Getenv("SEMBLANT_PDF_AUTH_SECRET"),
		CORSOrigins:    envOr("SEMBLANT_CORS_ORIGINS", "*"),
		AnthropicKey:   os.Getenv("ANTHROPIC_API_KEY"),
		AnthropicModel: envOr("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
	}
}

func (c *Config) Validate() {
	if c.PDFSecret == "" {
		log.Println("WARN: SEMBLANT_PDF_AUTH_SECRET is empty — PDF endpoint is unprotected")
	}
	if c.AnthropicKey == "" {
		log.Println("INFO: ANTHROPIC_API_KEY not set — /api/chat disabled")
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
