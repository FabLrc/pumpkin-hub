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

- **Multi-provider Authentication** — GitHub, Google, Discord OAuth + email/password
- **Plugin Registry** — Full CRUD with categories, search, and author management
- **Version Management** — Publish versions with semver validation, Pumpkin compatibility ranges, changelogs, download counters, and yank/restore
- **Creator Dashboard** — Profile management, avatar upload, plugin administration
- **Brutalist UI** — Industrial design system with responsive layouts

## Quick Start

```bash
git clone https://github.com/FabLrc/pumpkin-hub.git
cd pumpkin-hub
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| API Health | http://localhost:8080/api/v1/health |

> [!NOTE]
> GitHub OAuth requires a `.env` file with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Google and Discord OAuth are optional — set `GOOGLE_CLIENT_ID` / `DISCORD_CLIENT_ID` to enable them. See the [Getting Started guide](https://fablrc.github.io/pumpkin-hub/getting-started.html) for the full `.env` reference.

## Documentation

Full documentation at **[fablrc.github.io/pumpkin-hub](https://fablrc.github.io/pumpkin-hub/)** — architecture, API reference, design system, roadmap, and contribution guide.

## License

Open Source under MIT License.
