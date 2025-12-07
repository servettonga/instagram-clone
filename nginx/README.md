# Nginx Configuration

This directory contains the production nginx configuration for the Innogram application.

## Files

- **`innogram-site.conf`** - Main production configuration (USE THIS ONE)
  - Complete server block configuration
  - Handles all routing for `/innogram` path
  - Includes upstreams, rate limiting, and caching

## Deployment

```bash
# 1. Copy config to server
scp nginx/innogram-site.conf root@server-ip:/etc/nginx/sites-available/innogram

# 2. Create symlink
ssh root@server-ip "ln -sf /etc/nginx/sites-available/innogram /etc/nginx/sites-enabled/"

# 3. Test configuration
ssh root@server-ip "nginx -t"

# 4. Reload nginx
ssh root@server-ip "systemctl reload nginx"
```

## Configuration Structure

The main location block `/innogram` handles ALL requests:

- Next.js pages and routes
- Static assets (`_next/static/`, public files)
- Fonts, images, icons (via Next.js basePath)

No need for separate location blocks for fonts or static files - Next.js with `basePath` handles everything correctly.

## Key Features

- **Upstreams**: Load balanced connections with `keepalive`
- **Rate Limiting**: Different rates for general, API, and auth endpoints
- **WebSocket Support**: For Socket.IO chat and Next.js HMR
- **Caching**: Aggressive caching for static assets
- **Security Headers**: X-Frame-Options, Content-Type-Options, etc.

## Path Rewrites

- `/innogram/api/*` → `localhost:8000/api/*` (Core server)
- `/innogram/socket.io/*` → `localhost:8000/socket.io/*` (WebSocket)
- `/innogram/internal/auth/*` → `localhost:4000/internal/auth/*` (Auth service)
- `/innogram/uploads/*` → `localhost:8000/uploads/*` (Media files)
- `/innogram/*` → `localhost:3000/innogram/*` (Next.js client)
