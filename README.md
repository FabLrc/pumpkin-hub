# 🎃 Pumpkin Hub

> **The next-generation plugin and resource registry for the [Pumpkin MC](https://github.com/Pumpkin-MC/Pumpkin) ecosystem (Rust).**

[![Status: Active Development](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)
[![Built with: Rust & Next.js](https://img.shields.io/badge/Stack-Rust_%2F_Next.js-black?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)

---

## About

**Pumpkin Hub** is the central platform for distributing and discovering extensions for the [Pumpkin](https://github.com/Pumpkin-MC/Pumpkin) Minecraft server. Built with Rust and Next.js, it offers a minimalist interface, enhanced binary security, and a frictionless developer experience.

> [!IMPORTANT]
> **Active development.** See the [Roadmap](https://fablrc.github.io/pumpkin-hub/roadmap.html) for current progress and upcoming features.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, SWR, TypeScript |
| **Backend** | Rust (Axum 0.8), SQLx, Tokio, Tower HTTP |
| **Data** | PostgreSQL 16, Meilisearch 1.7 |
| **Infra** | Docker Compose, GitHub Actions CI/CD |

## Current Features

- **Multi-provider Authentication** — GitHub, Google, Discord OAuth + email/password, email verification, password recovery
- **Plugin Registry** — Full CRUD with categories, full-text search (Meilisearch), and author management
- **Version Management** — Publish versions with semver validation, Pumpkin compatibility ranges, changelogs, and yank/restore
- **Binary Storage & Distribution** — Multi-platform binary uploads, secure presigned download URLs, S3-compatible storage (MinIO / Cloudflare R2)
- **GitHub Integration** — Publish plugins directly from a GitHub repository (one-click repo picker, no Installation ID required), auto-publish on releases, sync README/changelogs, and embed install badges
- **Dependency Graph** — Inter-plugin dependency declaration, semver compatibility resolution, conflict detection, and reverse lookup
- **Review System** — Star ratings (1–5), reviews with moderation, abuse reporting, rating display on explorer and plugin pages, automatic Meilisearch reindex on review mutations
- **Author Dashboard** — Download analytics with charts, API key management for CI/CD, audit trails, notification center with milestones
- **Admin Moderation** — Role-based moderation with plugin/user management, audit logs, review report management
- **Brutalist UI** — Industrial design system with responsive layouts, custom error pages, toast notifications

## Quick Start

```bash
git clone https://github.com/FabLrc/pumpkin-hub.git
cd pumpkin-hub
```

Create a `.env` file at the **project root** (next to `docker-compose.yml`) with your OAuth credentials:

```env
# Required — create a GitHub OAuth App at https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional — enables Google / Discord login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# JWT secret (change in production)
JWT_SECRET=dev_jwt_secret_change_me_in_production

# Optional — enables GitHub App integration (repo linking, auto-publish, publish-from-GitHub)
# Create at https://github.com/settings/apps
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=     # PEM content, single-line with \n
GITHUB_APP_WEBHOOK_SECRET=
```

Then start all services:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| API Health | http://localhost:8080/api/v1/health |

> [!IMPORTANT]
> The root `.env` is **only** read by Docker Compose for variable substitution. When running the API directly with `cargo run` (without Docker), use `api/.env` instead — see the [Getting Started guide](https://fablrc.github.io/pumpkin-hub/getting-started.html) for the full reference.

## Documentation

Full documentation at **[fablrc.github.io/pumpkin-hub](https://fablrc.github.io/pumpkin-hub/)** — architecture, API reference, design system, roadmap, and contribution guide.

## License

Open Source under MIT License.
