# API Rust — Guide Claude Code

## Stack

- **Framework** : Axum 0.8 + Tokio 1 (async runtime)
- **Base de données** : PostgreSQL 16 via SQLx 0.8 (requêtes vérifiées au compile-time)
- **Recherche** : Meilisearch SDK 0.27
- **Stockage** : AWS SDK S3 (MinIO en dev, Cloudflare R2 en prod)
- **Auth** : JWT (jsonwebtoken) + OAuth2 (GitHub/Google/Discord) + Argon2id + API Keys (HMAC-SHA256)
- **Rate limiting** : tower_governor (par IP + par API key)
- **Email** : Lettre 0.11 (SMTP async)
- **Logs** : tracing + tracing-subscriber

## Structure des fichiers

```
api/
├── Cargo.toml
├── migrations/          # Migrations SQLx (exécutées au démarrage)
├── src/
│   ├── main.rs          # Point d'entrée, séquence de démarrage
│   ├── lib.rs           # build_app(), stack de middlewares
│   ├── config.rs        # Config::from_env() — toutes les variables d'env
│   ├── state.rs         # AppState (pool, storage, search, config)
│   ├── db.rs            # Pool PostgreSQL + migrations auto
│   ├── error.rs         # AppError enum (NotFound, Unauthorized, etc.)
│   ├── email.rs         # Service SMTP
│   ├── rate_limit.rs    # Configuration rate limiting
│   ├── auth/
│   │   ├── mod.rs
│   │   ├── jwt.rs       # Encode/decode JWT, claims
│   │   ├── password.rs  # Hash/verify Argon2id
│   │   ├── middleware.rs # AuthUser extractor (JWT + fallback API key)
│   │   ├── api_key_middleware.rs  # Pre-resolve API key, rate limit, audit
│   │   ├── github.rs    # OAuth GitHub
│   │   ├── google.rs    # OAuth Google (OpenID Connect)
│   │   └── discord.rs   # OAuth Discord
│   ├── github/
│   │   └── client.rs    # Client GitHub App (JWT RS256, tokens d'installation)
│   ├── models/          # Structs SQLx (User, Plugin, Version, Binary, etc.)
│   ├── routes/
│   │   ├── mod.rs       # Assemblage du routeur
│   │   ├── auth.rs      # /auth/* (register, login, OAuth, email verify, etc.)
│   │   ├── plugins/     # /plugins/* CRUD (mod.rs, handlers.rs, dto.rs)
│   │   ├── search/      # /search, /search/suggest, /pumpkin-versions
│   │   ├── categories/  # /categories
│   │   ├── reviews/     # /plugins/{slug}/reviews, /reviews/{id}/report
│   │   ├── media/       # /plugins/{slug}/media
│   │   ├── changelogs/  # /plugins/{slug}/changelog
│   │   ├── dependencies/# /plugins/{slug}/versions/{v}/dependencies
│   │   ├── github/      # GitHub integration + webhooks
│   │   ├── dashboard/   # /dashboard/stats, /dashboard/my-plugins
│   │   ├── api_keys/    # /api-keys CRUD
│   │   ├── notifications/ # /notifications
│   │   ├── users/       # /users/{id} profil public
│   │   └── admin/       # Modération (role-protected)
│   ├── search/
│   │   └── indexer.rs   # Client Meilisearch, indexation, config de l'index
│   └── storage/
│       └── mod.rs       # Client S3 (upload, presigned download, delete)
└── tests/
    ├── api_integration.rs  # Tests d'intégration (oneshot requests)
    └── common/mod.rs       # Utilitaires de test (build_test_app, create_test_user)
```

## Conventions de code

### Gestion d'erreurs
- Enum centralisé `AppError` dans `src/error.rs`
- Variantes : `NotFound`, `UnprocessableEntity(msg)`, `Unauthorized`, `Forbidden`, `Conflict(msg)`, `Internal(Box<dyn Error>)`
- Mapping HTTP : 404, 422, 401, 403, 409, 500
- Pattern : `.map_err(AppError::internal)` pour boxer les erreurs
- Réponses erreur : `{ "error": "message" }`

### Nommage
- Structs : PascalCase (`User`, `PluginDocument`)
- Fonctions : snake_case (`create_plugin`, `list_binaries`)
- Constantes : UPPER_SNAKE_CASE (`MAX_PER_PAGE`, `REQUEST_ID_HEADER`)
- Champs DB : snake_case (`author_id`, `created_at`)

### Patterns
- **DTOs** : fichier `dto.rs` par module de route, séparation request/response
- **Pagination** : `PaginatedResponse<T>` avec `PaginationMeta`
- **Auth** : extracteur `AuthUser` pour les endpoints protégés
- **SQL** : requêtes brutes paramétrées via SQLx (pas d'ORM), `RETURNING` pour récupérer les lignes
- **State** : `AppState` wrappé dans `Arc`, extrait via `State<AppState>`
- **Fire-and-forget** : `tokio::spawn` pour les tâches non-critiques (emails, audit logs)

### Middlewares (ordre dans `lib.rs`)
1. SetRequestIdLayer (UUID)
2. TraceLayer (structured logging)
3. PropagateRequestIdLayer (x-request-id en réponse)
4. TimeoutLayer (30s global)
5. CompressionLayer (gzip)
6. CorsLayer (origines configurables)
7. API Key Middleware (pre-resolve + rate limit + audit)
8. DefaultBodyLimit (taille max binaires + 5MB)

### Rate Limiting
- Auth : 4 req/sec, burst 5 (strict)
- Général : 1 req/sec, burst 30
- API Keys : limites custom par clé
- Nettoyage background toutes les 60s

## Stockage S3

- Clés : `plugins/{slug}/{version}/{platform}/{filename}`
- URLs présignées : TTL 1h
- Deux clients S3 : interne (Docker) + public (browser-reachable)

## Recherche Meilisearch

- Index configuré au démarrage (searchable, filterable, sortable attributes)
- Re-indexation complète au boot
- Document dénormalisé : `PluginDocument` (nom, description, auteur, catégories, plateformes, versions, rating)

## Tests

- Intégration : `axum::ServiceExt::oneshot` (pas de bind réseau)
- `build_test_app()` crée l'app complète avec DB test
- `create_test_user()` retourne `(user_id, jwt_token)`
- `cleanup_test_data(pool, user_ids)` pour le nettoyage
- Tests unitaires inline dans `auth/jwt.rs`, `auth/password.rs`, `models/user.rs`

## Commandes

```bash
cargo run                          # Lancer (nécessite .env + services Docker)
cargo fmt --all                    # Formatage (obligatoire, vérifié en CI)
cargo clippy -- -D warnings        # Lint strict
cargo test                         # Tests
cargo tarpaulin --out lcov         # Couverture
sqlx migrate run                   # Migrations manuelles
```
