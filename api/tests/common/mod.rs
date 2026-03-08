use axum::Router;
use pumpkin_hub_api::config::{Config, GithubConfig, JwtConfig, MeilisearchConfig, ServerConfig};
use sqlx::PgPool;
use std::net::SocketAddr;

/// Builds a fully configured test app connected to the test database.
/// Requires `TEST_DATABASE_URL` or falls back to the development database.
pub async fn build_test_app() -> (Router, PgPool) {
    let database_url = std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://pumpkin_user:dev_password@localhost:5432/pumpkin_hub_dev".to_string()
    });

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .unwrap();

    let config = Config {
        server: ServerConfig {
            address: SocketAddr::from(([127, 0, 0, 1], 0)),
            allowed_origins: vec!["http://localhost:3000".to_string()],
            api_public_url: "http://localhost:8080".to_string(),
        },
        database_url: database_url.clone(),
        meilisearch: MeilisearchConfig {
            url: "http://localhost:7700".to_string(),
            master_key: "test_key".to_string(),
        },
        github: GithubConfig {
            client_id: "test_client_id".to_string(),
            client_secret: "test_client_secret".to_string(),
            redirect_uri: "http://localhost:8080/api/v1/auth/github/callback".to_string(),
        },
        google: None,
        discord: None,
        jwt: JwtConfig {
            secret: "integration-test-secret-key-do-not-use-in-production".to_string(),
            ttl_seconds: 3600,
        },
    };

    let app = pumpkin_hub_api::build_app(config, pool.clone());
    (app, pool)
}

/// Creates a test user and returns (user_id, jwt_token).
pub async fn create_test_user(pool: &PgPool, username: &str) -> (uuid::Uuid, String) {
    let user_id: uuid::Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, '$argon2id$v=19$m=19456,t=2,p=1$salt$hash')
         RETURNING id",
    )
    .bind(username)
    .bind(format!("{username}@test.local"))
    .fetch_one(pool)
    .await
    .unwrap();

    let jwt_config = JwtConfig {
        secret: "integration-test-secret-key-do-not-use-in-production".to_string(),
        ttl_seconds: 3600,
    };

    let token =
        pumpkin_hub_api::auth::jwt::encode_token(&jwt_config, user_id, username, "author")
            .unwrap();

    (user_id, token)
}

/// Cleans up test data created during an integration test.  
/// Called at the end of each test to keep the DB clean.
pub async fn cleanup_test_data(pool: &PgPool, user_ids: &[uuid::Uuid]) {
    for user_id in user_ids {
        // Delete in dependency order
        sqlx::query("DELETE FROM user_avatars WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM plugin_categories WHERE plugin_id IN (SELECT id FROM plugins WHERE author_id = $1)")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM versions WHERE plugin_id IN (SELECT id FROM plugins WHERE author_id = $1)")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM plugins WHERE author_id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM auth_providers WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
    }
}
