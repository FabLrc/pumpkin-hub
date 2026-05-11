# Pumpkin Hub — Agent Instructions

Community plugin registry for the [Pumpkin MC](https://github.com/Pumpkin-MC/Pumpkin) Minecraft server (Rust). Developers publish, version, and distribute compiled `.wasm` plugins with SHA-256 verification, instant search (Meilisearch), and GitHub integration.

## Architecture

```
Browser → Next.js (port 3000) → /api/v1/* → Rust/Axum (port 8080)
                                  ├─ PostgreSQL 16 (port 5432)
                                  ├─ Meilisearch 1.7 (port 7700)
                                  └─ MinIO/R2 S3 (port 9000)
```

| Directory    | Language    | Framework             |
|-------------|------------|----------------------|
| `frontend/` | TypeScript | Next.js 16 App Router |
| `api/`      | Rust       | Axum 0.8 / SQLx      |
| `docs/`     | HTML       | GitHub Pages (master push) |

Per-package deep dives: `frontend/CLAUDE.md` and `api/CLAUDE.md`.

## Quick start

```bash
cp .env.example .env   # fill in OAuth keys, then:
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8080
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- Meilisearch: http://localhost:7700

**Critical env file distinction**: The root `.env` is read **only** by Docker Compose for variable substitution. When running the API directly with `cargo run` (no Docker), use `api/.env` instead.

## Development commands

### Frontend (`cd frontend`)
```bash
npm run dev              # Hot reload (needs api on :8080)
npm run lint             # ESLint --max-warnings 0 (flat config in eslint.config.mjs)
npm run test             # Vitest (jsdom, global setup in vitest.setup.ts)
npm run test -- path/to/file.test.tsx  # Single test
npm run test:coverage    # Thresholds: lines 80%, functions 80%, branches 75%, statements 80%
```

### API (`cd api`)
```bash
cargo run                # Needs services running + api/.env
cargo fmt --all          # Required — checked in CI and pre-commit hook
cargo clippy -- -D warnings
cargo test               # Integration tests use axum::oneshot (no network bind)
cargo test -- test_name  # Single test
cargo tarpaulin --out lcov  # Coverage (CI uses cargo llvm-cov)
```

### Docker shortcuts
```bash
docker compose up api-dev         # Relaunch API only after code changes
docker compose down -v            # Tear down + wipe all volumes
```

## CI validation order

The CI pipeline (`ci.yml`) enforces this exact sequence:

**Frontend**: `eslint --max-warnings 0` → `tsc --noEmit` → `next build` → `vitest --coverage`
**API**: `cargo fmt --check` → `cargo clippy -D warnings` → `sqlx migrate run` → `cargo llvm-cov`

Run the full chain before pushing. SonarQube analysis runs only on master merges.

## Pre-commit hook

`.githooks/pre-commit` runs `cargo fmt --all` in `api/`. If files are reformatted, the commit is **aborted** — you must stage the new formatting and re-commit. Install with:

```bash
git config core.hooksPath .githooks
```

## Branching & commits

- `develop` — working branch, all PRs target this
- `master` — production, protected (no direct push, requires green CI)
- Commit format: `type(scope): description` — types: `fix`, `feat`, `test`, `refactor`, `docs`, `chore` — scopes: `frontend`, `api`, `ci`

## Code conventions

- **Frontend**: `"use client"` for all hooks/state/events; Server Components for static metadata pages. Dynamic data via SWR client-side, never server fetch. File naming: PascalCase for components/types, camelCase for functions/hooks, UPPER_CASE for constants. UI components in `frontend/components/ui/` — custom only, no shadcn/radix.
- **API**: Central `AppError` enum (`src/error.rs`) with HTTP mapping (404, 422, 401, 403, 409, 500). DTOs in `dto.rs` per route module separated request/response. Raw SQL via SQLx with `RETURNING`, no ORM. Fire-and-forget emails/audit via `tokio::spawn`.
## Security

- Cookies: `HttpOnly` + `Secure` + `SameSite=Lax`; logout via POST only (anti-CSRF)
- Headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict Referrer-Policy
- Details: `docs/SECURITY_AND_DEPLOYMENT.md`

## Design system (Brutalist "Maia")

- **No `border-radius` anywhere** — sharp corners, brutalist style
- Colors: `#0a0a0a` bg, `#fff`/`#a3a3a3` text, `#f97316` accent orange
- Fonts: Raleway (UI) + JetBrains Mono (code)
- UI components in `frontend/components/ui/` — custom only, no shadcn/radix
- Tailwind CSS v4 with `@theme inline` tokens in `globals.css` (no `tailwind.config.ts`)
- Full spec: `.github/instructions/design-system.md`

## Gotchas

- **Upload proxy**: `frontend/app/api/upload/` exists solely to bypass a Chrome + Docker Desktop cross-origin upload bug. Do not remove.
- **S3 key format**: `plugins/{slug}/{version}/{platform}/{filename}`
- **Frontend build-time env**: `NEXT_PUBLIC_*` vars are inlined during `next build`. The `docker.yml` CI passes them via GitHub secrets with matching names.
- **Frontend tests use MSW** for API mocking. Handlers in `frontend/test/msw/handlers.ts`.
- **API tests are integration tests** using `axum::ServiceExt::oneshot` (no TCP bind). `build_test_app()` and `create_test_user()` are in `api/tests/common/mod.rs`.
- **Meilisearch re-indexes all plugins on every API startup** (`api/src/main.rs:48`).
- **Rust release profile**: `lto = true`, `codegen-units = 1`, `panic = "abort"` — production builds are slow to compile.
- **ESLint** uses flat config (`eslint.config.mjs`, ESLint 9), not `.eslintrc`.

## Further reading

- `frontend/CLAUDE.md` — Next.js patterns, API client, SWR, form conventions, test patterns
- `api/CLAUDE.md` — Middleware order, error handling, auth extractors, storage/search setup
- `.github/instructions/code.instructions.md` — SOLID, Clean Code standards
- `.github/instructions/design-system.md` — Brutalist design tokens and components
- `.github/instructions/ui-ux.instructions.md` — WCAG 2.1, 8px grid, mobile-first
- `.github/instructions/technos.md` — Tech stack decisions
- `.github/instructions/projet.instructions.md` — Product vision
- `docs/SECURITY_AND_DEPLOYMENT.md` — Cookie flags, headers, CSRF
