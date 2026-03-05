use pumpkin_hub_api::config::Config;

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

    let addr = config.server.address;
    tracing::info!(%addr, "Starting pumpkin-hub-api");

    let app = pumpkin_hub_api::build_app(config);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|err| {
            tracing::error!(%err, %addr, "Failed to bind TCP listener");
            std::process::exit(1);
        });

    tracing::info!("Listening on http://{addr}");

    axum::serve(listener, app)
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
