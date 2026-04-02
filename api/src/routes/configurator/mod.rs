pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, post},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // ── Collection routes (must be before /{id} to avoid capture conflicts)
        .route(
            "/server-configs",
            get(handlers::list_server_configs).post(handlers::create_server_config),
        )
        // ── Literal sub-paths (registered before the {id} wildcard)
        .route(
            "/server-configs/download-preview",
            post(handlers::download_preview),
        )
        .route(
            "/server-configs/validate",
            post(handlers::validate_config),
        )
        // ── Public share view (literal "share" takes priority over {id} wildcard)
        .route(
            "/server-configs/share/{token}",
            get(handlers::get_by_share_token),
        )
        // ── Per-resource routes
        .route(
            "/server-configs/{id}",
            get(handlers::get_server_config)
                .put(handlers::update_server_config)
                .delete(handlers::delete_server_config),
        )
        .route(
            "/server-configs/{id}/rotate-share-token",
            post(handlers::rotate_share_token),
        )
        .route(
            "/server-configs/{id}/download",
            post(handlers::download_server_config),
        )
}
