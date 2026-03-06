# 🎃 Pumpkin Hub

> **The next-generation plugin and resource registry for the [Pumpkin MC](https://github.com/Pumpkin-MC/Pumpkin) ecosystem (Rust).**

[![Status: Active Development](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)
[![Built with: Rust & Next.js](https://img.shields.io/badge/Stack-Rust_%2F_Next.js-black?style=for-the-badge)](https://github.com/FabLrc/pumpkin-hub)

---

## ⚡ About

**Pumpkin Hub** is the central platform dedicated to distribution and discovery of extensions for the [Pumpkin](https://github.com/Pumpkin-MC/Pumpkin) Minecraft server. Because [Pumpkin MC](https://github.com/Pumpkin-MC/Pumpkin) redefines server performance with Rust, Pumpkin Hub redefines content management with a minimalist interface, enhanced binary security, and a frictionless developer experience (DX).

> [!IMPORTANT]
> **Active development:** We are currently in an intensive building phase. Features are likely to evolve rapidly.

## ✨ Key Features

*   🔍 **Instant Search:** Powered by Meilisearch for millisecond results.
*   📦 **Crate-Centric:** Native management of compiled binaries and CPU architectures.
*   🛡️ **Native Security:** Systematic SHA-256 signing and integrity verification.
*   ⚙️ **Dependency Graph:** Clear visualization of inter-plugin dependencies.
*   ⌨️ **Brutalist Interface:** "No-Radius" design optimized for technical clarity.

## 🏗️ Tech Stack

*   **Frontend:** Next.js 16+, Tailwind CSS, Shadcn UI.
*   **Backend:** Rust (Axum), SQLx, Meilisearch.
*   **Infrastructure:** Cloudflare R2, PostgreSQL.

## 📖 Documentation

Full documentation is available at [pumpkin-hub docs](https://fablrc.github.io/pumpkin-hub/).

## 🛠️ Installation (Development)

> [!NOTE]
> **Phase 1 in progress:** Database models, migrations, GitHub OAuth authentication, and full Plugin CRUD (list, create, read, update, delete with validation, pagination, sorting, and category filtering) are implemented. Frontend pages are next.

*Detailed setup instructions available in the [documentation](https://fablrc.github.io/pumpkin-hub/getting-started.html).*
