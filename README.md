# 🎃 Pumpkin Hub

> **The next-generation plugin and resource registry for the [Pumpkin MC](https://github.com/Pumpkin-MC/Pumpkin) ecosystem (Rust).**

[![Status: Active Development](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)
[![Built with: Rust & Next.js](https://img.shields.io/badge/Stack-Rust_%2F_Next.js-black?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)

---

## ⚡ About

**Pumpkin Hub** is the central platform for distributing and discovering extensions for the [Pumpkin](https://github.com/Pumpkin-MC/Pumpkin) Minecraft server. Built with Rust and Next.js, it offers a minimalist interface, enhanced binary security, and a frictionless developer experience.

> [!IMPORTANT]
> **Active development:** Features are evolving rapidly. See the [Roadmap](https://fablrc.github.io/pumpkin-hub/roadmap.html) for details.

## ✨ Key Features

*   🔍 **Instant Search** — Meilisearch-powered millisecond results
*   📦 **Crate-Centric** — Native Rust binary and CPU architecture management
*   🛡️ **Native Security** — SHA-256 signing and integrity verification
*   🔐 **Multi-Provider Auth** — Email/password, GitHub, Google, Discord with JWT sessions
*   ⌨️ **Brutalist Interface** — Industrial "No-Radius" design for technical clarity

## 🏗️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, SWR, TypeScript |
| **Backend** | Rust (Axum 0.8), SQLx, Tokio, Tower HTTP |
| **Data** | PostgreSQL 16, Meilisearch 1.7 |
| **Infra** | Docker Compose, GitHub Actions CI/CD |

## 🚀 Quick Start

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
> GitHub OAuth requires a `.env` file with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Google and Discord OAuth are optional — set `GOOGLE_CLIENT_ID` / `DISCORD_CLIENT_ID` to enable them. See the [Getting Started guide](https://fablrc.github.io/pumpkin-hub/getting-started.html).

## 📦 Current State

- ✅ Rust API with full middleware stack (CORS, Trace, Compression, RequestId)
- ✅ PostgreSQL database with SQLx migrations (Users, Plugins, Versions, Categories)
- ✅ Multi-provider authentication (email/password + GitHub + Google + Discord OAuth)
- ✅ Argon2id password hashing, account linking by email, auth_providers table
- ✅ Plugin CRUD (list, create, read, update, delete with pagination, sorting, filtering)
- ✅ Categories API — dynamic `GET /api/v1/categories` endpoint
- ✅ Frontend design system (Brutalist Industrial tokens + React components)
- ✅ Landing page, Explorer page, Plugin detail page, Auth page
- ✅ API connection via SWR with typed hooks (`usePlugins`, `useCategories`, `useCurrentUser`)
- ✅ Frontend auth page with sign-in/sign-up forms and OAuth provider buttons
- ✅ CI/CD pipeline (ESLint, TypeScript, Build, cargo fmt, clippy, tests)
- ✅ Plugin submission & management forms (`/plugins/new`, `/plugins/[slug]/edit`, delete with confirm modal)
- ✅ Creator Dashboard (`/dashboard`) — author's plugins list with edit/delete actions
- ✅ User Profile page (`/profile`) — edit display name, bio; avatar upload
- ✅ `PUT /api/v1/auth/me` — update profile (display name, bio)
- ✅ `POST /api/v1/auth/avatar` — multipart avatar upload with MIME + magic-bytes validation (max 2 MB), stored as BYTEA
- ✅ `GET /api/v1/users/{id}/avatar` — public binary serving endpoint with cache headers
- 🔜 Version management, full-text search (Meilisearch), public author profile pages

## 📖 Documentation

Full documentation available at **[fablrc.github.io/pumpkin-hub](https://fablrc.github.io/pumpkin-hub/)**.

## 📄 License

Open Source under MIT License.
