# Phase 1: Native macOS Migration - 12 Week Implementation Plan
## Vibing2 Complete Transformation to Native Desktop Application

**Document Version:** 1.0
**Created:** 2025-10-13
**Status:** READY FOR EXECUTION
**Estimated Timeline:** 12 weeks (480 hours)
**Team Size:** 2-3 engineers
**Budget:** ~$127,000 (fully loaded costs)

---

## Executive Summary

This document provides a comprehensive, week-by-week implementation plan to transform Vibing2 from a Next.js web application into a high-performance native macOS desktop application using **Rust (backend) + Tauri 2.0 + React (UI)**. The plan is based on extensive architectural analysis and is ready for immediate execution.

### Key Objectives
1. **Week 1-3:** Core Infrastructure (Rust backend, API client, agent system)
2. **Week 4-6:** AI Streaming & State Management
3. **Week 7-9:** Database Migration & Native UI Integration
4. **Week 10-12:** Advanced Features, Testing & Release

### Success Metrics
- ✅ **Startup Time:** <1 second (from 2.5s)
- ✅ **Memory Usage:** <150MB (from 300MB)
- ✅ **Database Queries:** <5ms (from 45-80ms, 15-20x faster)
- ✅ **AI Streaming:** <100ms latency (from 200ms)
- ✅ **Binary Size:** <20MB
- ✅ **100% Feature Parity** with web application

---

## Table of Contents

1. [Week 1: Core Rust Infrastructure](#week-1-core-rust-infrastructure)
2. [Week 2: Anthropic API & Streaming](#week-2-anthropic-api--streaming)
3. [Week 3: Agent System Migration](#week-3-agent-system-migration)
4. [Week 4: Database Architecture](#week-4-database-architecture)
5. [Week 5: State Management & Caching](#week-5-state-management--caching)
6. [Week 6: Project CRUD Operations](#week-6-project-crud-operations)
7. [Week 7: Native UI Foundation](#week-7-native-ui-foundation)
8. [Week 8: Menu Bar & Keyboard Shortcuts](#week-8-menu-bar--keyboard-shortcuts)
9. [Week 9: File Operations & Settings](#week-9-file-operations--settings)
10. [Week 10: Performance Optimization](#week-10-performance-optimization)
11. [Week 11: Testing & Quality Assurance](#week-11-testing--quality-assurance)
12. [Week 12: Beta Release & Polish](#week-12-beta-release--polish)
13. [Deliverables Checklist](#deliverables-checklist)
14. [Risk Management](#risk-management)
15. [Migration Scripts & Tools](#migration-scripts--tools)

---

## Week 1: Core Rust Infrastructure

**Goal:** Establish Rust backend foundation with essential modules and dependencies

### Daily Breakdown

#### Day 1: Project Setup & Dependencies (8 hours)
**Tasks:**
- [ ] Update `Cargo.toml` with all dependencies (see Appendix A)
- [ ] Configure Tauri 2.0 build settings
- [ ] Set up logging infrastructure (tracing + tracing-subscriber)
- [ ] Create module structure (`core/`, `commands/`, `state/`, `utils/`)
- [ ] Configure release profile for optimizations

**Files to Create:**
```
src-tauri/
├── Cargo.toml (UPDATE)
├── src/
│   ├── lib.rs (NEW)
│   ├── main.rs (UPDATE)
│   ├── core/mod.rs (NEW)
│   ├── commands/mod.rs (NEW)
│   ├── state/mod.rs (NEW)
│   ├── utils/mod.rs (NEW)
│   └── types/mod.rs (NEW)
```

**Deliverables:**
- ✅ All dependencies compile successfully
- ✅ Basic logging working (`RUST_LOG=debug cargo run`)
- ✅ Module structure created

**Code Template:**
```rust
// src/lib.rs
pub mod core;
pub mod commands;
pub mod state;
pub mod utils;
pub mod types;

// Re-export common types
pub use types::{AppError, AppResult};
pub use state::AppState;
```

---

#### Day 2: Error Handling Framework (8 hours)
**Tasks:**
- [ ] Create comprehensive error types using `thiserror`
- [ ] Implement error conversion traits
- [ ] Add error logging and telemetry
- [ ] Create helper macros for error handling
- [ ] Write error handling tests

**Files to Create:**
```
src/types/
├── mod.rs
├── error.rs (NEW)
└── result.rs (NEW)
```

**Code Template:**
```rust
// src/types/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Anthropic API error: {0}")]
    Anthropic(String),

    #[error("Agent not found: {0}")]
    AgentNotFound(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Stream error: {0}")]
    Stream(String),
}

pub type AppResult<T> = Result<T, AppError>;

// Convert to Tauri error
impl From<AppError> for tauri::Error {
    fn from(err: AppError) -> Self {
        tauri::Error::Command(err.to_string())
    }
}
```

**Deliverables:**
- ✅ All error types defined
- ✅ Error conversion working
- ✅ Unit tests passing

---

#### Day 3: Configuration Management (8 hours)
**Tasks:**
- [ ] Create configuration struct with environment variables
- [ ] Implement config validation
- [ ] Add Keychain integration for API keys
- [ ] Create config file loader (.env support)
- [ ] Write configuration tests

**Files to Create:**
```
src/types/
└── config.rs (NEW)
src/utils/
├── mod.rs (UPDATE)
└── keychain.rs (NEW)
```

**Code Template:**
```rust
// src/types/config.rs
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
        // Load from environment + Keychain
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| {
                let app_dir = dirs::data_dir()
                    .expect("Failed to get data directory");
                format!("{}/vibing2/vibing2.db", app_dir.display())
            });

        let anthropic_api_key = crate::utils::keychain::get_api_key()?;

        let agents_dir = std::env::var("AGENTS_DIR")
            .unwrap_or_else(|_| ".claude/agents/agents".to_string())
            .into();

        Ok(Self {
            database_url,
            anthropic_api_key,
            agents_dir,
            cache_size: 1000,
            rate_limit: 60,
            log_level: "info".to_string(),
        })
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if self.anthropic_api_key.is_empty() {
            return Err(AppError::Config("Missing Anthropic API key".into()));
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

**Deliverables:**
- ✅ Configuration loading from env + Keychain
- ✅ Validation working
- ✅ Tests passing

---

#### Day 4-5: Core State Management (16 hours)
**Tasks:**
- [ ] Implement global AppState with Arc/RwLock
- [ ] Create session cache (DashMap)
- [ ] Add stream handle management
- [ ] Implement rate limiter (governor crate)
- [ ] Create metrics collector
- [ ] Write state management tests

**Files to Create:**
```
src/state/
├── mod.rs (UPDATE)
├── app_state.rs (NEW)
├── session.rs (NEW)
├── cache.rs (NEW)
└── metrics.rs (NEW)
```

**Code Template:**
```rust
// src/state/app_state.rs
use std::sync::Arc;
use parking_lot::RwLock;
use dashmap::DashMap;
use tokio::sync::mpsc;

#[derive(Clone)]
pub struct AppState {
    /// Configuration
    pub config: Arc<AppConfig>,

    /// Database connection pool
    pub db: DatabasePool,

    /// Anthropic API client
    pub anthropic: Arc<AnthropicClient>,

    /// Agent registry
    pub agents: Arc<AgentRegistry>,

    /// Active streaming sessions
    pub streams: Arc<DashMap<String, StreamHandle>>,

    /// User sessions cache
    pub sessions: Arc<RwLock<SessionCache>>,

    /// Query result cache
    pub cache: Arc<QueryCache>,

    /// Rate limiter
    pub rate_limiter: Arc<governor::RateLimiter<
        governor::state::direct::NotKeyed,
        governor::state::InMemoryState,
        governor::clock::DefaultClock,
    >>,

    /// Metrics collector
    pub metrics: Arc<MetricsCollector>,
}

impl AppState {
    pub async fn new() -> Result<Self, AppError> {
        // Load configuration
        let config = Arc::new(AppConfig::load()?);
        config.validate()?;

        // Initialize database
        let db = DatabasePool::new(&config.database_url).await?;
        db.run_migrations().await?;

        // Initialize Anthropic client
        let anthropic = Arc::new(
            AnthropicClient::new(&config.anthropic_api_key)
        );

        // Load agents
        let agents = Arc::new(
            AgentRegistry::load_from_directory(&config.agents_dir).await?
        );

        // Create rate limiter (60 requests per minute)
        let rate_limiter = Arc::new(
            governor::RateLimiter::direct(
                governor::Quota::per_minute(
                    std::num::NonZeroU32::new(config.rate_limit).unwrap()
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

    pub async fn health_check(&self) -> Result<HealthStatus, AppError> {
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
}

pub struct StreamHandle {
    pub session_id: String,
    pub tx: mpsc::UnboundedSender<StreamEvent>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct HealthStatus {
    pub database: String,
    pub agents_loaded: usize,
    pub active_streams: usize,
    pub uptime: std::time::Duration,
}
```

**Deliverables:**
- ✅ AppState initialized successfully
- ✅ All components accessible
- ✅ Health check working
- ✅ Tests passing

---

### Week 1 Deliverables Summary

**Completed:**
- ✅ Complete Rust project structure
- ✅ All dependencies configured and compiling
- ✅ Comprehensive error handling framework
- ✅ Configuration management with Keychain
- ✅ Global application state
- ✅ Logging and telemetry setup

**Metrics:**
- Lines of Code: ~800
- Test Coverage: 60%+
- Build Time: <2 minutes
- Documentation: All modules documented

**Testing:**
```bash
# Run all tests
cargo test

# Run with logging
RUST_LOG=debug cargo test -- --nocapture

# Check compilation
cargo check --all-features

# Lint
cargo clippy -- -D warnings
```

---

## Week 2: Anthropic API & Streaming

**Goal:** Implement production-ready Anthropic API client with SSE streaming support

### Daily Breakdown

#### Day 1: HTTP Client Setup (8 hours)
**Tasks:**
- [ ] Create base HTTP client with reqwest
- [ ] Configure HTTP/2 support
- [ ] Implement retry logic with exponential backoff
- [ ] Add request/response logging
- [ ] Create API key validation endpoint

**Files to Create:**
```
src/core/anthropic/
├── mod.rs (NEW)
├── client.rs (NEW)
├── models.rs (NEW)
└── error.rs (NEW)
```

**Code Template:**
```rust
// src/core/anthropic/client.rs
use reqwest::{Client, header};
use std::time::Duration;

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

    pub async fn validate_key(&self) -> Result<bool, AnthropicError> {
        let url = format!("{}/messages", self.base_url);

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

        let response = self.client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header(header::CONTENT_TYPE, "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AnthropicError::RequestFailed(e.to_string()))?;

        Ok(response.status().is_success())
    }
}
```

**Deliverables:**
- ✅ HTTP client configured
- ✅ API key validation working
- ✅ Error handling implemented

---

#### Day 2-3: SSE Streaming Implementation (16 hours)
**Tasks:**
- [ ] Implement SSE parser using `eventsource-stream`
- [ ] Create stream chunk types
- [ ] Handle partial data and buffering
- [ ] Implement stream error recovery
- [ ] Add stream cancellation support

**Code Template:**
```rust
// src/core/anthropic/streaming.rs
use futures::StreamExt;
use tokio::sync::mpsc;
use bytes::Bytes;

impl AnthropicClient {
    #[instrument(skip(self, request))]
    pub async fn stream_messages(
        &self,
        request: MessageRequest,
    ) -> Result<mpsc::UnboundedReceiver<StreamChunk>, AnthropicError> {
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
            .map_err(|e| AnthropicError::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!("API request failed: {} - {}", status, body);
            return Err(AnthropicError::ApiError {
                status: status.as_u16(),
                message: body,
            });
        }

        // Spawn stream processing task
        tokio::spawn(async move {
            let mut stream = response.bytes_stream();
            let mut buffer = Vec::new();

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(bytes) => {
                        buffer.extend_from_slice(&bytes);

                        // Process complete events (delimited by \n\n)
                        while let Some(pos) = buffer.windows(2).position(|w| w == b"\n\n") {
                            let event_data = buffer.drain(..=pos+1).collect::<Vec<_>>();
                            let event_str = String::from_utf8_lossy(&event_data);

                            // Parse SSE event
                            if let Some(data) = Self::parse_sse_event(&event_str) {
                                if data == "[DONE]" {
                                    debug!("Stream completed with [DONE]");
                                    break;
                                }

                                match serde_json::from_str::<StreamChunk>(&data) {
                                    Ok(chunk) => {
                                        if tx.send(chunk).is_err() {
                                            debug!("Receiver dropped, stopping stream");
                                            return;
                                        }
                                    }
                                    Err(e) => {
                                        error!("Failed to parse chunk: {} - data: {}", e, data);
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

            debug!("Stream processing completed");
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
}
```

**Deliverables:**
- ✅ SSE streaming working end-to-end
- ✅ Buffering and partial data handling
- ✅ Stream cancellation support
- ✅ Integration tests passing

---

#### Day 4: Stream Chunk Types (8 hours)
**Tasks:**
- [ ] Define all StreamChunk variants
- [ ] Implement serialization/deserialization
- [ ] Add chunk validation
- [ ] Create helper functions for chunk processing

**Code Template:**
```rust
// src/core/anthropic/models.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamChunk {
    #[serde(rename = "message_start")]
    MessageStart {
        message: MessageMetadata,
    },

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
    ContentBlockStop {
        index: usize,
    },

    #[serde(rename = "message_delta")]
    MessageDelta {
        delta: MessageDeltaInfo,
    },

    #[serde(rename = "message_stop")]
    MessageStop,

    #[serde(rename = "ping")]
    Ping,

    Error {
        error: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub id: String,
    pub model: String,
    pub role: String,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentDelta {
    #[serde(rename = "type")]
    pub delta_type: String,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageDeltaInfo {
    pub stop_reason: Option<String>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

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
```

**Deliverables:**
- ✅ All chunk types defined
- ✅ Serialization tests passing
- ✅ Documentation complete

---

#### Day 5: Tauri Command Integration (8 hours)
**Tasks:**
- [ ] Create `stream_ai_response` command
- [ ] Create `stop_stream` command
- [ ] Implement event emission to frontend
- [ ] Add session management
- [ ] Write integration tests

**Files to Create:**
```
src/commands/
├── mod.rs (UPDATE)
└── stream.rs (NEW)
```

**Code Template:**
```rust
// src/commands/stream.rs
use tauri::{Manager, State, Window};
use tokio::sync::mpsc;
use tracing::{debug, error, info, instrument};
use crate::{
    state::AppState,
    core::anthropic::{MessageRequest, Message, MessageContent},
    types::error::AppError,
};

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
    info!("Starting stream session: {}", session_id);

    // Rate limit check
    if state.rate_limiter.check().is_err() {
        return Err("Rate limit exceeded. Please try again in a moment.".into());
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

    // Create stream handle
    let (tx, _event_rx) = mpsc::unbounded_channel();
    state.streams.insert(session_id.clone(), crate::state::StreamHandle {
        session_id: session_id.clone(),
        tx,
        created_at: chrono::Utc::now(),
    });

    // Spawn stream processor
    let window_clone = window.clone();
    let session_id_clone = session_id.clone();
    let streams = state.streams.clone();
    let metrics = state.metrics.clone();

    tokio::spawn(async move {
        let mut accumulated_text = String::new();
        let start = std::time::Instant::now();

        while let Some(chunk) = rx.recv().await {
            match chunk {
                crate::core::anthropic::StreamChunk::ContentBlockDelta { delta, .. } => {
                    if let Some(text) = delta.text {
                        accumulated_text.push_str(&text);

                        // Emit token to frontend
                        if let Err(e) = window_clone.emit("stream_token", serde_json::json!({
                            "sessionId": session_id_clone,
                            "text": text,
                            "accumulated": accumulated_text.clone(),
                        })) {
                            error!("Failed to emit stream token: {}", e);
                            break;
                        }
                    }
                }
                crate::core::anthropic::StreamChunk::MessageStop => {
                    let duration = start.elapsed();
                    debug!("Stream completed for session: {} in {:?}", session_id_clone, duration);

                    // Record metrics
                    metrics.record_stream_completion(duration);

                    // Emit completion event
                    let _ = window_clone.emit("stream_complete", serde_json::json!({
                        "sessionId": session_id_clone,
                        "fullMessage": accumulated_text,
                        "duration": duration.as_millis(),
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
                _ => {
                    debug!("Received chunk: {:?}", chunk);
                }
            }
        }

        // Cleanup
        streams.remove(&session_id_clone);
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_stream(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    if let Some((_, handle)) = state.streams.remove(&session_id) {
        drop(handle); // Close channel
        info!("Stopped stream session: {}", session_id);
        Ok(())
    } else {
        Err(format!("Stream session not found: {}", session_id))
    }
}
```

**Deliverables:**
- ✅ Streaming commands working
- ✅ Event emission to frontend
- ✅ Session cleanup
- ✅ Integration tests

---

### Week 2 Deliverables Summary

**Completed:**
- ✅ Production-ready Anthropic API client
- ✅ SSE streaming with buffering and error recovery
- ✅ Complete stream chunk type system
- ✅ Tauri commands for streaming
- ✅ Frontend event integration

**Metrics:**
- Lines of Code: ~1,200
- Test Coverage: 70%+
- Stream Latency: <100ms
- First Token: <2 seconds

**Testing:**
```bash
# Test streaming
cargo test anthropic::tests

# Manual test
RUST_LOG=debug cargo run
```

---

## Week 3: Agent System Migration

**Goal:** Port 84 agent definitions and implement agent registry

### Daily Breakdown

#### Day 1-2: Agent Parser (16 hours)
**Tasks:**
- [ ] Create markdown frontmatter parser
- [ ] Extract agent metadata (YAML)
- [ ] Parse system prompts
- [ ] Validate agent definitions
- [ ] Handle malformed files gracefully

**Files to Create:**
```
src/core/agents/
├── mod.rs (NEW)
├── registry.rs (NEW)
├── parser.rs (NEW)
└── error.rs (NEW)
```

**Code Template:**
```rust
// src/core/agents/parser.rs
use std::path::Path;
use serde::{Deserialize, Serialize};
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub name: String,
    pub category: String,
    pub description: String,
    pub system_prompt: String,
    pub capabilities: Vec<String>,
    pub tools: Vec<String>,
    pub metadata: AgentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub version: String,
    pub author: Option<String>,
    pub tags: Vec<String>,
}

pub struct AgentParser;

impl AgentParser {
    pub async fn parse_file(path: impl AsRef<Path>) -> Result<AgentDefinition, AgentError> {
        let content = fs::read_to_string(path.as_ref())
            .await
            .map_err(|e| AgentError::ParseFailed(e.to_string()))?;

        Self::parse_content(&content)
    }

    pub fn parse_content(content: &str) -> Result<AgentDefinition, AgentError> {
        // Check for frontmatter
        if !content.starts_with("---\n") {
            return Err(AgentError::ParseFailed("Missing frontmatter".into()));
        }

        // Split frontmatter and content
        let parts: Vec<&str> = content.splitn(3, "---\n").collect();
        if parts.len() < 3 {
            return Err(AgentError::ParseFailed("Invalid frontmatter format".into()));
        }

        let yaml_content = parts[1];
        let markdown_content = parts[2].trim();

        // Parse YAML frontmatter
        let metadata: serde_yaml::Value = serde_yaml::from_str(yaml_content)
            .map_err(|e| AgentError::ParseFailed(format!("Invalid YAML: {}", e)))?;

        // Extract fields
        let name = metadata.get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AgentError::ParseFailed("Missing 'name' field".into()))?
            .to_string();

        let category = metadata.get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("general")
            .to_string();

        let description = metadata.get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let capabilities = metadata.get("capabilities")
            .and_then(|v| v.as_sequence())
            .map(|seq| {
                seq.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        let tools = metadata.get("tools")
            .and_then(|v| v.as_sequence())
            .map(|seq| {
                seq.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        Ok(AgentDefinition {
            name,
            category,
            description,
            system_prompt: markdown_content.to_string(),
            capabilities,
            tools,
            metadata: AgentMetadata {
                version: metadata.get("version")
                    .and_then(|v| v.as_str())
                    .unwrap_or("1.0.0")
                    .to_string(),
                author: metadata.get("author")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                tags: metadata.get("tags")
                    .and_then(|v| v.as_sequence())
                    .map(|seq| {
                        seq.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default(),
            },
        })
    }
}
```

**Deliverables:**
- ✅ Parser handles all agent formats
- ✅ Validation working
- ✅ Tests for various agent files

---

#### Day 3-4: Agent Registry (16 hours)
**Tasks:**
- [ ] Implement agent registry with HashMap
- [ ] Add category indexing
- [ ] Create search functionality
- [ ] Implement agent filtering
- [ ] Add hot-reload support

**Code Template:**
```rust
// src/core/agents/registry.rs
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::fs;

pub struct AgentRegistry {
    agents: Arc<RwLock<HashMap<String, AgentDefinition>>>,
    agents_by_category: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl AgentRegistry {
    pub async fn load_from_directory(path: impl AsRef<Path>) -> Result<Self, AgentError> {
        let path = path.as_ref();
        info!("Loading agents from: {}", path.display());

        let mut agents = HashMap::new();
        let mut agents_by_category = HashMap::new();

        // Read directory recursively
        let mut entries = fs::read_dir(path)
            .await
            .map_err(|e| AgentError::LoadFailed(e.to_string()))?;

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| AgentError::LoadFailed(e.to_string()))?
        {
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                match AgentParser::parse_file(&path).await {
                    Ok(agent) => {
                        debug!("Loaded agent: {} ({})", agent.name, agent.category);

                        // Add to category index
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

    pub fn list_by_category(&self, category: &str) -> Vec<AgentDefinition> {
        let agents = self.agents.read();
        let by_category = self.agents_by_category.read();

        by_category
            .get(category)
            .map(|names| {
                names.iter()
                    .filter_map(|name| agents.get(name).cloned())
                    .collect()
            })
            .unwrap_or_default()
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

    pub fn categories(&self) -> Vec<String> {
        self.agents_by_category.read().keys().cloned().collect()
    }
}
```

**Deliverables:**
- ✅ Registry loads all 84 agents
- ✅ Search working
- ✅ Category filtering
- ✅ Performance benchmarks (<10ms search)

---

#### Day 5: Agent Commands (8 hours)
**Tasks:**
- [ ] Create `list_agents` command
- [ ] Create `get_agent` command
- [ ] Create `search_agents` command
- [ ] Create `auto_select_agent` command
- [ ] Write integration tests

**Files to Create:**
```
src/commands/
└── agent.rs (NEW)
```

**Code Template:**
```rust
// src/commands/agent.rs
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn list_agents(
    state: State<'_, AppState>,
) -> Result<Vec<crate::core::agents::AgentDefinition>, String> {
    Ok(state.agents.list())
}

#[tauri::command]
pub async fn get_agent(
    state: State<'_, AppState>,
    agent_name: String,
) -> Result<crate::core::agents::AgentDefinition, String> {
    state.agents
        .get(&agent_name)
        .ok_or_else(|| format!("Agent not found: {}", agent_name))
}

#[tauri::command]
pub async fn search_agents(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<crate::core::agents::AgentDefinition>, String> {
    Ok(state.agents.search(&query))
}

#[tauri::command]
pub async fn auto_select_agent(
    state: State<'_, AppState>,
    prompt: String,
) -> Result<String, String> {
    // Simple keyword-based selection
    let prompt_lower = prompt.to_lowercase();

    let agent_name = if prompt_lower.contains("bug") || prompt_lower.contains("fix") {
        "debugging-specialist"
    } else if prompt_lower.contains("test") {
        "testing-expert"
    } else if prompt_lower.contains("optimize") {
        "performance-optimizer"
    } else if prompt_lower.contains("design") || prompt_lower.contains("ui") {
        "ui-ux-designer"
    } else if prompt_lower.contains("api") {
        "backend-api-developer"
    } else if prompt_lower.contains("database") {
        "database-architect"
    } else {
        "fullstack-developer"
    };

    // Verify agent exists
    if state.agents.get(agent_name).is_some() {
        Ok(agent_name.to_string())
    } else {
        Ok("fullstack-developer".to_string())
    }
}
```

**Deliverables:**
- ✅ All agent commands working
- ✅ Auto-selection logic
- ✅ Integration tests

---

### Week 3 Deliverables Summary

**Completed:**
- ✅ Complete agent parsing system
- ✅ Agent registry with 84 agents loaded
- ✅ Search and filtering
- ✅ Auto-selection logic
- ✅ Tauri commands for agent operations

**Metrics:**
- Agents Loaded: 84/84
- Load Time: <500ms
- Search Time: <10ms
- Test Coverage: 75%+

---

## Week 4: Database Architecture

**Goal:** Migrate from Prisma/PostgreSQL to optimized SQLite with connection pooling

### Daily Breakdown

#### Day 1-2: Schema Migration (16 hours)
**Tasks:**
- [ ] Convert Prisma schema to SQLite migrations
- [ ] Optimize indexes for common queries
- [ ] Add full-text search indexes
- [ ] Create migration runner
- [ ] Test data migration

**Files to Create:**
```
src/core/database/
├── mod.rs (NEW)
├── pool.rs (NEW)
├── models.rs (NEW)
├── queries.rs (NEW)
└── migrations.rs (NEW)

migrations/
└── 001_initial.sql (NEW)
```

**Schema (SQLite):**
```sql
-- migrations/001_initial.sql

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified INTEGER,
    password TEXT NOT NULL,
    image TEXT,
    plan TEXT NOT NULL DEFAULT 'FREE',
    token_balance INTEGER NOT NULL DEFAULT 10000,
    context_used REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);

-- Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT NOT NULL,
    active_agents TEXT NOT NULL DEFAULT '[]',
    visibility TEXT NOT NULL DEFAULT 'PRIVATE',
    likes INTEGER NOT NULL DEFAULT 0,
    forks INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_visibility ON projects(visibility, updated_at);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);

-- Project files table
CREATE TABLE project_files (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, path)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_path ON project_files(project_id, path);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    project_id TEXT NOT NULL,
    tokens_used INTEGER,
    context_at_time REAL,
    pfc_saved INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_project ON messages(project_id, created_at);

-- Token usage table
CREATE TABLE token_usage (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    context_used REAL NOT NULL,
    saved_tokens INTEGER NOT NULL DEFAULT 0,
    endpoint TEXT NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_token_usage_user ON token_usage(user_id, timestamp);
CREATE INDEX idx_token_usage_endpoint ON token_usage(endpoint);

-- Sessions table
CREATE TABLE sessions (
    session_token TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    expires INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires);

-- Collaborators table
CREATE TABLE project_collaborators (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX idx_collaborators_user ON project_collaborators(user_id);

-- Full-text search index for projects
CREATE VIRTUAL TABLE projects_fts USING fts5(
    id UNINDEXED,
    name,
    description,
    content='projects',
    content_rowid='rowid'
);

-- Triggers to keep FTS index updated
CREATE TRIGGER projects_fts_insert AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, id, name, description)
    VALUES (new.rowid, new.id, new.name, new.description);
END;

CREATE TRIGGER projects_fts_update AFTER UPDATE ON projects BEGIN
    UPDATE projects_fts
    SET name = new.name, description = new.description
    WHERE rowid = new.rowid;
END;

CREATE TRIGGER projects_fts_delete AFTER DELETE ON projects BEGIN
    DELETE FROM projects_fts WHERE rowid = old.rowid;
END;
```

**Deliverables:**
- ✅ Complete SQLite schema
- ✅ Migration runner working
- ✅ Data migration tested

---

#### Day 3: Connection Pool (8 hours)
**Tasks:**
- [ ] Configure SQLite with WAL mode
- [ ] Set up connection pooling (2-10 connections)
- [ ] Add pragma optimizations
- [ ] Implement health checks
- [ ] Add connection metrics

**Code Template:**
```rust
// src/core/database/pool.rs
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::ConnectOptions;
use std::sync::Arc;
use std::time::Duration;
use tracing::log::LevelFilter;

#[derive(Clone)]
pub struct DatabasePool {
    pool: Arc<SqlitePool>,
}

impl DatabasePool {
    pub async fn new(database_url: &str) -> Result<Self, crate::types::AppError> {
        // Ensure parent directory exists
        if let Some(parent) = std::path::Path::new(database_url).parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let connect_options = SqliteConnectOptions::new()
            .filename(database_url)
            .create_if_missing(true)
            // Performance optimizations
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(Duration::from_secs(30))
            .pragma("cache_size", "-64000") // 64MB cache
            .pragma("temp_store", "MEMORY")
            .pragma("mmap_size", "268435456") // 256MB mmap
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

    pub async fn run_migrations(&self) -> Result<(), crate::types::AppError> {
        sqlx::migrate!("./migrations")
            .run(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn health_check(&self) -> Result<(), crate::types::AppError> {
        sqlx::query("SELECT 1")
            .fetch_one(&*self.pool)
            .await?;
        Ok(())
    }
}
```

**Deliverables:**
- ✅ Pool configured with optimizations
- ✅ Migrations working
- ✅ Health checks

---

#### Day 4-5: Query Layer (16 hours)
**Tasks:**
- [ ] Implement all CRUD operations
- [ ] Add transaction support
- [ ] Create query builders for complex queries
- [ ] Add batch operations
- [ ] Write query tests

**Files to Create:**
```
src/core/database/
└── queries.rs (NEW)
```

**Code Template:**
```rust
// src/core/database/queries.rs
use sqlx::SqlitePool;
use crate::core::database::models::*;

pub struct ProjectQueries;

impl ProjectQueries {
    pub async fn create(
        pool: &SqlitePool,
        project: CreateProjectInput,
    ) -> Result<Project, crate::types::AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        sqlx::query_as!(
            Project,
            r#"
            INSERT INTO projects (
                id, name, description, project_type, active_agents,
                visibility, user_id, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
            RETURNING *
            "#,
            id,
            project.name,
            project.description,
            project.project_type,
            project.active_agents,
            project.visibility,
            project.user_id,
            now,
        )
        .fetch_one(pool)
        .await
        .map_err(Into::into)
    }

    pub async fn find_by_id(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<Option<Project>, crate::types::AppError> {
        sqlx::query_as!(
            Project,
            r#"SELECT * FROM projects WHERE id = ?1"#,
            id
        )
        .fetch_optional(pool)
        .await
        .map_err(Into::into)
    }

    pub async fn find_by_user(
        pool: &SqlitePool,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Project>, crate::types::AppError> {
        sqlx::query_as!(
            Project,
            r#"
            SELECT * FROM projects
            WHERE user_id = ?1
            ORDER BY updated_at DESC
            LIMIT ?2 OFFSET ?3
            "#,
            user_id,
            limit,
            offset,
        )
        .fetch_all(pool)
        .await
        .map_err(Into::into)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        updates: UpdateProjectInput,
    ) -> Result<Project, crate::types::AppError> {
        let now = chrono::Utc::now().timestamp();

        sqlx::query_as!(
            Project,
            r#"
            UPDATE projects
            SET name = COALESCE(?2, name),
                description = COALESCE(?3, description),
                project_type = COALESCE(?4, project_type),
                active_agents = COALESCE(?5, active_agents),
                visibility = COALESCE(?6, visibility),
                updated_at = ?7
            WHERE id = ?1
            RETURNING *
            "#,
            id,
            updates.name,
            updates.description,
            updates.project_type,
            updates.active_agents,
            updates.visibility,
            now,
        )
        .fetch_one(pool)
        .await
        .map_err(Into::into)
    }

    pub async fn delete(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<(), crate::types::AppError> {
        sqlx::query!(
            r#"DELETE FROM projects WHERE id = ?1"#,
            id
        )
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn search(
        pool: &SqlitePool,
        query: &str,
        limit: i64,
    ) -> Result<Vec<Project>, crate::types::AppError> {
        sqlx::query_as!(
            Project,
            r#"
            SELECT p.* FROM projects p
            JOIN projects_fts fts ON p.id = fts.id
            WHERE projects_fts MATCH ?1
            ORDER BY rank
            LIMIT ?2
            "#,
            query,
            limit,
        )
        .fetch_all(pool)
        .await
        .map_err(Into::into)
    }
}

// Similar implementations for:
// - MessageQueries
// - ProjectFileQueries
// - UserQueries
// - TokenUsageQueries
```

**Deliverables:**
- ✅ All CRUD operations
- ✅ Transaction support
- ✅ Search working
- ✅ Query tests passing

---

### Week 4 Deliverables Summary

**Completed:**
- ✅ Complete SQLite migration
- ✅ Optimized connection pool
- ✅ Full query layer
- ✅ Transaction support
- ✅ Full-text search

**Metrics:**
- Query Performance: <5ms simple, <50ms complex
- Connection Pool: 2-10 connections
- Database Size: ~30% smaller than PostgreSQL
- Test Coverage: 80%+

---

## Week 5: State Management & Caching

**Goal:** Implement efficient caching and state synchronization

### Daily Breakdown

#### Day 1-2: Query Cache (16 hours)
**Tasks:**
- [ ] Implement LRU cache with `lru` crate
- [ ] Add cache key generation
- [ ] Implement TTL support
- [ ] Add cache invalidation strategies
- [ ] Measure cache hit rates

**Files to Create:**
```
src/state/
└── cache.rs (NEW)
```

**Code Template:**
```rust
// src/state/cache.rs
use lru::LruCache;
use parking_lot::Mutex;
use std::sync::Arc;
use std::time::{Duration, Instant};

pub struct QueryCache {
    cache: Arc<Mutex<LruCache<String, CachedEntry>>>,
}

struct CachedEntry {
    data: serde_json::Value,
    cached_at: Instant,
    ttl: Duration,
}

impl QueryCache {
    pub fn new(capacity: usize) -> Self {
        Self {
            cache: Arc::new(Mutex::new(LruCache::new(
                std::num::NonZeroUsize::new(capacity).unwrap()
            ))),
        }
    }

    pub fn get(&self, key: &str) -> Option<serde_json::Value> {
        let mut cache = self.cache.lock();

        if let Some(entry) = cache.get(key) {
            // Check TTL
            if entry.cached_at.elapsed() < entry.ttl {
                return Some(entry.data.clone());
            } else {
                // Expired
                cache.pop(key);
            }
        }

        None
    }

    pub fn insert(&self, key: String, data: serde_json::Value, ttl: Duration) {
        let entry = CachedEntry {
            data,
            cached_at: Instant::now(),
            ttl,
        };

        self.cache.lock().put(key, entry);
    }

    pub fn invalidate(&self, key: &str) {
        self.cache.lock().pop(key);
    }

    pub fn invalidate_prefix(&self, prefix: &str) {
        let mut cache = self.cache.lock();
        let keys_to_remove: Vec<String> = cache
            .iter()
            .filter_map(|(k, _)| {
                if k.starts_with(prefix) {
                    Some(k.clone())
                } else {
                    None
                }
            })
            .collect();

        for key in keys_to_remove {
            cache.pop(&key);
        }
    }

    pub fn clear(&self) {
        self.cache.lock().clear();
    }

    pub fn stats(&self) -> CacheStats {
        let cache = self.cache.lock();
        CacheStats {
            size: cache.len(),
            capacity: cache.cap().get(),
        }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct CacheStats {
    pub size: usize,
    pub capacity: usize,
}
```

**Deliverables:**
- ✅ LRU cache working
- ✅ TTL support
- ✅ Invalidation strategies
- ✅ Performance tests

---

#### Day 3: Session Management (8 hours)
**Tasks:**
- [ ] Implement session cache
- [ ] Add session validation
- [ ] Create session cleanup
- [ ] Add session metrics

**Code Template:**
```rust
// src/state/session.rs
use std::collections::HashMap;
use std::time::{Duration, Instant};

pub struct SessionCache {
    sessions: HashMap<String, SessionEntry>,
    max_age: Duration,
}

struct SessionEntry {
    user_id: String,
    created_at: Instant,
    last_accessed: Instant,
    data: serde_json::Value,
}

impl SessionCache {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            max_age: Duration::from_secs(3600), // 1 hour
        }
    }

    pub fn create_session(&mut self, session_id: String, user_id: String) {
        let now = Instant::now();
        self.sessions.insert(session_id, SessionEntry {
            user_id,
            created_at: now,
            last_accessed: now,
            data: serde_json::json!({}),
        });
    }

    pub fn get_session(&mut self, session_id: &str) -> Option<&str> {
        if let Some(entry) = self.sessions.get_mut(session_id) {
            // Check expiration
            if entry.last_accessed.elapsed() < self.max_age {
                entry.last_accessed = Instant::now();
                return Some(&entry.user_id);
            } else {
                // Expired
                self.sessions.remove(session_id);
            }
        }
        None
    }

    pub fn remove_session(&mut self, session_id: &str) {
        self.sessions.remove(session_id);
    }

    pub fn cleanup_expired(&mut self) {
        self.sessions.retain(|_, entry| {
            entry.last_accessed.elapsed() < self.max_age
        });
    }

    pub fn count(&self) -> usize {
        self.sessions.len()
    }
}
```

**Deliverables:**
- ✅ Session management working
- ✅ Auto-cleanup
- ✅ Tests passing

---

#### Day 4-5: Metrics Collection (16 hours)
**Tasks:**
- [ ] Implement metrics collector
- [ ] Add Prometheus exporter
- [ ] Track key metrics (latency, errors, cache hits)
- [ ] Create metrics dashboard endpoint
- [ ] Add performance monitoring

**Files to Create:**
```
src/state/
└── metrics.rs (NEW)
```

**Code Template:**
```rust
// src/state/metrics.rs
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use parking_lot::Mutex;

pub struct MetricsCollector {
    start_time: Instant,

    // Request metrics
    total_requests: AtomicU64,
    failed_requests: AtomicU64,

    // Stream metrics
    total_streams: AtomicU64,
    active_streams: AtomicUsize,
    stream_durations: Arc<Mutex<Vec<Duration>>>,

    // Database metrics
    db_query_count: AtomicU64,
    db_query_errors: AtomicU64,

    // Cache metrics
    cache_hits: AtomicU64,
    cache_misses: AtomicU64,

    // Agent metrics
    agent_selections: Arc<Mutex<HashMap<String, u64>>>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            total_requests: AtomicU64::new(0),
            failed_requests: AtomicU64::new(0),
            total_streams: AtomicU64::new(0),
            active_streams: AtomicUsize::new(0),
            stream_durations: Arc::new(Mutex::new(Vec::new())),
            db_query_count: AtomicU64::new(0),
            db_query_errors: AtomicU64::new(0),
            cache_hits: AtomicU64::new(0),
            cache_misses: AtomicU64::new(0),
            agent_selections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn record_request(&self) {
        self.total_requests.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_failed_request(&self) {
        self.failed_requests.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_stream_start(&self) {
        self.total_streams.fetch_add(1, Ordering::Relaxed);
        self.active_streams.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_stream_completion(&self, duration: Duration) {
        self.active_streams.fetch_sub(1, Ordering::Relaxed);
        self.stream_durations.lock().push(duration);
    }

    pub fn record_db_query(&self) {
        self.db_query_count.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_db_error(&self) {
        self.db_query_errors.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_cache_hit(&self) {
        self.cache_hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_cache_miss(&self) {
        self.cache_misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_agent_selection(&self, agent_name: &str) {
        let mut selections = self.agent_selections.lock();
        *selections.entry(agent_name.to_string()).or_insert(0) += 1;
    }

    pub fn uptime(&self) -> Duration {
        self.start_time.elapsed()
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        let stream_durations = self.stream_durations.lock();
        let avg_stream_duration = if !stream_durations.is_empty() {
            stream_durations.iter().sum::<Duration>() / stream_durations.len() as u32
        } else {
            Duration::from_secs(0)
        };

        let cache_total = self.cache_hits.load(Ordering::Relaxed)
            + self.cache_misses.load(Ordering::Relaxed);
        let cache_hit_rate = if cache_total > 0 {
            (self.cache_hits.load(Ordering::Relaxed) as f64 / cache_total as f64) * 100.0
        } else {
            0.0
        };

        MetricsSnapshot {
            uptime: self.uptime(),
            total_requests: self.total_requests.load(Ordering::Relaxed),
            failed_requests: self.failed_requests.load(Ordering::Relaxed),
            total_streams: self.total_streams.load(Ordering::Relaxed),
            active_streams: self.active_streams.load(Ordering::Relaxed),
            avg_stream_duration,
            db_query_count: self.db_query_count.load(Ordering::Relaxed),
            db_query_errors: self.db_query_errors.load(Ordering::Relaxed),
            cache_hit_rate,
            top_agents: self.top_agents(10),
        }
    }

    fn top_agents(&self, limit: usize) -> Vec<(String, u64)> {
        let selections = self.agent_selections.lock();
        let mut sorted: Vec<_> = selections.iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));
        sorted.truncate(limit);
        sorted
    }
}

#[derive(Debug, serde::Serialize)]
pub struct MetricsSnapshot {
    pub uptime: Duration,
    pub total_requests: u64,
    pub failed_requests: u64,
    pub total_streams: u64,
    pub active_streams: usize,
    pub avg_stream_duration: Duration,
    pub db_query_count: u64,
    pub db_query_errors: u64,
    pub cache_hit_rate: f64,
    pub top_agents: Vec<(String, u64)>,
}
```

**Deliverables:**
- ✅ Metrics collection working
- ✅ Prometheus export
- ✅ Dashboard endpoint
- ✅ Performance monitoring

---

### Week 5 Deliverables Summary

**Completed:**
- ✅ LRU cache with TTL
- ✅ Session management
- ✅ Comprehensive metrics
- ✅ Performance monitoring

**Metrics:**
- Cache Hit Rate: >70%
- Session Cleanup: Every 5 minutes
- Metrics Export: Prometheus format
- Test Coverage: 75%+

---

## Week 6: Project CRUD Operations

**Goal:** Implement complete project management with file operations

### Daily Breakdown

#### Day 1-2: Project Commands (16 hours)
**Tasks:**
- [ ] Create `create_project` command
- [ ] Create `load_project` command
- [ ] Create `save_project` command
- [ ] Create `list_projects` command
- [ ] Create `delete_project` command

**Files to Create:**
```
src/commands/
└── project.rs (NEW)
```

**Code Template:**
```rust
// src/commands/project.rs
use tauri::State;
use crate::state::AppState;
use crate::core::database::queries::*;

#[derive(Debug, serde::Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub active_agents: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct SaveProjectRequest {
    pub project_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub active_agents: String,
    pub messages: Vec<MessageInput>,
    pub files: Vec<FileInput>,
}

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    request: CreateProjectRequest,
) -> Result<String, String> {
    let pool = state.db.inner();

    let project = ProjectQueries::create(pool, CreateProjectInput {
        name: request.name,
        description: request.description,
        project_type: request.project_type,
        active_agents: request.active_agents,
        visibility: "PRIVATE".to_string(),
        user_id: "local-user".to_string(), // TODO: Get from session
    })
    .await
    .map_err(|e| e.to_string())?;

    state.metrics.record_request();

    Ok(project.id)
}

#[tauri::command]
pub async fn load_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectWithDetails, String> {
    let pool = state.db.inner();

    // Try cache first
    let cache_key = format!("project:{}", project_id);
    if let Some(cached) = state.cache.get(&cache_key) {
        state.metrics.record_cache_hit();
        return serde_json::from_value(cached)
            .map_err(|e| e.to_string());
    }

    state.metrics.record_cache_miss();

    // Load from database
    let project = ProjectQueries::find_by_id(pool, &project_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Project not found: {}", project_id))?;

    let messages = MessageQueries::find_by_project(pool, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    let files = ProjectFileQueries::find_by_project(pool, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    let result = ProjectWithDetails {
        project,
        messages,
        files,
    };

    // Cache result
    state.cache.insert(
        cache_key,
        serde_json::to_value(&result).unwrap(),
        std::time::Duration::from_secs(300), // 5 minutes
    );

    Ok(result)
}

#[tauri::command]
pub async fn save_project(
    state: State<'_, AppState>,
    request: SaveProjectRequest,
) -> Result<String, String> {
    let pool = state.db.inner();

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Get or create project ID
    let project_id = request.project_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Upsert project
    ProjectQueries::upsert(&mut tx, &project_id, UpsertProjectInput {
        name: request.name,
        description: request.description,
        project_type: request.project_type,
        active_agents: request.active_agents,
    })
    .await
    .map_err(|e| e.to_string())?;

    // Delete old messages and files
    MessageQueries::delete_by_project(&mut tx, &project_id)
        .await
        .map_err(|e| e.to_string())?;
    ProjectFileQueries::delete_by_project(&mut tx, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    // Insert new messages
    for message in request.messages {
        MessageQueries::create(&mut tx, CreateMessageInput {
            role: message.role,
            content: message.content,
            project_id: project_id.clone(),
            tokens_used: message.tokens_used,
        })
        .await
        .map_err(|e| e.to_string())?;
    }

    // Insert new files
    for file in request.files {
        ProjectFileQueries::create(&mut tx, CreateFileInput {
            project_id: project_id.clone(),
            path: file.path,
            content: file.content,
            language: file.language,
        })
        .await
        .map_err(|e| e.to_string())?;
    }

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    // Invalidate cache
    state.cache.invalidate(&format!("project:{}", project_id));

    state.metrics.record_request();

    Ok(project_id)
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Project>, String> {
    let pool = state.db.inner();

    let projects = ProjectQueries::find_by_user(
        pool,
        "local-user", // TODO: Get from session
        limit.unwrap_or(50),
        offset.unwrap_or(0),
    )
    .await
    .map_err(|e| e.to_string())?;

    state.metrics.record_request();

    Ok(projects)
}

#[tauri::command]
pub async fn delete_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    let pool = state.db.inner();

    ProjectQueries::delete(pool, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    // Invalidate cache
    state.cache.invalidate(&format!("project:{}", project_id));

    state.metrics.record_request();

    Ok(())
}
```

**Deliverables:**
- ✅ All project commands working
- ✅ Transaction support
- ✅ Cache integration
- ✅ Tests passing

---

#### Day 3-4: File Operations (16 hours)
**Tasks:**
- [ ] Implement file CRUD operations
- [ ] Add batch file operations
- [ ] Create file validation
- [ ] Add file size limits
- [ ] Implement file search

**Deliverables:**
- ✅ File operations working
- ✅ Validation and limits
- ✅ Search functionality
- ✅ Tests passing

---

#### Day 5: Integration Testing (8 hours)
**Tasks:**
- [ ] End-to-end project workflow tests
- [ ] Performance benchmarks
- [ ] Error handling tests
- [ ] Cache invalidation tests

**Deliverables:**
- ✅ Full integration tests
- ✅ Performance benchmarks
- ✅ Test coverage >80%

---

### Week 6 Deliverables Summary

**Completed:**
- ✅ Complete project CRUD
- ✅ File operations
- ✅ Transaction support
- ✅ Cache integration
- ✅ Comprehensive tests

**Metrics:**
- Save Time: <200ms
- Load Time: <100ms (cached: <10ms)
- Test Coverage: 80%+

---

## Week 7: Native UI Foundation

**Goal:** Integrate native macOS window and basic UI components

### Tasks Summary

#### Native Window Setup (Days 1-2)
- [ ] Configure Tauri window with native chrome
- [ ] Add window state persistence
- [ ] Implement window controls
- [ ] Add custom title bar

#### React Integration (Days 3-4)
- [ ] Set up React build pipeline
- [ ] Create Tauri-React bridge
- [ ] Implement IPC communication layer
- [ ] Add event listeners

#### Basic Components (Day 5)
- [ ] Landing page native window
- [ ] Dashboard layout
- [ ] Navigation structure
- [ ] Loading states

**Deliverables:**
- ✅ Native window working
- ✅ React UI integrated
- ✅ IPC working
- ✅ Basic pages functional

---

## Week 8: Menu Bar & Keyboard Shortcuts

**Goal:** Implement native macOS menu bar and keyboard shortcuts

### Tasks Summary

#### Menu Bar (Days 1-2)
- [ ] Create application menu
- [ ] Add File menu (New, Open, Save)
- [ ] Add Edit menu (Undo, Redo, Cut, Copy, Paste)
- [ ] Add View menu (Toggle sidebar, Show preview)
- [ ] Add Window menu
- [ ] Add Help menu

#### Keyboard Shortcuts (Days 3-4)
- [ ] Implement global shortcuts
- [ ] Add command handlers
- [ ] Create shortcut documentation
- [ ] Add shortcut customization

#### Settings Integration (Day 5)
- [ ] Native settings window
- [ ] Keychain integration for API keys
- [ ] Preference persistence
- [ ] About window

**Deliverables:**
- ✅ Complete menu bar
- ✅ All keyboard shortcuts
- ✅ Settings window
- ✅ Keychain working

---

## Week 9: File Operations & Settings

**Goal:** Native file pickers, drag-drop, and settings management

### Tasks Summary

#### File Pickers (Days 1-2)
- [ ] NSOpenPanel integration
- [ ] NSSavePanel integration
- [ ] Recent files menu
- [ ] File type filtering

#### Drag & Drop (Days 3-4)
- [ ] Native drag-drop support
- [ ] File validation
- [ ] Multi-file handling
- [ ] Visual feedback

#### Settings Management (Day 5)
- [ ] Complete settings UI
- [ ] API key management
- [ ] User preferences
- [ ] Export/import settings

**Deliverables:**
- ✅ File operations working
- ✅ Drag-drop support
- ✅ Settings complete
- ✅ Tests passing

---

## Week 10: Performance Optimization

**Goal:** Optimize for <1s startup and <5ms queries

### Tasks Summary

#### Startup Optimization (Days 1-2)
- [ ] Lazy loading modules
- [ ] Optimize binary size
- [ ] Reduce dependencies
- [ ] Benchmark startup time

#### Database Optimization (Days 3-4)
- [ ] Query profiling
- [ ] Index optimization
- [ ] Connection pool tuning
- [ ] Cache warming

#### Memory Optimization (Day 5)
- [ ] Memory profiling
- [ ] Reduce allocations
- [ ] Optimize data structures
- [ ] Measure memory usage

**Deliverables:**
- ✅ Startup <1 second
- ✅ Queries <5ms
- ✅ Memory <150MB
- ✅ Performance benchmarks

---

## Week 11: Testing & Quality Assurance

**Goal:** Comprehensive testing and bug fixes

### Tasks Summary

#### Unit Tests (Days 1-2)
- [ ] Complete unit test coverage
- [ ] Mock external dependencies
- [ ] Test error handling
- [ ] Test edge cases

#### Integration Tests (Days 3-4)
- [ ] End-to-end workflows
- [ ] API integration tests
- [ ] Database tests
- [ ] Stream tests

#### Manual Testing (Day 5)
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Stress testing
- [ ] Bug fixing

**Deliverables:**
- ✅ Test coverage >85%
- ✅ All critical bugs fixed
- ✅ Performance targets met
- ✅ Documentation updated

---

## Week 12: Beta Release & Polish

**Goal:** Production-ready beta release

### Tasks Summary

#### Code Signing (Days 1-2)
- [ ] Developer certificate setup
- [ ] Code signing configuration
- [ ] Notarization process
- [ ] Entitlements configuration

#### Release Build (Days 3-4)
- [ ] Production build configuration
- [ ] DMG installer creation
- [ ] Update mechanism
- [ ] Crash reporting

#### Documentation (Day 5)
- [ ] User documentation
- [ ] Developer documentation
- [ ] Release notes
- [ ] Migration guide

**Deliverables:**
- ✅ Signed and notarized app
- ✅ DMG installer
- ✅ Complete documentation
- ✅ Beta release ready

---

## Deliverables Checklist

### Code Deliverables
- [ ] Complete Rust backend (~10,000 lines)
- [ ] All Tauri commands implemented
- [ ] Database migrations and queries
- [ ] Agent system with 84 agents
- [ ] Streaming implementation
- [ ] Cache and state management
- [ ] Native UI integration
- [ ] Menu bar and shortcuts
- [ ] File operations
- [ ] Settings management

### Documentation Deliverables
- [ ] Architecture documentation
- [ ] API documentation
- [ ] User manual
- [ ] Developer guide
- [ ] Migration guide
- [ ] Performance benchmarks
- [ ] Test reports

### Testing Deliverables
- [ ] Unit tests (>85% coverage)
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Load testing results
- [ ] Bug reports and fixes

### Release Deliverables
- [ ] Signed macOS app
- [ ] DMG installer
- [ ] Release notes
- [ ] Marketing materials
- [ ] Beta testing feedback

---

## Risk Management

### Technical Risks

#### Risk 1: Streaming Performance
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Early prototyping of streaming
- Buffering strategies
- Fallback to polling if needed

#### Risk 2: Database Migration
**Impact:** High
**Probability:** Low
**Mitigation:**
- Comprehensive migration scripts
- Data validation
- Rollback procedures
- Test migrations with production data

#### Risk 3: Agent Parsing
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Graceful error handling
- Default agent fallback
- Validation tests for all agents

#### Risk 4: React Integration
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Use proven Tauri patterns
- Incremental migration
- Fallback to web view if needed

### Schedule Risks

#### Risk 1: Scope Creep
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Strict feature freeze after Week 6
- Clear acceptance criteria
- Regular progress reviews

#### Risk 2: Testing Time
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Test-driven development
- Automated testing from Day 1
- Dedicated testing week

---

## Migration Scripts & Tools

### Data Migration Script

```rust
// scripts/migrate_data.rs
use sqlx::SqlitePool;

async fn migrate_from_postgresql() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to PostgreSQL
    let pg_url = std::env::var("POSTGRES_URL")?;
    let pg_pool = sqlx::PgPool::connect(&pg_url).await?;

    // Connect to SQLite
    let sqlite_url = std::env::var("SQLITE_URL")?;
    let sqlite_pool = SqlitePool::connect(&sqlite_url).await?;

    // Migrate users
    let users: Vec<User> = sqlx::query_as("SELECT * FROM users")
        .fetch_all(&pg_pool)
        .await?;

    for user in users {
        sqlx::query!(
            "INSERT INTO users (id, name, email, password, plan, token_balance, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            user.id,
            user.name,
            user.email,
            user.password,
            user.plan,
            user.token_balance,
            user.created_at.timestamp(),
            user.updated_at.timestamp(),
        )
        .execute(&sqlite_pool)
        .await?;
    }

    println!("Migrated {} users", users.len());

    // Migrate projects (similar pattern)
    // Migrate messages (similar pattern)
    // Migrate files (similar pattern)

    Ok(())
}
```

### Performance Benchmark Script

```rust
// benches/stream_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_stream_processing(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("stream_1kb_response", |b| {
        b.to_async(&rt).iter(|| async {
            let client = AnthropicClient::new("test-key");
            // Benchmark streaming 1KB response
        });
    });
}

criterion_group!(benches, bench_stream_processing);
criterion_main!(benches);
```

---

## Success Criteria

### Performance Targets
- ✅ **Startup Time:** <1 second (vs 2.5s web)
- ✅ **Memory Usage:** <150MB (vs 300MB web)
- ✅ **Database Queries:** <5ms (vs 45-80ms web)
- ✅ **AI Streaming:** <100ms latency (vs 200ms web)
- ✅ **Binary Size:** <20MB

### Quality Targets
- ✅ **Test Coverage:** >85%
- ✅ **Bug Count:** <10 critical bugs
- ✅ **Code Quality:** All clippy warnings resolved
- ✅ **Documentation:** 100% public API documented

### User Experience Targets
- ✅ **Feature Parity:** 100% with web app
- ✅ **Native Integration:** Menu bar, shortcuts, file ops
- ✅ **Stability:** <0.1% crash rate
- ✅ **Responsiveness:** No UI blocking

---

## Appendix A: Complete Dependencies

```toml
[dependencies]
# Core
tauri = { version = "2", features = ["devtools", "macos-private-api"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"

# Async
tokio = { version = "1.40", features = ["full", "tracing"] }
tokio-stream = "0.1"
futures = "0.3"
async-trait = "0.1"

# Database
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "sqlite", "migrate", "chrono", "uuid"] }

# HTTP & Streaming
reqwest = { version = "0.12", features = ["json", "stream", "rustls-tls", "http2"] }
axum = "0.7"
tower = "0.5"
tower-http = "0.6"
eventsource-stream = "0.2"
bytes = "1.8"

# Serialization
serde = { version = "1.0", features = ["derive", "rc"] }
serde_json = "1.0"
serde_yaml = "0.9"
bincode = "1.3"

# Error Handling
thiserror = "2.0"
anyhow = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.11", features = ["v4", "v7", "serde", "fast-rng"] }
dirs = "5"
rand = "0.8"

# Security
keyring = "3"
argon2 = "0.5"
secrecy = "0.10"

# Concurrency
parking_lot = "0.12"
dashmap = "6"
arc-swap = "1"
lru = "0.12"

# Rate Limiting
governor = "0.7"

# Metrics
metrics = "0.24"
metrics-exporter-prometheus = "0.16"

[dev-dependencies]
tempfile = "3"
tokio-test = "0.4"
serial_test = "3"
mockall = "0.13"
criterion = { version = "0.5", features = ["async_tokio"] }
wiremock = "0.6"
```

---

## Conclusion

This comprehensive 12-week plan transforms Vibing2 into a high-performance native macOS application with:

- **70-80% code reuse** (React frontend preserved)
- **Rust backend** for 15-20x performance improvement
- **Native macOS integration** (menu bar, shortcuts, Keychain)
- **<1 second startup** time
- **<150MB memory** usage
- **Production-ready** quality

The plan is **immediately executable** with detailed week-by-week tasks, code templates, and clear deliverables. All architectural decisions have been made based on comprehensive analysis.

**Recommended Action:** Begin Week 1 implementation with core Rust infrastructure setup.

---

**Total Estimated Effort:** 480 hours (12 weeks × 40 hours)
**Team Size:** 2-3 engineers
**Investment:** ~$127,000 (fully loaded)
**ROI:** Break-even in 5-6 months, $100K+ Year 1 profit

**Next Step:** Review and approve plan, then begin Day 1 tasks immediately.
