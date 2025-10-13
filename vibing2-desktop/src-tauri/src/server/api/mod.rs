// API routes module - Handles all API endpoints
use axum::{
    Router,
    routing::{get, post},
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub mod auth;
pub mod projects;
pub mod agents;
pub mod stream;

use crate::server::ServerState;

/// Create all API routes
pub fn create_api_routes() -> Router<ServerState> {
    Router::new()
        // Authentication routes
        .route("/auth/signin", post(auth::signin))
        .route("/auth/signup", post(auth::signup))
        .route("/auth/signout", post(auth::signout))
        .route("/auth/session", get(auth::get_session))

        // Project management routes
        .route("/projects/list", get(projects::list_projects))
        .route("/projects/save", post(projects::save_project))
        .route("/projects/load", post(projects::load_project))
        .route("/projects/:id", get(projects::get_project))
        .route("/projects/:id", post(projects::update_project))
        .route("/projects/:id", axum::routing::delete(projects::delete_project))

        // Agent routes
        .route("/agents/list", get(agents::list_agents))
        .route("/agents/:id", get(agents::get_agent))

        // Streaming routes
        .route("/agent/stream", post(stream::handle_stream))

        // Health and metrics
        .route("/health", get(health))
        .route("/metrics", get(metrics))
}

/// Health check endpoint
async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

/// Metrics endpoint
async fn metrics(State(state): State<ServerState>) -> impl IntoResponse {
    // TODO: Implement actual metrics collection
    Json(json!({
        "uptime": 0,
        "requests_total": 0,
        "active_connections": 0,
        "memory_usage": 0,
        "cpu_usage": 0,
    }))
}

/// Generic error response
pub fn error_response(status: StatusCode, message: &str) -> impl IntoResponse {
    (
        status,
        Json(json!({
            "error": message,
            "status": status.as_u16(),
        }))
    )
}