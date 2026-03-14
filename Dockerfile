# Stage 1: Build Astro frontend
FROM node:20-alpine AS web-build
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
COPY data/resume.yaml /data/resume.yaml
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.22-alpine AS go-build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 go build -o /semblant ./cmd/semblant/

# Stage 3: Runtime
FROM alpine:3.19
RUN apk add --no-cache ca-certificates && \
    addgroup -g 1001 -S semblant && \
    adduser -u 1001 -S semblant -G semblant
COPY --from=go-build /semblant /usr/local/bin/semblant
COPY --from=web-build /web/dist /web/dist
COPY data/resume.yaml /data/resume.yaml
COPY internal/pdf/fonts/ /fonts/
ENV SEMBLANT_RESUME_PATH=/data/resume.yaml
ENV SEMBLANT_WEB_DIR=/web/dist
ENV SEMBLANT_PORT=8080
EXPOSE 8080
USER 1001
CMD ["semblant"]
