use reqwest::header::{ACCEPT, AUTHORIZATION};
use serde::Deserialize;

/// Google user profile returned by the OpenID Connect userinfo endpoint.
#[derive(Debug, Deserialize)]
pub struct GoogleUser {
    pub sub: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub picture: Option<String>,
}

/// Fetches the authenticated user's profile from Google's userinfo API.
pub async fn fetch_google_user(access_token: &str) -> Result<GoogleUser, reqwest::Error> {
    let client = reqwest::Client::new();

    client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/json")
        .send()
        .await?
        .error_for_status()?
        .json::<GoogleUser>()
        .await
}
