# Phase 1: Code Templates for Native macOS Implementation

**Quick Reference:** Copy-paste ready code templates for immediate implementation

---

## Table of Contents

1. [Main Application Setup](#main-application-setup)
2. [Error Types](#error-types)
3. [Configuration](#configuration)
4. [Application State](#application-state)
5. [Anthropic Client](#anthropic-client)
6. [Agent System](#agent-system)
7. [Database Layer](#database-layer)
8. [Tauri Commands](#tauri-commands)
9. [Testing Templates](#testing-templates)

---

## Main Application Setup

### `src/main.rs`

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod state;
mod types;
mod utils;

use state::AppState;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "vibing2_desktop=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Vibing2 Desktop");

    // Initialize application state
    let app_state = match AppState::new().await {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize application state: {}", e);
            std::process::exit(1);
        }
    };

    tracing::info!("Application state initialized successfully");

    // Build Tauri application
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Stream commands
            commands::stream::stream_ai_response,
            commands::stream::stop_stream,

            // Project commands
            commands::project::create_project,
            commands::project::load_project,
            commands::project::save_project,
            commands::project::list_projects,
            commands::project::delete_project,

            // Agent commands
            commands::agent::list_agents,
            commands::agent::get_agent,
            commands::agent::search_agents,
            commands::agent::auto_select_agent,

            // Auth commands
            commands::auth::check_auth_status,
            commands::auth::validate_api_key,
            commands::auth::save_credentials,
            commands::auth::get_credentials,

            // Health check
            commands::health_check,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Health check command
#[tauri::command]
async fn health_check(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let health = state.health_check().await.map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(health).unwrap())
}
```

### `src/lib.rs`

```rust
pub mod commands;
pub mod core;
pub mod state;
pub mod types;
pub mod utils;

// Re-export commonly used types
pub use types::{AppError, AppResult};
pub use state::AppState;

// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const APP_NAME: &str = env!("CARGO_PKG_NAME");
```

---

## Error Types

### `src/types/error.rs`

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Anthropic API error: {0}")]
    Anthropic(String),

    #[error("Agent error: {0}")]
    Agent(String),

    #[error("Agent not found: {0}")]
    AgentNotFound(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Stream error: {0}")]
    Stream(String),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Invalid API key")]
    InvalidApiKey,

    #[error("Keychain error: {0}")]
    Keychain(String),
}

pub type AppResult<T> = Result<T, AppError>;

// Convert to Tauri error
impl From<AppError> for tauri::Error {
    fn from(err: AppError) -> Self {
        tauri::Error::from(err.to_string())
    }
}

// Implement Serialize for Tauri IPC
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

### `src/types/mod.rs`

```rust
pub mod error;
pub mod config;

pub use error::{AppError, AppResult};
pub use config::AppConfig;
```

---

## Configuration

### `src/types/config.rs`

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::types::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Path to SQLite database
    pub database_url: String,

    /// Anthropic API key (loaded from Keychain)
    pub anthropic_api_key: String,

    /// Agent definitions directory
    pub agents_dir: PathBuf,

    /// Cache size (number of entries)
    pub cache_size: usize,

    /// Rate limit (requests per minute)
    pub rate_limit: u32,

    /// Log level
    pub log_level: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, AppError> {
        // Database path
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| {
                let app_dir = dirs::data_dir()
                    .expect("Failed to get data directory");
                let vibing_dir = app_dir.join("vibing2");
                std::fs::create_dir_all(&vibing_dir).ok();
                format!("{}/vibing2.db", vibing_dir.display())
            });

        // API key from Keychain
        let anthropic_api_key = crate::utils::keychain::get_api_key()
            .unwrap_or_else(|_| {
                std::env::var("ANTHROPIC_API_KEY")
                    .unwrap_or_default()
            });

        // Agents directory
        let agents_dir = std::env::var("AGENTS_DIR")
            .unwrap_or_else(|_| ".claude/agents/agents".to_string())
            .into();

        Ok(Self {
            database_url,
            anthropic_api_key,
            agents_dir,
            cache_size: 1000,
            rate_limit: 60,
            log_level: std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "info".to_string()),
        })
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if self.anthropic_api_key.is_empty() {
            return Err(AppError::Config(
                "Missing Anthropic API key. Please set it in Settings.".into()
            ));
        }

        if !self.agents_dir.exists() {
            return Err(AppError::Config(format!(
                "Agents directory not found: {}",
                self.agents_dir.display()
            )));
        }

        Ok(())
    }
}
```

---

## Application State

### `src/state/app_state.rs`

```rust
use std::sync::Arc;
use parking_lot::RwLock;
use dashmap::DashMap;
use std::num::NonZeroU32;

use crate::types::{AppConfig, AppError, AppResult};
use crate::core::{
    anthropic::AnthropicClient,
    agents::AgentRegistry,
    database::DatabasePool,
};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db: DatabasePool,
    pub anthropic: Arc<AnthropicClient>,
    pub agents: Arc<AgentRegistry>,
    pub streams: Arc<DashMap<String, StreamHandle>>,
    pub sessions: Arc<RwLock<SessionCache>>,
    pub cache: Arc<QueryCache>,
    pub rate_limiter: Arc<governor::RateLimiter<
        governor::state::direct::NotKeyed,
        governor::state::InMemoryState,
        governor::clock::DefaultClock,
    >>,
    pub metrics: Arc<MetricsCollector>,
}

impl AppState {
    pub async fn new() -> AppResult<Self> {
        // Load configuration
        let config = Arc::new(AppConfig::load()?);

        // Note: We skip validation here to allow app to start
        // User will be prompted to set API key in settings

        tracing::info!("Initializing database at: {}", config.database_url);
        let db = DatabasePool::new(&config.database_url).await?;
        db.run_migrations().await?;
        tracing::info!("Database initialized successfully");

        // Initialize Anthropic client
        let anthropic = Arc::new(
            AnthropicClient::new(&config.anthropic_api_key)
        );

        // Load agents
        tracing::info!("Loading agents from: {}", config.agents_dir.display());
        let agents = Arc::new(
            AgentRegistry::load_from_directory(&config.agents_dir).await?
        );
        tracing::info!("Loaded {} agents", agents.count());

        // Create rate limiter
        let rate_limiter = Arc::new(
            governor::RateLimiter::direct(
                governor::Quota::per_minute(
                    NonZeroU32::new(config.rate_limit).unwrap()
                )
            )
        );

        Ok(Self {
            config,
            db,
            anthropic,
            agents,
            streams: Arc::new(DashMap::new()),
            sessions: Arc::new(RwLock::new(SessionCache::new())),
            cache: Arc::new(QueryCache::new(1000)),
            rate_limiter,
            metrics: Arc::new(MetricsCollector::new()),
        })
    }

    pub async fn health_check(&self) -> AppResult<HealthStatus> {
        // Check database
        self.db.health_check().await?;

        // Check agent registry
        let agent_count = self.agents.count();

        Ok(HealthStatus {
            database: "healthy".to_string(),
            agents_loaded: agent_count,
            active_streams: self.streams.len(),
            uptime: self.metrics.uptime(),
        })
    }

    pub fn update_api_key(&mut self, api_key: String) {
        // Update in-memory config
        Arc::make_mut(&mut self.config).anthropic_api_key = api_key.clone();

        // Update client
        self.anthropic = Arc::new(AnthropicClient::new(api_key));
    }
}

pub struct StreamHandle {
    pub session_id: String,
    pub tx: tokio::sync::mpsc::UnboundedSender<crate::core::anthropic::StreamChunk>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct HealthStatus {
    pub database: String,
    pub agents_loaded: usize,
    pub active_streams: usize,
    pub uptime: std::time::Duration,
}

// Re-exports
pub use super::session::SessionCache;
pub use super::cache::QueryCache;
pub use super::metrics::MetricsCollector;
```

### `src/state/mod.rs`

```rust
pub mod app_state;
pub mod session;
pub mod cache;
pub mod metrics;

pub use app_state::{AppState, StreamHandle, HealthStatus};
pub use session::SessionCache;
pub use cache::QueryCache;
pub use metrics::{MetricsCollector, MetricsSnapshot};
```

---

## Anthropic Client

### `src/core/anthropic/client.rs`

```rust
use reqwest::{Client, header};
use tokio::sync::mpsc;
use futures::StreamExt;
use tracing::{debug, error, info, instrument};
use std::time::Duration;

use super::models::*;
use crate::types::AppError;

pub struct AnthropicClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AnthropicClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        let client = Client::builder()
            .http2_prior_knowledge()
            .timeout(Duration::from_secs(120))
            .pool_max_idle_per_host(10)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_key: api_key.into(),
            base_url: "https://api.anthropic.com/v1".to_string(),
        }
    }

    #[instrument(skip(self, request))]
    pub async fn stream_messages(
        &self,
        request: MessageRequest,
    ) -> Result<mpsc::UnboundedReceiver<StreamChunk>, AppError> {
        let url = format!("{}/messages", self.base_url);

        // Create channel
        let (tx, rx) = mpsc::unbounded_channel();

        // Build request body
        let mut req_body = serde_json::to_value(&request)?;
        req_body["stream"] = serde_json::json!(true);

        // Send request
        let response = self.client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header(header::CONTENT_TYPE, "application/json")
            .json(&req_body)
            .send()
            .await
            .map_err(|e| AppError::Anthropic(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!("API request failed: {} - {}", status, body);
            return Err(AppError::Anthropic(format!(
                "API error {}: {}",
                status, body
            )));
        }

        // Spawn stream processing task
        tokio::spawn(async move {
            let mut stream = response.bytes_stream();
            let mut buffer = Vec::new();

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(bytes) => {
                        buffer.extend_from_slice(&bytes);

                        // Process complete events
                        while let Some(pos) = buffer.windows(2).position(|w| w == b"\n\n") {
                            let event_data = buffer.drain(..=pos+1).collect::<Vec<_>>();
                            let event_str = String::from_utf8_lossy(&event_data);

                            if let Some(data) = Self::parse_sse_event(&event_str) {
                                if data == "[DONE]" {
                                    debug!("Stream completed");
                                    break;
                                }

                                match serde_json::from_str::<StreamChunk>(&data) {
                                    Ok(chunk) => {
                                        if tx.send(chunk).is_err() {
                                            debug!("Receiver dropped");
                                            return;
                                        }
                                    }
                                    Err(e) => {
                                        error!("Failed to parse chunk: {}", e);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Stream error: {}", e);
                        let _ = tx.send(StreamChunk::Error {
                            error: e.to_string(),
                        });
                        return;
                    }
                }
            }
        });

        Ok(rx)
    }

    fn parse_sse_event(event: &str) -> Option<String> {
        for line in event.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                return Some(data.to_string());
            }
        }
        None
    }

    pub async fn validate_key(&self) -> Result<bool, AppError> {
        let request = MessageRequest {
            model: "claude-3-haiku-20240307".to_string(),
            max_tokens: 1,
            messages: vec![Message {
                role: "user".to_string(),
                content: MessageContent::Text("test".to_string()),
            }],
            system: None,
            temperature: None,
            stream: Some(false),
        };

        let url = format!("{}/messages", self.base_url);
        let response = self.client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&request)
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}
```

### `src/core/anthropic/models.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRequest {
    pub model: String,
    pub max_tokens: u32,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: MessageContent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Blocks(Vec<ContentBlock>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamChunk {
    #[serde(rename = "message_start")]
    MessageStart { message: MessageMetadata },

    #[serde(rename = "content_block_start")]
    ContentBlockStart {
        index: usize,
        content_block: ContentBlock,
    },

    #[serde(rename = "content_block_delta")]
    ContentBlockDelta {
        index: usize,
        delta: ContentDelta,
    },

    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: usize },

    #[serde(rename = "message_delta")]
    MessageDelta { delta: MessageDeltaInfo },

    #[serde(rename = "message_stop")]
    MessageStop,

    #[serde(rename = "ping")]
    Ping,

    Error { error: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub id: String,
    pub model: String,
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentDelta {
    #[serde(rename = "type")]
    pub delta_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageDeltaInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}
```

---

## Agent System

### `src/core/agents/registry.rs`

```rust
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::fs;
use tracing::{debug, info, warn};

use super::parser::{AgentParser, AgentDefinition};
use crate::types::AppError;

pub struct AgentRegistry {
    agents: Arc<RwLock<HashMap<String, AgentDefinition>>>,
    agents_by_category: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl AgentRegistry {
    pub async fn load_from_directory(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let path = path.as_ref();
        info!("Loading agents from: {}", path.display());

        let mut agents = HashMap::new();
        let mut agents_by_category = HashMap::new();

        // Read directory
        let mut entries = fs::read_dir(path)
            .await
            .map_err(|e| AppError::Agent(format!("Failed to read agents directory: {}", e)))?;

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| AppError::Agent(e.to_string()))?
        {
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                match AgentParser::parse_file(&path).await {
                    Ok(agent) => {
                        debug!("Loaded agent: {} ({})", agent.name, agent.category);

                        agents_by_category
                            .entry(agent.category.clone())
                            .or_insert_with(Vec::new)
                            .push(agent.name.clone());

                        agents.insert(agent.name.clone(), agent);
                    }
                    Err(e) => {
                        warn!("Failed to load agent from {:?}: {}", path, e);
                    }
                }
            }
        }

        info!("Loaded {} agents across {} categories",
              agents.len(),
              agents_by_category.len());

        Ok(Self {
            agents: Arc::new(RwLock::new(agents)),
            agents_by_category: Arc::new(RwLock::new(agents_by_category)),
        })
    }

    pub fn get(&self, name: &str) -> Option<AgentDefinition> {
        self.agents.read().get(name).cloned()
    }

    pub fn list(&self) -> Vec<AgentDefinition> {
        self.agents.read().values().cloned().collect()
    }

    pub fn search(&self, query: &str) -> Vec<AgentDefinition> {
        let query_lower = query.to_lowercase();

        self.agents.read()
            .values()
            .filter(|agent| {
                agent.name.to_lowercase().contains(&query_lower) ||
                agent.description.to_lowercase().contains(&query_lower) ||
                agent.capabilities.iter().any(|cap|
                    cap.to_lowercase().contains(&query_lower)
                )
            })
            .cloned()
            .collect()
    }

    pub fn count(&self) -> usize {
        self.agents.read().len()
    }
}
```

---

## Database Layer

### `src/core/database/pool.rs`

```rust
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::ConnectOptions;
use std::sync::Arc;
use std::time::Duration;
use tracing::log::LevelFilter;

use crate::types::{AppError, AppResult};

#[derive(Clone)]
pub struct DatabasePool {
    pool: Arc<SqlitePool>,
}

impl DatabasePool {
    pub async fn new(database_url: &str) -> AppResult<Self> {
        // Ensure parent directory exists
        if let Some(parent) = std::path::Path::new(database_url).parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let connect_options = SqliteConnectOptions::new()
            .filename(database_url)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(Duration::from_secs(30))
            .pragma("cache_size", "-64000")
            .pragma("temp_store", "MEMORY")
            .pragma("mmap_size", "268435456")
            .pragma("page_size", "4096")
            .pragma("foreign_keys", "ON")
            .log_statements(LevelFilter::Debug);

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .min_connections(2)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect_with(connect_options)
            .await?;

        Ok(Self {
            pool: Arc::new(pool),
        })
    }

    pub fn inner(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn run_migrations(&self) -> AppResult<()> {
        sqlx::migrate!("./migrations")
            .run(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn health_check(&self) -> AppResult<()> {
        sqlx::query("SELECT 1")
            .fetch_one(&*self.pool)
            .await?;
        Ok(())
    }
}
```

---

## Tauri Commands

### `src/commands/stream.rs`

```rust
use tauri::{Manager, State, Window};
use tracing::{debug, error, info, instrument};

use crate::state::AppState;
use crate::core::anthropic::{MessageRequest, Message, MessageContent};

#[derive(Debug, serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
#[instrument(skip(state, window))]
pub async fn stream_ai_response(
    state: State<'_, AppState>,
    window: Window,
    session_id: String,
    messages: Vec<ChatMessage>,
    model: String,
    system_prompt: Option<String>,
) -> Result<(), String> {
    info!("Starting stream: {}", session_id);

    // Rate limit check
    if state.rate_limiter.check().is_err() {
        return Err("Rate limit exceeded".into());
    }

    // Convert messages
    let anthropic_messages: Vec<Message> = messages
        .into_iter()
        .map(|msg| Message {
            role: msg.role,
            content: MessageContent::Text(msg.content),
        })
        .collect();

    // Build request
    let request = MessageRequest {
        model,
        max_tokens: 4096,
        messages: anthropic_messages,
        system: system_prompt,
        temperature: Some(0.7),
        stream: Some(true),
    };

    // Start streaming
    let mut rx = state.anthropic
        .stream_messages(request)
        .await
        .map_err(|e| e.to_string())?;

    // Process stream
    let window_clone = window.clone();
    let session_id_clone = session_id.clone();

    tokio::spawn(async move {
        let mut accumulated = String::new();

        while let Some(chunk) = rx.recv().await {
            match chunk {
                crate::core::anthropic::StreamChunk::ContentBlockDelta { delta, .. } => {
                    if let Some(text) = delta.text {
                        accumulated.push_str(&text);

                        let _ = window_clone.emit("stream_token", serde_json::json!({
                            "sessionId": session_id_clone,
                            "text": text,
                            "accumulated": accumulated.clone(),
                        }));
                    }
                }
                crate::core::anthropic::StreamChunk::MessageStop => {
                    let _ = window_clone.emit("stream_complete", serde_json::json!({
                        "sessionId": session_id_clone,
                        "fullMessage": accumulated,
                    }));
                    break;
                }
                crate::core::anthropic::StreamChunk::Error { error } => {
                    error!("Stream error: {}", error);
                    let _ = window_clone.emit("stream_error", serde_json::json!({
                        "sessionId": session_id_clone,
                        "error": error,
                    }));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_stream(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    state.streams.remove(&session_id);
    info!("Stopped stream: {}", session_id);
    Ok(())
}
```

---

## Testing Templates

### Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_example() {
        assert_eq!(2 + 2, 4);
    }

    #[tokio::test]
    async fn test_async_example() {
        let result = async_function().await;
        assert!(result.is_ok());
    }
}
```

### Integration Test Template

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;
    use serial_test::serial;
    use tempfile::TempDir;

    #[tokio::test]
    #[serial]
    async fn test_full_workflow() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");

        // Initialize state
        let state = AppState::new_with_db(db_path.to_str().unwrap())
            .await
            .unwrap();

        // Test workflow
        // ...
    }
}
```

---

## Quick Commands Reference

```bash
# Build
cargo build

# Run
cargo run

# Test
cargo test

# Test with output
cargo test -- --nocapture

# Check
cargo check

# Lint
cargo clippy

# Format
cargo fmt

# Run specific test
cargo test test_name

# Run with logging
RUST_LOG=debug cargo run
```

---

**End of Code Templates**

All templates are ready for immediate use in the native macOS implementation.
