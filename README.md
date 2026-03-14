# Semblant

Resume-as-code. Structured YAML data, Go API server, Astro frontend with D3 visualizations, and PDF export — in a single binary.

## Quickstart

```bash
# 1. Create your resume
cp data/resume.example.yaml data/resume.yaml
# Edit data/resume.yaml with your info

# 2. Install frontend dependencies
cd web && npm install && cd ..

# 3. Build and run
make build
./bin/semblant
# → http://localhost:5173
```

## What you get

- **Website** — responsive Astro site with dark mode, driven entirely by your YAML
- **PDF** — hyperlinked, multi-page PDF generated server-side (no browser, no Puppeteer)
- **API** — JSON endpoint for your resume data with privacy filtering
- **Visualizations** — D3 interactive timeline and skills ecosystem graph

## Resume schema

Your resume lives in `data/resume.yaml`. See [`data/resume.example.yaml`](data/resume.example.yaml) for the full schema with comments.

```yaml
personal:
  name: "Jane Doe"
  title: "Senior Software Engineer"
  bio: "..."
  website: "https://janedoe.dev"
  links:
    - platform: github
      url: "https://github.com/janedoe"
  contact:
    - type: email
      value: "jane@example.com"
      visibility: private  # stripped from public API

experience:
  - company: "Acme Corp"
    url: "https://acme.example.com"  # hyperlinked in PDF
    role: "Senior Software Engineer"
    start: "2023-01"
    end: null  # null = current
    highlights:
      - "Reduced p99 latency by 40%"
    technologies: [Go, PostgreSQL, Kubernetes]
# ... education, skills, certifications, languages, projects
```

### Privacy

Fields with `visibility: private` are stripped from the public `/api/resume` endpoint and the frontend. The PDF includes all fields (it's behind auth).

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|---|---|---|
| `SEMBLANT_PORT` | `5173` | Server port |
| `SEMBLANT_RESUME_PATH` | `data/resume.yaml` | Path to resume YAML |
| `SEMBLANT_WEB_DIR` | `web/dist` | Path to built frontend |
| `SEMBLANT_PDF_AUTH_SECRET` | *(empty)* | Bearer token for PDF endpoint. If empty, PDF returns 401 |
| `SEMBLANT_CORS_ORIGINS` | `*` | Comma-separated allowed origins. Set to your domain in production |

## API

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | No | `{"status":"ok"}` |
| `GET /api/resume` | No | Public resume JSON (private fields stripped) |
| `GET /api/resume?full=true` | Bearer | Full resume including private fields |
| `GET /api/resume/pdf` | Bearer | Download PDF |

## Development

```bash
# Run Go server + Astro dev server concurrently
make dev

# Or separately:
make go-run      # Go server only
make web-dev     # Astro dev server only

# Build
make build       # Builds both frontend and Go binary

# Test
make test        # Go tests + Playwright e2e
make test-go     # Go tests only
```

### Project structure

```
cmd/semblant/         Entry point
internal/
  api/                HTTP handlers, middleware, routing
  config/             Environment-based configuration
  pdf/                PDF renderer (theme, helpers, per-section methods)
  resume/             Schema, YAML loader, privacy filtering
data/
  resume.yaml         Your resume data
  resume.example.yaml Schema reference with placeholder data
web/
  src/
    pages/            Astro pages
    components/       Static Astro components
    islands/          Interactive React + D3 islands
    lib/              Shared constants, types, utilities
```

## Docker

```bash
docker build -t semblant .
docker run -p 8080:8080 \
  -e SEMBLANT_PDF_AUTH_SECRET=your-secret \
  -e SEMBLANT_CORS_ORIGINS=https://your-domain.com \
  semblant
```

The image runs as non-root (UID 1001), with a read-only root filesystem.

## Security

Semblant includes production-grade security defaults:

- **Auth**: Constant-time token comparison (no timing attacks)
- **Rate limiting**: Per-IP limits on all endpoints (5 req/min on PDF)
- **Security headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **CORS**: Configurable origin allowlist (defaults to `*` for development)
- **Privacy filtering**: Private fields never leak through the public API
- **Container**: Non-root user, read-only filesystem, all capabilities dropped

## License

Apache License 2.0. See [LICENSE](LICENSE).
