# Pumpkin Hub — Guide Claude Code

## Projet

Pumpkin Hub est le registre communautaire de plugins pour le serveur Minecraft **Pumpkin MC** (écrit en Rust). Il permet aux développeurs de publier, versionner et distribuer des plugins compilés (.dll/.so/.dylib) avec vérification SHA-256, recherche instantanée et intégration GitHub.

## Architecture

```
Browser → Next.js Frontend (port 3000) → REST JSON /api/v1/* → Rust/Axum Backend (port 8080)
                                                                  ├─ PostgreSQL 16 (port 5432)
                                                                  ├─ Meilisearch 1.7 (port 7700)
                                                                  └─ MinIO/R2 S3 (port 9000)
```

- **frontend/** — Next.js 16 / React 19 / Tailwind CSS 4 / TypeScript 5 / SWR
- **api/** — Rust / Axum 0.8 / SQLx / Tokio / Tower HTTP
- **docs/** — Documentation HTML statique (GitHub Pages)

## Développement

### Lancement

```bash
docker compose up --build
```

Les services sont accessibles sur :
- Frontend : http://localhost:3000
- API : http://localhost:8080
- MinIO Console : http://localhost:9001 (minioadmin/minioadmin)
- Meilisearch : http://localhost:7700

### Variables d'environnement

- Le `.env` racine est utilisé par Docker Compose (substitution de variables)
- Pour `cargo run` direct, utiliser `api/.env`
- Copier `.env.example` → `.env` et renseigner les clés OAuth (GitHub, Google, Discord)

### Pre-commit hook

Le hook `.githooks/pre-commit` exécute `cargo fmt --all` automatiquement. Si le formatage modifie des fichiers, le commit est annulé et il faut re-stager.

## Conventions de commit

Format observé dans l'historique :
```
type(scope): description courte
```
Types : `fix`, `feat`, `test`, `refactor`, `docs`, `chore`
Scopes : `frontend`, `api`, `ci`

## CI/CD (GitHub Actions)

### Pipeline CI (`ci.yml`)
- **Frontend** : lint (ESLint) → type-check → build → tests Vitest + couverture
- **Backend** : `cargo fmt --check` → `cargo clippy -D warnings` → migrations → tests cargo-tarpaulin
- **SonarQube** : analyse combinée des deux couvertures

### Documentation (`docs.yml`)
- Déploie `docs/` sur GitHub Pages quand des fichiers docs changent sur master

## Standards de code

Les instructions détaillées sont dans `.github/instructions/` :
- `code.instructions.md` — Principes SOLID, Clean Code
- `design-system.md` — Style Brutalist "Maia" (pas de border-radius, orange #f97316)
- `ui-ux.instructions.md` — Accessibilité WCAG 2.1, grille 8px, mobile-first
- `technos.md` — Stack technique et justifications
- `projet.instructions.md` — Vision produit

## Design System

- **Style** : Brutalist — coins carrés uniquement, aucun border-radius
- **Couleurs** : fond #0a0a0a, texte #fff/#a3a3a3, accent orange #f97316
- **Polices** : Raleway (interface) + JetBrains Mono (technique/code)
- **Composants UI** : custom (pas shadcn), dans `frontend/components/ui/`

## Sécurité

- Cookies : HttpOnly + Secure + SameSite=Lax
- Headers : X-Frame-Options DENY, nosniff, strict referrer
- Logout en POST uniquement (anti-CSRF)
- Détails dans `docs/SECURITY_AND_DEPLOYMENT.md`

## Commandes utiles

```bash
# Frontend
cd frontend && npm run dev          # Dev local (hors Docker)
cd frontend && npm run lint         # Lint strict (0 warnings)
cd frontend && npm run test         # Tests Vitest
cd frontend && npm run test:coverage # Couverture (seuils : lines 80%, functions 80%, branches 75%)

# API
cd api && cargo run                 # Dev local (nécessite .env + services)
cd api && cargo fmt --all           # Formatage
cd api && cargo clippy -- -D warnings # Lint
cd api && cargo test                # Tests unitaires + intégration
cd api && cargo tarpaulin --out lcov # Couverture

# Docker
docker compose up --build           # Tout lancer
docker compose up api-dev           # Relancer uniquement l'API
docker compose down -v              # Tout arrêter + supprimer les volumes
```
