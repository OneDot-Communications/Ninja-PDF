# Docker Setup for Ninja-PDF

This guide explains how to set up and run the Gotenberg Docker service for Office-to-PDF and URL-to-PDF conversions.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Start Docker Desktop

Make sure Docker Desktop is running (check for the whale icon in your system tray).

### 2. Start Gotenberg Service

From the project root directory (`Ninja-PDF`), run:

```bash
docker-compose up -d
```

This will:
- Pull the Gotenberg 8 image (if not already downloaded)
- Start the Gotenberg container on port 3001

### 3. Verify Gotenberg is Running

```bash
# Check container status
docker ps

# Check health endpoint
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"up","details":{"chromium":{"status":"up"},"libreoffice":{"status":"up"}}}
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start Gotenberg in background |
| `docker-compose down` | Stop Gotenberg |
| `docker-compose logs gotenberg` | View Gotenberg logs |
| `docker-compose restart` | Restart Gotenberg |
| `docker ps` | List running containers |

## Configuration

The `docker-compose.yml` configures Gotenberg with:

- **Port**: 3001 (maps to internal port 3000)
- **Chromium Allow List**: `.*` (allows all URLs for URL-to-PDF)
- **JavaScript**: Enabled for better webpage rendering
- **Timeout**: 120 seconds

## Services Using Gotenberg

The Django backend connects to Gotenberg at `http://localhost:3001` for:

| Conversion | Endpoint | Gotenberg Engine |
|------------|----------|------------------|
| Word to PDF | `/api/tools/word-to-pdf/` | LibreOffice |
| Excel to PDF | `/api/tools/excel-to-pdf/` | LibreOffice |
| PowerPoint to PDF | `/api/tools/powerpoint-to-pdf/` | LibreOffice |
| HTML to PDF | `/api/tools/html-to-pdf/` | LibreOffice |
| URL to PDF | `/api/tools/url-to-pdf/` | Chromium |

## Troubleshooting

### Port 3001 already in use

```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Use a different port in docker-compose.yml
ports:
  - "3002:3000"  # Change 3001 to 3002
```

Then update `GOTENBERG_URL` in backend settings.

### Container won't start

```bash
# View logs for errors
docker-compose logs gotenberg

# Remove and recreate container
docker-compose down
docker-compose up -d --force-recreate
```

### Connection refused errors

1. Ensure Docker Desktop is running
2. Check container is up: `docker ps`
3. Verify health: `curl http://localhost:3001/health`

## Environment Variables

For production, set `GOTENBERG_URL` in your backend environment:

```bash
# In backend/.env or environment
GOTENBERG_URL=http://localhost:3001

# For Docker network (if running Django in Docker too)
GOTENBERG_URL=http://gotenberg:3000
```

## Stopping the Service

```bash
docker-compose down
```

To also remove the network:
```bash
docker-compose down --remove-orphans
```
