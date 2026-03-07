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
*   🔐 **GitHub OAuth** — Secure authentication with JWT session management
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
> GitHub OAuth requires a `.env` file with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. See the [Getting Started guide](https://fablrc.github.io/pumpkin-hub/getting-started.html).

## 📦 Current State

- ✅ Rust API with full middleware stack (CORS, Trace, Compression, RequestId)
- ✅ PostgreSQL database with SQLx migrations (Users, Plugins, Versions, Categories)
- ✅ GitHub OAuth 2.0 authentication (JWT + HttpOnly cookies)
- ✅ Plugin CRUD (list, create, read, update, delete with pagination, sorting, filtering)
- ✅ Frontend design system (Brutalist Industrial tokens + React components)
- ✅ Landing page, Explorer page, Plugin detail page
- ✅ API connection via SWR with typed hooks
- ✅ CI/CD pipeline (ESLint, TypeScript, Build, cargo fmt, clippy, tests)
- 🔜 Version & binary upload, full-text search, author dashboard

## 📖 Documentation

Full documentation available at **[fablrc.github.io/pumpkin-hub](https://fablrc.github.io/pumpkin-hub/)**.

## 📄 License

Open Source under MIT License.
