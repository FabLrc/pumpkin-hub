use pumpkin_hub_api::{
    config::Config,
    db,
    search::{PumpkinVersionFetcher, SearchService},
    storage::{pumpkin_binary::PumpkinBinaryCache, ObjectStorage},
};

#[tokio::main]
async fn main() {
    // Load .env file in development — silently ignored if absent in production.
    let _ = dotenvy::dotenv();

    // Initialise structured logging with ENV-controlled verbosity.
    // Default to INFO if RUST_LOG is not set.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "pumpkin_hub_api=info,tower_http=debug".parse().unwrap()),
        )
        .init();

    let config = Config::from_env().unwrap_or_else(|err| {
        tracing::error!(%err, "Failed to load configuration");
        std::process::exit(1);
    });

    tracing::info!("Connecting to database and running migrations…");
    let pool = db::connect_and_migrate(&config.database_url)
        .await
        .unwrap_or_else(|err| {
            tracing::error!(%err, "Failed to connect to database");
            std::process::exit(1);
        });
    tracing::info!("Database ready");

    tracing::info!("Connecting to object storage…");
    let storage = ObjectStorage::from_config(&config.s3).await;
    tracing::info!("Object storage ready");

    tracing::info!("Initializing Meilisearch…");
    let search = SearchService::new(&config.meilisearch);
    if let Err(err) = search.configure_index().await {
        tracing::error!(%err, "Failed to configure Meilisearch index");
        std::process::exit(1);
    }

    // Re-index all existing plugins on startup
    match search.reindex_all(&pool).await {
        Ok(count) => tracing::info!("Meilisearch initial index: {count} plugins"),
        Err(err) => tracing::warn!(%err, "Initial reindex failed — search may be stale"),
    }
    tracing::info!("Meilisearch ready");

    tracing::info!("Fetching Pumpkin MC versions from GitHub…");
    let pumpkin_versions = PumpkinVersionFetcher::new();
    match pumpkin_versions.refresh().await {
        Ok(()) => tracing::info!("Pumpkin versions cache populated"),
        Err(err) => tracing::warn!("Failed to fetch Pumpkin versions: {err}"),
    }

    let pumpkin_binary_cache = PumpkinBinaryCache::new();

    let addr = config.server.address;
    tracing::info!(%addr, "Starting pumpkin-hub-api");

    let app = pumpkin_hub_api::build_app(
        config,
        pool,
        storage,
        search,
        pumpkin_versions,
        pumpkin_binary_cache,
    );

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|err| {
            tracing::error!(%err, %addr, "Failed to bind TCP listener");
            std::process::exit(1);
        });

    tracing::info!("Listening on http://{addr}");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .unwrap_or_else(|err| {
        tracing::error!(%err, "Server error");
        std::process::exit(1);
    });
}

/// Listens for CTRL+C (and SIGTERM on Unix) before initiating graceful shutdown.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install CTRL+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, stopping server...");
}
