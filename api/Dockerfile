# PRODUCTION — build multi-stage Rust (release)

# ---- Stage 1 : builder ----
FROM rust:slim AS builder

RUN apt-get update \
    && apt-get install -y pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

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
FROM debian:bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y ca-certificates libssl3 curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false -u 1001 pumpkin

WORKDIR /app

COPY --from=builder /app/target/release/pumpkin-hub-api ./
COPY --from=builder /app/migrations ./migrations

RUN chown -R pumpkin:pumpkin /app

USER pumpkin

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

CMD ["./pumpkin-hub-api"]
