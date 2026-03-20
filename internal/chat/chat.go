package chat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/datakailabs/semblant/internal/resume"
)

// Client handles conversational queries against resume data.
type Client struct {
	apiKey  string
	model   string
	httpC   *http.Client
	context string
}

// NewClient creates a chat client with the resume pre-rendered as context.
func NewClient(apiKey, model string, r *resume.Resume) *Client {
	return &Client{
		apiKey:  apiKey,
		model:   model,
		httpC:   &http.Client{Timeout: 30 * time.Second},
		context: buildContext(r),
	}
}

// Ask sends a user question and returns the assistant's response.
func (c *Client) Ask(question string) (string, error) {
	body := apiRequest{
		Model:     c.model,
		MaxTokens: 1024,
		System:    c.context,
		Messages: []message{
			{Role: "user", Content: question},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshaling request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpC.Do(req)
	if err != nil {
		return "", fmt.Errorf("calling API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var apiResp apiResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return "", fmt.Errorf("parsing response: %w", err)
	}

	for _, block := range apiResp.Content {
		if block.Type == "text" {
			return block.Text, nil
		}
	}

	return "", fmt.Errorf("no text in response")
}

// buildContext renders the resume as a structured text block for the system prompt.
func buildContext(r *resume.Resume) string {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("You are a helpful assistant representing %s. ", r.Personal.Name))
	b.WriteString("Answer questions about their professional background based on the resume data below. ")
	b.WriteString("Be conversational but accurate — only state what the resume supports. ")
	b.WriteString("If asked something not covered by the resume, say so honestly. ")
	b.WriteString("Keep answers concise (2-4 sentences) unless the user asks for detail.\n\n")

	b.WriteString("--- RESUME ---\n\n")

	b.WriteString(fmt.Sprintf("Name: %s\n", r.Personal.Name))
	b.WriteString(fmt.Sprintf("Title: %s\n", r.Personal.Title))
	b.WriteString(fmt.Sprintf("Bio: %s\n", r.Personal.Bio))
	if r.Personal.Website != "" {
		b.WriteString(fmt.Sprintf("Website: %s\n", r.Personal.Website))
	}
	b.WriteString("\n")

	if len(r.Experience) > 0 {
		b.WriteString("EXPERIENCE:\n")
		for _, exp := range r.Experience {
			end := "Present"
			if exp.End != nil {
				end = *exp.End
			}
			b.WriteString(fmt.Sprintf("- %s at %s (%s — %s)\n", exp.Role, exp.Company, exp.Start, end))
			if exp.Description != "" {
				b.WriteString(fmt.Sprintf("  %s\n", exp.Description))
			}
			for _, h := range exp.Highlights {
				b.WriteString(fmt.Sprintf("  * %s\n", h))
			}
			if len(exp.Technologies) > 0 {
				b.WriteString(fmt.Sprintf("  Tech: %s\n", strings.Join(exp.Technologies, ", ")))
			}
		}
		b.WriteString("\n")
	}

	if len(r.Education) > 0 {
		b.WriteString("EDUCATION:\n")
		for _, edu := range r.Education {
			line := fmt.Sprintf("- %s, %s", edu.Degree, edu.Institution)
			if edu.Start != "" || edu.End != "" {
				line += fmt.Sprintf(" (%s — %s)", edu.Start, edu.End)
			}
			b.WriteString(line + "\n")
			if edu.Notes != "" {
				b.WriteString(fmt.Sprintf("  %s\n", edu.Notes))
			}
		}
		b.WriteString("\n")
	}

	if len(r.Skills) > 0 {
		b.WriteString("SKILLS:\n")
		for _, group := range r.Skills {
			names := make([]string, len(group.Items))
			for i, item := range group.Items {
				names[i] = fmt.Sprintf("%s (%d%%)", item.Name, item.Level)
			}
			b.WriteString(fmt.Sprintf("- %s: %s\n", group.Category, strings.Join(names, ", ")))
		}
		b.WriteString("\n")
	}

	if len(r.Certifications) > 0 {
		b.WriteString("CERTIFICATIONS:\n")
		for _, cert := range r.Certifications {
			b.WriteString(fmt.Sprintf("- %s (%s)\n", cert.Name, cert.Issuer))
		}
		b.WriteString("\n")
	}

	if len(r.Languages) > 0 {
		b.WriteString("LANGUAGES:\n")
		for _, lang := range r.Languages {
			b.WriteString(fmt.Sprintf("- %s: %s\n", lang.Name, lang.Proficiency))
		}
		b.WriteString("\n")
	}

	if len(r.Projects) > 0 {
		b.WriteString("PROJECTS:\n")
		for _, proj := range r.Projects {
			b.WriteString(fmt.Sprintf("- %s: %s", proj.Name, proj.Description))
			if len(proj.Technologies) > 0 {
				b.WriteString(fmt.Sprintf(" [%s]", strings.Join(proj.Technologies, ", ")))
			}
			b.WriteString("\n")
		}
	}

	b.WriteString("\n--- END RESUME ---")

	return b.String()
}

// API types

type apiRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system"`
	Messages  []message `json:"messages"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type apiResponse struct {
	Content []contentBlock `json:"content"`
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}
