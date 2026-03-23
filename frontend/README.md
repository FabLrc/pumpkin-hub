# Pumpkin Hub — Frontend

> **Next.js 16 frontend for Pumpkin Hub — the plugin registry for Pumpkin MC (Rust).**

## Stack

- **Framework**: Next.js 16 with App Router, Turbopack
- **UI**: React 19 with Tailwind CSS 4
- **Data**: SWR for client-side data fetching with automatic revalidation
- **Testing**: Vitest with React Testing Library
- **Linting**: ESLint with Next.js config (core-web-vitals + TypeScript)
- **Design**: Custom Brutalist design system (Raleway + JetBrains Mono, orange/black palette)

## Getting Started

### Prerequisites
- Node.js 20+
- Backend API running on `http://localhost:8080` (or set `NEXT_PUBLIC_API_URL`)

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Quality Assurance

```bash
# Run ESLint (0 errors, 0 warnings enforced)
npm run lint

# Run Vitest unit tests
npm run test

# Build production bundle (validates all routes)
npm run build
```

## Architecture

### Key Directories

- `app/` — Next.js App Router pages, layouts, and route groups
- `components/` — Reusable React components (UI, plugins, layout, notifications)
- `lib/` — API client (`api.ts`), hooks (`useCurrentUser`, `useMedia`, `useViewPreference`), types, and utilities
- `public/` — Static assets (images, favicons)

### Core Patterns

- **API Client**: Centralized `apiFetch()` wrapper in `lib/api.ts` with automatic error handling, JSON content-type, and credentials
- **Authentication**: JWT cookies (HttpOnly, Secure in production, SameSite=Lax)
- **SWR Hooks**: Data fetching with automatic revalidation and offline support (e.g., `useCurrentUser()`, `useMedia()`)
- **Form Validation**: Shared validators in `lib/validation.ts` (email, semver, plugin slug, password strength)
- **State Management**: React hooks + localStorage for view preferences (list/grid)
- **Security**: CSP, HSTS, X-Frame-Options, no dangerouslySetInnerHTML (or properly escaped)

## Environment Variables

Create a `.env.local` file:

```env
# Optional — defaults to http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080

# Optional upload behavior override:
# - true  => force Next.js /api/upload proxy
# - false => upload directly to API URL
# Default behavior:
# - local API URL (localhost/127.0.0.1): proxy enabled
# - remote API URL: direct upload
# NEXT_PUBLIC_USE_UPLOAD_PROXY=true
```

## Deployment

### On Coolify (Recommended)

1. Point Coolify to the `pumpkin-hub` repository root
2. Set the **Build Command** to:
   ```bash
   cd frontend && npm run build
   ```
3. Set the **Start Command** to:
   ```bash
   cd frontend && npm run start
   ```
4. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.your-domain.com
   NODE_ENV=production
   ```
5. Coolify handles HTTPS (Traefik) and reverse proxy automatically

### Security Headers

Security headers are configured in `next.config.ts` and applied automatically:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

If using a CDN/reverse proxy (Coolify/Cloudflare), ensure they don't strip these headers.

## Contributing

See the main project [CONTRIBUTING](../README.md) guide.

## License

MIT License — see LICENSE in project root.

