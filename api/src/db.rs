use sqlx::{postgres::PgPoolOptions, PgPool};

/// Maximum number of connections in the pool.
const MAX_CONNECTIONS: u32 = 10;

/// Creates a PostgreSQL connection pool and runs pending migrations.
pub async fn connect_and_migrate(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(MAX_CONNECTIONS)
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
