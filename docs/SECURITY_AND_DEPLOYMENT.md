# Security & Deployment Guide

## Overview

This guide documents the security hardening applied to Pumpkin Hub before beta and provides deployment instructions for production environments (specifically Hetzner + Coolify + Cloudflare R2).

---

## Security Hardening (P0 Fixes)

### 1. Cookie Security (`Secure` Flag)

**Status**: ✅ Fixed

**What was changed**:
- All authentication cookies (JWT, CSRF) now include the `Secure` flag when `COOKIE_SECURE=true` or when any ALLOWED_ORIGIN starts with `https://`
- Added `secure_cookies: bool` field to `ServerConfig` in [config.rs](../api/src/config.rs#L26)
- Auto-detection logic: If `COOKIE_SECURE` env var is set, it overrides auto-detection; otherwise, presence of `https://` origins activates the flag

**Affected endpoints**:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- GitHub/Google/Discord OAuth callbacks
- `POST /api/v1/auth/logout` (now POST instead of GET)

**Environment setup**:
```env
# Development (localhost explicitly disables Secure)
ALLOWED_ORIGINS=http://localhost:3000

# Production (auto-enables Secure)
ALLOWED_ORIGINS=https://hub.yourdomain.com,https://api.yourdomain.com
COOKIE_SECURE=true  # Optional; override auto-detection if needed
```

### 2. POST-Only Logout (CSRF Hardening)

**Status**: ✅ Fixed

**What was changed**:
- Logout endpoint changed from `GET /api/v1/auth/logout` to `POST /api/v1/auth/logout`
- Frontend now calls logout via `fetch()` with `POST` method instead of navigation redirect
- Prevents accidental/malicious logout via external page navigation

**Code locations**:
- Backend: [routes/auth.rs](../api/src/routes/auth.rs#L68)
- Frontend: [lib/api.ts](../frontend/lib/api.ts#L217-L219), [Navbar.tsx](../frontend/components/layout/Navbar.tsx#L26-L29)

**Client usage**:
```typescript
// Old (vulnerable to CSRF): window.location.href = "http://api/auth/logout"
// New (safe): await logout(); window.location.href = "/";
import { logout } from "@/lib/api";

async function handleLogout() {
  await logout();
  window.location.href = "/";
}
```

### 3. HTTP Security Headers

**Status**: ✅ Applied via Next.js config

**What was changed**:
- Added [next.config.ts](../frontend/next.config.ts) security headers configuration
- Enabled `poweredByHeader=false` to remove `X-Powered-By: Next.js`

**Headers applied**:
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs (CSP equivalent for feature gates) |
| `X-DNS-Prefetch-Control` | `on` | Allow DNS prefetching for CDN |

**Additional hardening (handled by reverse proxy)**:
- `Strict-Transport-Security` (HSTS) — configured in Traefik/Coolify
- `Content-Security-Policy` (CSP) — to be implemented post-beta after monitoring

---

## Deployment Guide

### Target Environment

- **Hosting**: Hetzner (VPS)
- **Container Orchestration**: Coolify (self-hosted PaaS)
- **Reverse Proxy**: Traefik (managed by Coolify)
- **Object Storage**: Cloudflare R2
- **Database**: PostgreSQL 16 (managed by Coolify or external)
- **Search**: Meilisearch (managed by Coolify or external)

### Prerequisites

1. **Hetzner VPS** with Docker and Docker Compose installed
2. **Coolify** deployed and running
3. **Cloudflare R2** bucket created and credentials ready
4. **GitHub OAuth App** created (or reuse existing dev app)
5. **PostgreSQL 16** database ready (Coolify can provision this)
6. **Meilisearch 1.7** instance (Coolify can run this in a container)

### Deployment Steps

#### Step 1: Prepare Coolify

1. SSH into your Hetzner VPS
2. Install Coolify if not already done:
   ```bash
   curl -fsSL https://cdn.coollify.io/coolify/install.sh | sh
   ```
3. Access Coolify dashboard (port 3000 or configured port) and create a new **Project**

#### Step 2: Configure Environment Variables (Coolify UI)

In Coolify, add the following environment variables:

**API (Backend)**:
```env
# Database
DATABASE_URL=postgresql://pumpkin:YOUR_PASSWORD@postgres:5432/pumpkin_hub

# JWT
JWT_SECRET=YOUR_32_CHAR_RANDOM_SECRET

# OAuth (reuse existing GitHub OAuth App or create new one)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/github/callback

# Storage (Cloudflare R2)
S3_ENDPOINT_URL=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_R2_SECRET_KEY
S3_BUCKET=pumpkin-hub-binaries
S3_REGION=auto
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_URL=https://YOUR_R2_PUBLIC_URL/  # e.g., https://pumpkin-hub.YOUR_ACCOUNT.r2.dev/

# Meilisearch
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_KEY=YOUR_MEILISEARCH_MASTER_KEY

# CORS & Security
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
API_PUBLIC_URL=https://api.yourdomain.com
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com  # shared cookies across subdomains
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Email (optional for beta)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-password
SMTP_FROM_ADDRESS=noreply@yourdomain.com
```

**Frontend (Next.js)**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_INTERNAL_API_URL=http://api:8080  # Docker internal network for upload proxy
NODE_ENV=production
```

#### Step 3: Deploy via Coolify

1. **Connect Git Repository**:
   - In Coolify, select **Github** and authorize
   - Select the `pumpkin-hub` repository

2. **Configure Services** (pre-built Docker images from GHCR):
   - Backend service:
     - Image: `ghcr.io/fablrc/pumpkin-hub-api:latest`
     - Exposed Port: `8082:8080` (mapped externally to 8082)
     - Health Check: `http://localhost:8080/api/v1/health`
     - Notes: Alpine-based static Rust binary, no OpenSSL dependency

   - Frontend service:
     - Image: `ghcr.io/fablrc/pumpkin-hub-frontend:latest`
     - Exposed Port: `3000`
     - Health Check: Docker HEALTHCHECK built-in (wget-based)
     - Notes: Next.js standalone build

   Alternatively, deploy using the production compose file:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

   > **Note**: Images are automatically built and pushed to GHCR by the `docker.yml` GitHub Actions workflow after every successful CI run. A Coolify webhook triggers auto-deployment.

3. **Configure Domains** (Traefik routing):
   - API: `api.yourdomain.com` → Backend service port 8080
   - Frontend: `yourdomain.com` → Frontend service port 3000

4. **Enable HTTPS**:
   - Coolify (via Traefik) supports Let's Encrypt automatic certificates
   - Enable "Auto SSL" for both domains

5. **Deploy**:
   - Click "Deploy" in Coolify UI
   - Monitor logs for any issues

#### Step 4: Verify Deployment

```bash
# Test API health
curl https://api.yourdomain.com/api/v1/health

# Test CORS headers
curl -I https://api.yourdomain.com/api/v1/auth/me

# Test frontend
curl -I https://yourdomain.com
```

#### Step 5: Post-Deployment Checks

- [ ] API responds to `GET /api/v1/health`
- [ ] Frontend loads without console errors
- [ ] Login flow works (test all OAuth providers if configured)
- [ ] Plugin upload works
- [ ] Binary download works (check presigned URL via S3)
- [ ] Cookies are marked `Secure` and `HttpOnly` (check DevTools)
- [ ] Security headers present (check with curl or DevTools)

---

## Production Checklist

- [ ] **Database backups** configured (PostgreSQL)
- [ ] **S3 bucket lifecycle** configured (optional: auto-delete old versions)
- [ ] **Monitoring & alerting** enabled (Coolify dashboards, CloudFlare analytics)
- [ ] **Rate limiting** tuned for your traffic
- [ ] **CORS origins** reflect your actual domains (check `ALLOWED_ORIGINS`)
- [ ] **JWT secret** is strong and unique (generated, not "MY_SECRET")
- [ ] **Email templates** tested (if SMTP configured)
- [ ] **Logs** configured for external ingestion (optional: ELK, Datadog, etc.)

---

## Rollback Strategy

### Quick Rollback (Coolify)

1. In Coolify dashboard, find the deployment
2. Click **Rollback** to the previous successful deployment
3. Traefik automatically routes traffic back

### Manual Rollback (If needed)

```bash
# SSH into your Hetzner VPS
ssh root@your-vps

# List Docker containers
docker ps -a

# Stop current version
docker compose down

# Checkout previous tag/commit
git fetch origin
git checkout previous-tag

# Rebuild and restart
docker compose up -d
```

---

## Monitoring & Observability

### Logs

- **Frontend**: Check Coolify logs or CloudFlare Logpush
- **Backend**: Check Coolify logs; structured logging to stderr via `tracing` crate
- **Database**: PostgreSQL slow query log (if needed)

### Metrics

- **Uptime**: External ping via CloudFlare or UptimeRobot
- **Performance**: CloudFlare Analytics (for frontend CDN)
- **API latency**: Can be added via OpenTelemetry (future)

### Error Tracking (Optional for beta)

- Sentry for API errors
- CloudFlare error logs for frontend
- Discord webhook alerts for critical errors

---

## Known Limitations (Beta)

1. **CSP** is not yet fully configured — defer stricter CSP rules after beta to avoid false positives
2. **Rate limiting** serves as auth defense; DDoS protection delegated to CloudFlare
3. **Backups** are manual (recommend setting up automated snapshots on Hetzner)
4. **Multi-region failover** not configured (future enhancement)

---

## Support & Troubleshooting

### Common Issues

**API returns 500 on login**:
- Check `DATABASE_URL` is correct and database is running
- Check `JWT_SECRET` is set and non-empty
- Check logs: `docker logs <container-id>`

**Frontend can't reach API**:
- Check `NEXT_PUBLIC_API_URL` matches the deployed API domain
- Check CORS headers: `curl -H "Origin: https://yourdomain.com" <api-url>`
- Check firewall allows traffic between frontend and API

**S3 uploads fail**:
- Verify R2 credentials and `S3_ENDPOINT_URL`
- Verify R2 bucket exists
- Check `S3_PUBLIC_URL` is accessible from CloudFlare or public internet

**Cookies not persisting**:
- Check `ALLOWED_ORIGINS` includes your frontend domain (exact match)
- Check cookies are marked `Secure` and `SameSite=Lax` (edge case: Safari private mode)
- Verify HTTPS is enabled (Secure flag requires HTTPS in production)

---

## Related Documents

- [Architecture](./architecture.html) — High-level system design
- [API Reference](./api.html) — Endpoint documentation
- Main [README](../README.md) — Quick start and features

