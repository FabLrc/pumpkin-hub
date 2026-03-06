use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect, Response},
    routing::get,
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
        github::fetch_github_user,
        jwt,
        middleware::{AuthUser, AUTH_COOKIE_NAME},
    },
    error::AppError,
    state::AppState,
};

const GITHUB_AUTH_URL: &str = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const CSRF_COOKIE_NAME: &str = "pumpkin_hub_csrf";

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/auth/github", get(login))
        .route("/auth/github/callback", get(callback))
        .route("/auth/me", get(me))
        .route("/auth/logout", get(logout))
}

// ── GET /api/v1/auth/github ─────────────────────────────────────────────────
/// Redirects the user to GitHub's OAuth authorization page.
async fn login(State(state): State<AppState>) -> Result<Response, AppError> {
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

    let csrf_cookie = Cookie::build((CSRF_COOKIE_NAME, csrf_state.secret().to_string()))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::minutes(10))
        .build();

    let jar = CookieJar::new().add(csrf_cookie);

    Ok((jar, Redirect::to(auth_url.as_str())).into_response())
}

#[derive(Debug, Deserialize)]
pub struct CallbackParams {
    pub code: String,
    pub state: String,
}

// ── GET /api/v1/auth/github/callback ────────────────────────────────────────
/// Handles the OAuth callback: exchanges the code for an access token,
/// fetches the GitHub profile, upserts the user, and issues a JWT cookie.
async fn callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    jar: CookieJar,
) -> Result<Response, AppError> {
    // Validate CSRF state
    let csrf_cookie = jar.get(CSRF_COOKIE_NAME).ok_or(AppError::Unauthorized)?;
    if csrf_cookie.value() != params.state {
        return Err(AppError::Unauthorized);
    }

    let github = &state.config.github;

    let client = oauth2::basic::BasicClient::new(ClientId::new(github.client_id.clone()))
        .set_client_secret(ClientSecret::new(github.client_secret.clone()))
        .set_auth_uri(AuthUrl::new(GITHUB_AUTH_URL.to_string()).map_err(AppError::internal)?)
        .set_token_uri(TokenUrl::new(GITHUB_TOKEN_URL.to_string()).map_err(AppError::internal)?)
        .set_redirect_uri(
            RedirectUrl::new(github.redirect_uri.clone()).map_err(AppError::internal)?,
        );

    // Exchange authorization code for access token
    let http_client = reqwest::Client::new();

    let token_response = client
        .exchange_code(AuthorizationCode::new(params.code))
        .request_async(&http_client)
        .await
        .map_err(|e| AppError::Internal(Box::new(OAuthTokenError(e.to_string()))))?;

    let access_token = token_response.access_token().secret();

    // Fetch user profile from GitHub API
    let github_user = fetch_github_user(access_token)
        .await
        .map_err(AppError::internal)?;

    // Upsert user in database (insert or update on conflict)
    let user = sqlx::query_as::<_, crate::models::user::User>(
        r#"
        INSERT INTO users (github_id, username, display_name, email, avatar_url, bio)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (github_id)
        DO UPDATE SET
            username     = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            email        = EXCLUDED.email,
            avatar_url   = EXCLUDED.avatar_url,
            bio          = EXCLUDED.bio,
            updated_at   = now()
        RETURNING *
        "#,
    )
    .bind(github_user.id)
    .bind(&github_user.login)
    .bind(&github_user.name)
    .bind(&github_user.email)
    .bind(&github_user.avatar_url)
    .bind(&github_user.bio)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::internal)?;

    // Issue JWT
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

    // Redirect to the frontend after successful login
    let frontend_url = state
        .config
        .server
        .allowed_origins
        .first()
        .cloned()
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    Ok((jar, Redirect::to(&frontend_url)).into_response())
}

// ── GET /api/v1/auth/me ─────────────────────────────────────────────────────
/// Returns the current authenticated user's profile. Protected route.
async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserProfile>, AppError> {
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::internal)?
    .ok_or(AppError::NotFound)?;

    Ok(Json(UserProfile::from(user)))
}

// ── GET /api/v1/auth/logout ─────────────────────────────────────────────────
/// Clears the auth cookie, effectively logging the user out.
async fn logout(jar: CookieJar) -> impl IntoResponse {
    let remove_cookie = Cookie::build(AUTH_COOKIE_NAME)
        .path("/")
        .max_age(time::Duration::ZERO)
        .build();

    let jar = jar.add(remove_cookie);

    (jar, Json(serde_json::json!({ "message": "Logged out" })))
}

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
