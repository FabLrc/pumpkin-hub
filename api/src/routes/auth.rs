use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use axum_extra::extract::cookie::{Cookie, SameSite};
use axum_extra::extract::CookieJar;
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, RedirectUrl, TokenResponse,
    TokenUrl,
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::{
        discord::fetch_discord_user,
        github::fetch_github_user,
        google::fetch_google_user,
        jwt,
        middleware::{AuthUser, AUTH_COOKIE_NAME},
        password,
    },
    error::AppError,
    state::AppState,
};

const GITHUB_AUTH_URL: &str = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const DISCORD_AUTH_URL: &str = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL: &str = "https://discord.com/api/oauth2/token";
const CSRF_COOKIE_NAME: &str = "pumpkin_hub_csrf";

/// Minimum password length for registration.
const MIN_PASSWORD_LENGTH: usize = 8;
/// Maximum password length (prevents DoS via huge Argon2 inputs).
const MAX_PASSWORD_LENGTH: usize = 128;

pub fn routes() -> Router<AppState> {
    Router::new()
        // Email / password
        .route("/auth/register", post(register))
        .route("/auth/login", post(login_email))
        // GitHub OAuth
        .route("/auth/github", get(github_login))
        .route("/auth/github/callback", get(github_callback))
        // Google OAuth
        .route("/auth/google", get(google_login))
        .route("/auth/google/callback", get(google_callback))
        // Discord OAuth
        .route("/auth/discord", get(discord_login))
        .route("/auth/discord/callback", get(discord_callback))
        // Session
        .route("/auth/me", get(me))
        .route("/auth/logout", get(logout))
}

// ═══════════════════════════════════════════════════════════════════════════
// Email / Password Authentication
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
}

/// `POST /api/v1/auth/register` — create a new account with email and password.
async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Response, AppError> {
    validate_registration(&body)?;

    let password_hash = password::hash_password(&body.password)
        .map_err(|e| AppError::Internal(Box::new(HashError(e.to_string()))))?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        r#"
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(body.username.trim())
    .bind(body.email.trim().to_lowercase())
    .bind(&password_hash)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.constraint() == Some("users_username_key") => {
            AppError::Conflict("Username already taken".to_string())
        }
        sqlx::Error::Database(ref db_err) if db_err.constraint() == Some("idx_users_email_unique") => {
            AppError::Conflict("Email already registered".to_string())
        }
        other => AppError::internal(other),
    })?;

    issue_jwt_cookie(&state, &user)
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

/// `POST /api/v1/auth/login` — authenticate with email and password.
async fn login_email(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let email = body.email.trim().to_lowercase();

    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE LOWER(email) = $1",
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::Unauthorized)?;

    let stored_hash = user.password_hash.as_deref().ok_or(AppError::Unauthorized)?;

    let is_valid = password::verify_password(&body.password, stored_hash)
        .map_err(|e| AppError::Internal(Box::new(HashError(e.to_string()))))?;

    if !is_valid {
        return Err(AppError::Unauthorized);
    }

    issue_jwt_cookie(&state, &user)
}

fn validate_registration(body: &RegisterRequest) -> Result<(), AppError> {
    let username = body.username.trim();
    if username.is_empty() || username.len() > 39 {
        return Err(AppError::UnprocessableEntity(
            "Username must be 1-39 characters".to_string(),
        ));
    }
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(AppError::UnprocessableEntity(
            "Username may only contain letters, digits, hyphens and underscores".to_string(),
        ));
    }

    let email = body.email.trim();
    if email.is_empty() || !email.contains('@') || email.len() > 255 {
        return Err(AppError::UnprocessableEntity(
            "A valid email address is required".to_string(),
        ));
    }

    if body.password.len() < MIN_PASSWORD_LENGTH || body.password.len() > MAX_PASSWORD_LENGTH {
        return Err(AppError::UnprocessableEntity(format!(
            "Password must be between {MIN_PASSWORD_LENGTH} and {MAX_PASSWORD_LENGTH} characters"
        )));
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// GitHub OAuth
// ═══════════════════════════════════════════════════════════════════════════

/// `GET /api/v1/auth/github` — redirects the user to GitHub's OAuth page.
async fn github_login(State(state): State<AppState>) -> Result<Response, AppError> {
    let github = &state.config.github;

    let client = oauth2::basic::BasicClient::new(ClientId::new(github.client_id.clone()))
        .set_client_secret(ClientSecret::new(github.client_secret.clone()))
        .set_auth_uri(AuthUrl::new(GITHUB_AUTH_URL.to_string()).map_err(AppError::internal)?)
        .set_redirect_uri(
            RedirectUrl::new(github.redirect_uri.clone()).map_err(AppError::internal)?,
        );

    let (auth_url, csrf_state) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(oauth2::Scope::new("read:user".to_string()))
        .add_scope(oauth2::Scope::new("user:email".to_string()))
        .url();

    set_csrf_and_redirect(&csrf_state, auth_url.as_str())
}

#[derive(Debug, Deserialize)]
pub struct CallbackParams {
    pub code: String,
    pub state: String,
}

/// `GET /api/v1/auth/github/callback` — handles the GitHub OAuth callback.
async fn github_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    jar: CookieJar,
) -> Result<Response, AppError> {
    verify_csrf(&jar, &params.state)?;

    let github = &state.config.github;

    let access_token = exchange_oauth_code(
        &github.client_id,
        &github.client_secret,
        GITHUB_TOKEN_URL,
        &github.redirect_uri,
        params.code,
    )
    .await?;
    let github_user = fetch_github_user(&access_token)
        .await
        .map_err(AppError::internal)?;

    let user = upsert_oauth_user(
        &state,
        "github",
        &github_user.id.to_string(),
        &github_user.login,
        github_user.name.as_deref(),
        github_user.email.as_deref(),
        github_user.avatar_url.as_deref(),
        github_user.bio.as_deref(),
    )
    .await?;

    issue_jwt_redirect(&state, &user)
}

// ═══════════════════════════════════════════════════════════════════════════
// Google OAuth
// ═══════════════════════════════════════════════════════════════════════════

/// `GET /api/v1/auth/google` — redirects the user to Google's OAuth page.
async fn google_login(State(state): State<AppState>) -> Result<Response, AppError> {
    let google = state
        .config
        .google
        .as_ref()
        .ok_or(AppError::UnprocessableEntity(
            "Google OAuth is not configured".to_string(),
        ))?;

    let client = oauth2::basic::BasicClient::new(ClientId::new(google.client_id.clone()))
        .set_client_secret(ClientSecret::new(google.client_secret.clone()))
        .set_auth_uri(AuthUrl::new(GOOGLE_AUTH_URL.to_string()).map_err(AppError::internal)?)
        .set_redirect_uri(
            RedirectUrl::new(google.redirect_uri.clone()).map_err(AppError::internal)?,
        );

    let (auth_url, csrf_state) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(oauth2::Scope::new("openid".to_string()))
        .add_scope(oauth2::Scope::new("email".to_string()))
        .add_scope(oauth2::Scope::new("profile".to_string()))
        .url();

    set_csrf_and_redirect(&csrf_state, auth_url.as_str())
}

/// `GET /api/v1/auth/google/callback` — handles the Google OAuth callback.
async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    jar: CookieJar,
) -> Result<Response, AppError> {
    verify_csrf(&jar, &params.state)?;

    let google = state
        .config
        .google
        .as_ref()
        .ok_or(AppError::UnprocessableEntity(
            "Google OAuth is not configured".to_string(),
        ))?;

    let access_token = exchange_oauth_code(
        &google.client_id,
        &google.client_secret,
        GOOGLE_TOKEN_URL,
        &google.redirect_uri,
        params.code,
    )
    .await?;
    let google_user = fetch_google_user(&access_token)
        .await
        .map_err(AppError::internal)?;

    // Derive a username from the email or use the Google sub as fallback.
    let username = google_user
        .email
        .as_deref()
        .and_then(|e| e.split('@').next())
        .unwrap_or(&google_user.sub);

    let user = upsert_oauth_user(
        &state,
        "google",
        &google_user.sub,
        username,
        google_user.name.as_deref(),
        google_user.email.as_deref(),
        google_user.picture.as_deref(),
        None,
    )
    .await?;

    issue_jwt_redirect(&state, &user)
}

// ═══════════════════════════════════════════════════════════════════════════
// Discord OAuth
// ═══════════════════════════════════════════════════════════════════════════

/// `GET /api/v1/auth/discord` — redirects the user to Discord's OAuth page.
async fn discord_login(State(state): State<AppState>) -> Result<Response, AppError> {
    let discord = state
        .config
        .discord
        .as_ref()
        .ok_or(AppError::UnprocessableEntity(
            "Discord OAuth is not configured".to_string(),
        ))?;

    let client = oauth2::basic::BasicClient::new(ClientId::new(discord.client_id.clone()))
        .set_client_secret(ClientSecret::new(discord.client_secret.clone()))
        .set_auth_uri(AuthUrl::new(DISCORD_AUTH_URL.to_string()).map_err(AppError::internal)?)
        .set_redirect_uri(
            RedirectUrl::new(discord.redirect_uri.clone()).map_err(AppError::internal)?,
        );

    let (auth_url, csrf_state) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(oauth2::Scope::new("identify".to_string()))
        .add_scope(oauth2::Scope::new("email".to_string()))
        .url();

    set_csrf_and_redirect(&csrf_state, auth_url.as_str())
}

/// `GET /api/v1/auth/discord/callback` — handles the Discord OAuth callback.
async fn discord_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    jar: CookieJar,
) -> Result<Response, AppError> {
    verify_csrf(&jar, &params.state)?;

    let discord = state
        .config
        .discord
        .as_ref()
        .ok_or(AppError::UnprocessableEntity(
            "Discord OAuth is not configured".to_string(),
        ))?;

    let access_token = exchange_oauth_code(
        &discord.client_id,
        &discord.client_secret,
        DISCORD_TOKEN_URL,
        &discord.redirect_uri,
        params.code,
    )
    .await?;
    let discord_user = fetch_discord_user(&access_token)
        .await
        .map_err(AppError::internal)?;

    let user = upsert_oauth_user(
        &state,
        "discord",
        &discord_user.id,
        &discord_user.username,
        discord_user.global_name.as_deref(),
        discord_user.email.as_deref(),
        discord_user.avatar_url().as_deref(),
        None,
    )
    .await?;

    issue_jwt_redirect(&state, &user)
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Endpoints
// ═══════════════════════════════════════════════════════════════════════════

/// `GET /api/v1/auth/me` — returns the current authenticated user's profile.
async fn me(State(state): State<AppState>, auth: AuthUser) -> Result<Json<UserProfile>, AppError> {
    let user = sqlx::query_as::<_, crate::models::user::User>("SELECT * FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::internal)?
        .ok_or(AppError::NotFound)?;

    Ok(Json(UserProfile::from(user)))
}

/// `GET /api/v1/auth/logout` — clears the auth cookie.
async fn logout(jar: CookieJar) -> impl IntoResponse {
    let remove_cookie = Cookie::build(AUTH_COOKIE_NAME)
        .path("/")
        .max_age(time::Duration::ZERO)
        .build();

    let jar = jar.add(remove_cookie);

    (jar, Json(serde_json::json!({ "message": "Logged out" })))
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Helpers
// ═══════════════════════════════════════════════════════════════════════════

/// Builds an OAuth2 client and exchanges an authorization code for an access token.
async fn exchange_oauth_code(
    client_id: &str,
    client_secret: &str,
    token_url: &str,
    redirect_uri: &str,
    code: String,
) -> Result<String, AppError> {
    let client = oauth2::basic::BasicClient::new(ClientId::new(client_id.to_string()))
        .set_client_secret(ClientSecret::new(client_secret.to_string()))
        .set_token_uri(TokenUrl::new(token_url.to_string()).map_err(AppError::internal)?)
        .set_redirect_uri(
            RedirectUrl::new(redirect_uri.to_string()).map_err(AppError::internal)?,
        );

    let http_client = reqwest::Client::new();

    let token_response = client
        .exchange_code(AuthorizationCode::new(code))
        .request_async(&http_client)
        .await
        .map_err(|e| AppError::Internal(Box::new(OAuthTokenError(e.to_string()))))?;

    Ok(token_response.access_token().secret().to_string())
}

/// Finds or creates a user from an OAuth provider and links the provider.
///
/// Strategy:
/// 1. If an `auth_providers` record exists for (provider, provider_id) → return that user.
/// 2. If a user exists with the same email → link the provider and return.
/// 3. Otherwise → create a new user and link the provider.
async fn upsert_oauth_user(
    state: &AppState,
    provider: &str,
    provider_id: &str,
    username: &str,
    display_name: Option<&str>,
    email: Option<&str>,
    avatar_url: Option<&str>,
    bio: Option<&str>,
) -> Result<crate::models::user::User, AppError> {
    // 1. Check if this provider link already exists.
    let existing = sqlx::query_as::<_, crate::models::user::User>(
        r#"
        SELECT u.* FROM users u
        JOIN auth_providers ap ON ap.user_id = u.id
        WHERE ap.provider = $1 AND ap.provider_id = $2
        "#,
    )
    .bind(provider)
    .bind(provider_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?;

    if let Some(mut user) = existing {
        // Update profile fields from the provider on each login.
        user = sqlx::query_as::<_, crate::models::user::User>(
            r#"
            UPDATE users SET
                display_name = COALESCE($2, display_name),
                email = COALESCE($3, email),
                avatar_url = COALESCE($4, avatar_url),
                bio = COALESCE($5, bio),
                updated_at = now()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(user.id)
        .bind(display_name)
        .bind(email)
        .bind(avatar_url)
        .bind(bio)
        .fetch_one(&state.db)
        .await
        .map_err(AppError::internal)?;

        return Ok(user);
    }

    // 2. Try to find an existing user by email and link the new provider.
    if let Some(email_val) = email {
        let email_user = sqlx::query_as::<_, crate::models::user::User>(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
        )
        .bind(email_val)
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::internal)?;

        if let Some(user) = email_user {
            link_provider(&state.db, user.id, provider, provider_id).await?;
            return Ok(user);
        }
    }

    // 3. Create a new user with a unique username.
    let unique_username = ensure_unique_username(&state.db, username).await?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        r#"
        INSERT INTO users (username, display_name, email, avatar_url, bio)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(&unique_username)
    .bind(display_name)
    .bind(email)
    .bind(avatar_url)
    .bind(bio)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    link_provider(&state.db, user.id, provider, provider_id).await?;

    Ok(user)
}

/// Inserts a row into `auth_providers` linking a user to an OAuth provider.
async fn link_provider(
    db: &sqlx::PgPool,
    user_id: uuid::Uuid,
    provider: &str,
    provider_id: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO auth_providers (user_id, provider, provider_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (provider, provider_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(provider)
    .bind(provider_id)
    .execute(db)
    .await
    .map_err(AppError::internal)?;

    Ok(())
}

/// Generates a unique username by appending a numeric suffix if the base is taken.
async fn ensure_unique_username(
    db: &sqlx::PgPool,
    base_username: &str,
) -> Result<String, AppError> {
    let clean = base_username
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();
    let base = if clean.is_empty() {
        "user".to_string()
    } else {
        clean[..clean.len().min(35)].to_string()
    };

    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)")
            .bind(&base)
            .fetch_one(db)
            .await
            .map_err(AppError::internal)?;

    if !exists {
        return Ok(base);
    }

    // Append incrementing suffix (-1, -2, etc.) until we find a free name.
    for suffix in 1..100 {
        let candidate = format!("{base}-{suffix}");
        let taken: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)")
                .bind(&candidate)
                .fetch_one(db)
                .await
                .map_err(AppError::internal)?;
        if !taken {
            return Ok(candidate);
        }
    }

    Err(AppError::Conflict(
        "Unable to generate a unique username".to_string(),
    ))
}

/// Sets a CSRF cookie and returns a redirect response.
fn set_csrf_and_redirect(csrf_state: &CsrfToken, url: &str) -> Result<Response, AppError> {
    let csrf_cookie = Cookie::build((CSRF_COOKIE_NAME, csrf_state.secret().to_string()))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::minutes(10))
        .build();

    let jar = CookieJar::new().add(csrf_cookie);

    Ok((jar, Redirect::to(url)).into_response())
}

/// Validates the CSRF cookie matches the callback state parameter.
fn verify_csrf(jar: &CookieJar, state_param: &str) -> Result<(), AppError> {
    let csrf_cookie = jar.get(CSRF_COOKIE_NAME).ok_or(AppError::Unauthorized)?;
    if csrf_cookie.value() != state_param {
        return Err(AppError::Unauthorized);
    }
    Ok(())
}

/// Issues a JWT in an HttpOnly cookie and returns a JSON response (for API calls).
fn issue_jwt_cookie(
    state: &AppState,
    user: &crate::models::user::User,
) -> Result<Response, AppError> {
    let token = jwt::encode_token(&state.config.jwt, user.id, &user.username, &user.role)
        .map_err(AppError::internal)?;

    let auth_cookie = Cookie::build((AUTH_COOKIE_NAME, token))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::seconds(state.config.jwt.ttl_seconds as i64))
        .build();

    let jar = CookieJar::new().add(auth_cookie);

    Ok((jar, Json(UserProfile::from(user.clone()))).into_response())
}

/// Issues a JWT in an HttpOnly cookie and redirects to the frontend (for OAuth flows).
fn issue_jwt_redirect(
    state: &AppState,
    user: &crate::models::user::User,
) -> Result<Response, AppError> {
    let token = jwt::encode_token(&state.config.jwt, user.id, &user.username, &user.role)
        .map_err(AppError::internal)?;

    let auth_cookie = Cookie::build((AUTH_COOKIE_NAME, token))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::seconds(state.config.jwt.ttl_seconds as i64))
        .build();

    let remove_csrf = Cookie::build(CSRF_COOKIE_NAME)
        .path("/")
        .max_age(time::Duration::ZERO)
        .build();

    let jar = CookieJar::new().add(auth_cookie).add(remove_csrf);

    let frontend_url = state
        .config
        .server
        .allowed_origins
        .first()
        .cloned()
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    Ok((jar, Redirect::to(&frontend_url)).into_response())
}

// ═══════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════

/// Public-facing user profile (no internal fields leaked).
#[derive(Debug, Serialize)]
pub struct UserProfile {
    pub id: uuid::Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<crate::models::user::User> for UserProfile {
    fn from(user: crate::models::user::User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            avatar_url: user.avatar_url,
            bio: user.bio,
            role: user.role,
            created_at: user.created_at,
        }
    }
}

/// Newtype to make oauth2 token exchange errors implement `std::error::Error`.
#[derive(Debug)]
struct OAuthTokenError(String);

impl std::fmt::Display for OAuthTokenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "OAuth token exchange failed: {}", self.0)
    }
}

impl std::error::Error for OAuthTokenError {}

/// Newtype for argon2 hash errors (not Send+Sync by default).
#[derive(Debug)]
struct HashError(String);

impl std::fmt::Display for HashError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Password hashing failed: {}", self.0)
    }
}

impl std::error::Error for HashError {}
