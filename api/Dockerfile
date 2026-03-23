# PRODUCTION — build multi-stage Rust (release, musl statique)
# Utilise rustls → pas de dépendance OpenSSL → binaire 100% statique sur Alpine

# ---- Stage 1 : builder ----
FROM rust:alpine AS builder

# Dépendances système pour musl + compilation
RUN apk add --no-cache musl-dev pkgconfig

WORKDIR /app

# Cache des dépendances : on compile un crate vide pour capturer les deps
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src \
    && echo 'fn main() {}' > src/main.rs \
    && echo '' > src/lib.rs \
    && cargo build --release --locked \
    && rm -f target/release/deps/pumpkin_hub_api* \
    && rm -rf target/release/.fingerprint/pumpkin-hub-api-*

# Compilation réelle
COPY src ./src
COPY migrations ./migrations
# Nécessite que `cargo sqlx prepare` ait été exécuté (.sqlx/ présent dans le repo)
ENV SQLX_OFFLINE=true
RUN cargo build --release --locked

# ---- Stage 2 : runner ----
FROM alpine:3

RUN apk add --no-cache ca-certificates curl

RUN adduser -D -u 1001 pumpkin

WORKDIR /app

COPY --from=builder /app/target/release/pumpkin-hub-api ./
COPY --from=builder /app/migrations ./migrations

RUN chown -R pumpkin:pumpkin /app

USER pumpkin

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

CMD ["./pumpkin-hub-api"]
