use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::Deserialize;

/// GitHub user profile returned by `GET /user`.
#[derive(Debug, Deserialize)]
pub struct GithubUser {
    pub id: i64,
    pub login: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

/// Fetches the authenticated user's profile from the GitHub API.
pub async fn fetch_github_user(access_token: &str) -> Result<GithubUser, reqwest::Error> {
    let client = reqwest::Client::new();

    client
        .get("https://api.github.com/user")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/vnd.github+json")
        .header(USER_AGENT, "pumpkin-hub-api")
        .send()
        .await?
        .error_for_status()?
        .json::<GithubUser>()
        .await
}
