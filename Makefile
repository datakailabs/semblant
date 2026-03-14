.PHONY: dev build test clean web-install web-dev web-build go-build go-run

# Development
dev: web-install
	@echo "Starting Go server + Astro dev server..."
	@cd web && npm run dev &
	@go run ./cmd/semblant/

# Build
build: web-build go-build

go-build:
	CGO_ENABLED=0 go build -o bin/semblant ./cmd/semblant/

go-run:
	go run ./cmd/semblant/

# Frontend
web-install:
	cd web && npm install

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

# Tests
test:
	go test ./...
	cd tests && npx playwright test

test-go:
	go test ./...

test-e2e:
	cd tests && npx playwright test

# Clean
clean:
	rm -rf bin/ web/dist/ web/node_modules/
