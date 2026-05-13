pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, post},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // ── Node registry (public, for frontend node palette)
        .route("/studio/nodes", get(handlers::get_node_registry))
        // ── Collection routes
        .route(
            "/studio/projects",
            get(handlers::list_projects).post(handlers::create_project),
        )
        // ── Per-resource routes
        .route(
            "/studio/projects/{id}",
            get(handlers::get_project)
                .put(handlers::update_project)
                .delete(handlers::delete_project),
        )
        // ── Build & publish
        .route(
            "/studio/projects/{id}/build",
            post(handlers::trigger_build),
        )
        .route(
            "/studio/builds/{id}",
            get(handlers::get_build_status),
        )
        .route(
            "/studio/projects/{id}/publish-data",
            get(handlers::get_publish_data),
        )
        .route(
            "/studio/projects/{id}/transfer-binary",
            post(handlers::transfer_binary),
        )
}
