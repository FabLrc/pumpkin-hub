use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Centralised application error type.
/// Each variant maps to a specific HTTP status code and client-facing message.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,

    #[error("Unprocessable entity: {0}")]
    UnprocessableEntity(String),

    #[error("Unauthorized")]
    Unauthorized,

    /// Wraps any internal error as a boxed trait object.
    /// The root cause is logged server-side but never sent to the client.
    #[error("Internal server error")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::UnprocessableEntity(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Internal(err) => {
                // Log the root cause server-side, never expose it to the client.
                tracing::error!(%err, "Internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred".to_string(),
                )
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl AppError {
    /// Wraps any boxable error as an `Internal` variant.
    pub fn internal<E>(err: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        AppError::Internal(Box::new(err))
    }
}
