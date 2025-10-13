// Server module - Embedded HTTP server for standalone mode
use axum::{
    Router,
    extract::State,
    http::{StatusCode, Method, header},
    response::{IntoResponse, Response},
    Json,
};
use tower::ServiceBuilder;
use tower_http::{
    services::{ServeDir, ServeFile},
    cors::{CorsLayer, Any},
    trace::TraceLayer,
};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::Arc,
};
use tokio::net::TcpListener;
use serde::{Deserialize, Serialize};

pub mod config;
pub mod static_files;
pub mod api;
pub mod middleware;
pub mod utils;

use config::ServerConfig;
use api::create_api_routes;

#[derive(Clone)]
pub struct ServerState {
    pub config: Arc<ServerConfig>,
    pub static_dir: PathBuf,
    pub db_pool: sqlx::SqlitePool,
}

#[derive(Debug, Serialize)]
pub struct ServerInfo {
    pub url: String,
    pub port: u16,
    pub status: String,
}

/// Initialize and start the embedded HTTP server
pub async fn start_server(
    static_dir: PathBuf,
    db_pool: sqlx::SqlitePool,
) -> Result<ServerInfo, ServerError> {
    // Find an available port
    let port = utils::port::find_available_port()?;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    // Create server configuration
    let config = Arc::new(ServerConfig::new(port));

    // Create shared state
    let state = ServerState {
        config: config.clone(),
        static_dir: static_dir.clone(),
        db_pool,
    };

    // Build the application router
    let app = create_app(state).await?;

    // Create TCP listener
    let listener = TcpListener::bind(addr).await?;

    println!("🚀 Server starting on http://127.0.0.1:{}", port);

    // Spawn the server in the background
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("Server error: {}", e);
        }
    });

    Ok(ServerInfo {
        url: format!("http://127.0.0.1:{}", port),
        port,
        status: "running".to_string(),
    })
}

/// Create the main application router
async fn create_app(state: ServerState) -> Result<Router, ServerError> {
    let static_dir = state.static_dir.clone();

    // Serve index.html for the root path
    let index_service = ServeFile::new(static_dir.join("index.html"));

    // Serve static files from the Next.js build
    let static_service = ServeDir::new(&static_dir)
        .not_found_service(index_service.clone());

    // Create API routes
    let api_routes = create_api_routes();

    // Build the main router
    let app = Router::new()
        // API routes
        .nest("/api", api_routes)
        // Health check endpoint
        .route("/health", axum::routing::get(health_check))
        // Static files and fallback to index.html for client-side routing
        .fallback_service(static_service)
        // Add state
        .with_state(state)
        // Add middleware
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods([
                            Method::GET,
                            Method::POST,
                            Method::PUT,
                            Method::DELETE,
                            Method::OPTIONS,
                        ])
                        .allow_headers(Any)
                        .expose_headers([header::CONTENT_TYPE])
                )
        );

    Ok(app)
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

/// Server error type
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    #[error("Failed to find available port")]
    PortNotFound,

    #[error("Failed to bind to address: {0}")]
    BindError(#[from] std::io::Error),

    #[error("Server configuration error: {0}")]
    ConfigError(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
}

impl IntoResponse for ServerError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ServerError::PortNotFound => {
                (StatusCode::SERVICE_UNAVAILABLE, "No available port found")
            }
            ServerError::BindError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to start server")
            }
            ServerError::ConfigError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Configuration error")
            }
            ServerError::DatabaseError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
        };

        let body = Json(serde_json::json!({
            "error": error_message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}