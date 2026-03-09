mod dto;
mod handlers;

use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // Dashboard overview
        .route("/admin/stats", get(handlers::get_admin_stats))
        // Plugin moderation
        .route(
            "/admin/plugins",
            get(handlers::list_plugins_admin),
        )
        .route(
            "/admin/plugins/{plugin_id}/deactivate",
            post(handlers::deactivate_plugin),
        )
        .route(
            "/admin/plugins/{plugin_id}/reactivate",
            post(handlers::reactivate_plugin),
        )
        // User management
        .route("/admin/users", get(handlers::list_users))
        .route(
            "/admin/users/{user_id}/role",
            patch(handlers::change_user_role),
        )
        .route(
            "/admin/users/{user_id}/deactivate",
            post(handlers::deactivate_user),
        )
        .route(
            "/admin/users/{user_id}/reactivate",
            post(handlers::reactivate_user),
        )
        // Audit log
        .route("/admin/audit-logs", get(handlers::list_audit_logs))
}
