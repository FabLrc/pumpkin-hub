pub(crate) mod dto;
pub(crate) mod handlers;

use axum::{
    routing::{get, patch, post, put},
    Router,
};

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        // Public: list reviews for a plugin
        .route(
            "/plugins/{slug}/reviews",
            get(handlers::list_reviews).post(handlers::create_review),
        )
        // Authenticated: update or delete own review
        .route(
            "/plugins/{slug}/reviews/{review_id}",
            put(handlers::update_review).delete(handlers::delete_review),
        )
        // Plugin author / staff: toggle review visibility
        .route(
            "/plugins/{slug}/reviews/{review_id}/hide",
            patch(handlers::toggle_review_visibility),
        )
        // Authenticated: report abusive review
        .route(
            "/plugins/{slug}/reviews/{review_id}/report",
            post(handlers::report_review),
        )
        // Admin: manage reports
        .route("/admin/review-reports", get(handlers::list_reports))
        .route(
            "/admin/review-reports/{report_id}/resolve",
            patch(handlers::resolve_report),
        )
}
