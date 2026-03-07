use reqwest::header::{ACCEPT, AUTHORIZATION};
use serde::Deserialize;

/// Discord user profile returned by `GET /users/@me`.
#[derive(Debug, Deserialize)]
pub struct DiscordUser {
    pub id: String,
    pub username: String,
    pub global_name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
}

impl DiscordUser {
    /// Builds the full CDN avatar URL from the user ID and avatar hash.
    pub fn avatar_url(&self) -> Option<String> {
        self.avatar
            .as_ref()
            .map(|hash| format!("https://cdn.discordapp.com/avatars/{}/{hash}.png", self.id))
    }
}

/// Fetches the authenticated user's profile from Discord's API.
pub async fn fetch_discord_user(access_token: &str) -> Result<DiscordUser, reqwest::Error> {
    let client = reqwest::Client::new();

    client
        .get("https://discord.com/api/v10/users/@me")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/json")
        .send()
        .await?
        .error_for_status()?
        .json::<DiscordUser>()
        .await
}
