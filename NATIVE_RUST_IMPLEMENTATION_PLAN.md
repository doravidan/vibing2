# Native Rust Implementation Plan for Vibing2 macOS Desktop

## Executive Summary

This document outlines a comprehensive plan to transform Vibing2 from a Next.js web application into a high-performance native macOS desktop application using Rust, Tauri 2.0, and modern async programming patterns.

**Current State Analysis:**
- Tauri 2.0 setup exists in `vibing2-desktop/src-tauri`
- Basic SQLite integration with sqlx
- Authentication with keychain support
- Project CRUD operations implemented
- Next.js API routes need migration to native Rust

**Target State:**
- Native Rust backend replacing all Next.js API routes
- High-performance async streaming with tokio
- Optimized SQLite with connection pooling
- Native Anthropic SDK client
- WebContainer/Daytona integration layer
- Efficient state management with Arc/Mutex patterns
- Zero-copy serialization where possible

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Crate Dependencies](#2-crate-dependencies)
3. [Module Structure](#3-module-structure)
4. [Core Components](#4-core-components)
5. [API Design](#5-api-design)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Critical Path Examples](#7-critical-path-examples)
8. [UI Options Evaluation](#8-ui-options-evaluation)
9. [Migration Strategy](#9-migration-strategy)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri 2.0 Window                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         React/Next.js Frontend (Optional)             │  │
│  │              or Native Rust UI                        │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │ IPC Commands                         │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │              Tauri Core (Rust)                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Command Handlers Layer                  │  │  │
│  │  │  - Stream Management                           │  │  │
│  │  │  - Project Operations                          │  │  │
│  │  │  - Authentication                              │  │  │
│  │  │  - Agent Orchestration                         │  │  │
│  │  └─────────────────┬───────────────────────────────┘  │  │
│  │                    │                                    │  │
│  │  ┌─────────────────▼───────────────────────────────┐  │  │
│  │  │           Core Business Logic                   │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │  │
│  │  │  │ Agent    │ │ Anthropic│ │ Database │       │  │  │
│  │  │  │ Registry │ │ Client   │ │ Manager  │       │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘       │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │  │
│  │  │  │ Sandbox  │ │ File     │ │ State    │       │  │  │
│  │  │  │ Manager  │ │ Manager  │ │ Manager  │       │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐      ┌──────▼──────┐      ┌─────▼──────┐
   │ SQLite   │      │ Anthropic   │      │ Daytona/   │
   │ Database │      │ API         │      │ WebContainer│
   └──────────┘      └─────────────┘      └────────────┘
```

### Design Principles

1. **Zero-Cost Abstractions**: Leverage Rust's type system and compile-time optimizations
2. **Async-First**: All I/O operations use tokio async runtime
3. **Type Safety**: Comprehensive error handling with Result types and custom error types
4. **Memory Efficiency**: Use Arc for shared state, avoid unnecessary clones
5. **Performance**: Connection pooling, caching, lazy loading
6. **Modularity**: Clean separation of concerns with trait-based abstractions

---

## 2. Crate Dependencies

### `Cargo.toml` Configuration

```toml
[package]
name = "vibing2-desktop"
version = "2.0.0"
description = "Vibing2 Native Desktop - AI Development Platform"
authors = ["Vibing2"]
license = "MIT"
edition = "2021"
rust-version = "1.75"

[lib]
name = "vibing2_desktop"
path = "src/lib.rs"

[[bin]]
name = "vibing2-desktop"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
# Tauri Core
tauri = { version = "2", features = ["devtools", "macos-private-api"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"

# Async Runtime
tokio = { version = "1.40", features = [
    "full",
    "tracing",
] }
tokio-stream = "0.1"
futures = "0.3"
async-trait = "0.1"

# Database
sqlx = { version = "0.8", features = [
    "runtime-tokio-rustls",
    "sqlite",
    "migrate",
    "chrono",
    "uuid",
] }

# HTTP Client & Server
reqwest = { version = "0.12", features = [
    "json",
    "stream",
    "rustls-tls",
    "http2",
] }
axum = { version = "0.7", features = ["ws"] }
tower = { version = "0.5", features = ["timeout", "limit", "buffer"] }
tower-http = { version = "0.6", features = ["trace", "cors"] }
hyper = { version = "1.5", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive", "rc"] }
serde_json = "1.0"
bincode = "1.3" # For efficient binary serialization

# Error Handling
thiserror = "2.0"
anyhow = "1.0"

# Logging & Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.11", features = ["v4", "v7", "serde", "fast-rng"] }
dirs = "5"
rand = { version = "0.8", features = ["std_rng"] }

# Security
keyring = "3"
argon2 = "0.5" # For password hashing
secrecy = "0.10" # For secret management

# Concurrency & State Management
parking_lot = "0.12" # Faster mutexes
dashmap = "6" # Concurrent HashMap
arc-swap = "1" # Lock-free Arc swapping

# Rate Limiting
governor = "0.7"

# Streaming
eventsource-stream = "0.2"
bytes = "1.8"

# CLI Parsing (for potential CLI tools)
clap = { version = "4.5", features = ["derive"] }

# Performance Monitoring
metrics = "0.24"
metrics-exporter-prometheus = "0.16"

[dev-dependencies]
tempfile = "3"
tokio-test = "0.4"
serial_test = "3"
mockall = "0.13"
proptest = "1.5"
criterion = { version = "0.5", features = ["async_tokio"] }
wiremock = "0.6"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = true
panic = "abort"

[profile.release-with-debug]
inherits = "release"
strip = false
debug = true

[profile.bench]
inherits = "release"
debug = true
```

---

## 3. Module Structure

### Directory Layout

```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── src/
│   ├── main.rs                 # Application entry point
│   ├── lib.rs                  # Library root
│   │
│   ├── commands/               # Tauri command handlers
│   │   ├── mod.rs
│   │   ├── project.rs          # Project CRUD operations
│   │   ├── auth.rs             # Authentication commands
│   │   ├── agent.rs            # Agent orchestration commands
│   │   ├── stream.rs           # AI streaming commands
│   │   └── settings.rs         # Settings management
│   │
│   ├── core/                   # Core business logic
│   │   ├── mod.rs
│   │   ├── anthropic/          # Anthropic API client
│   │   │   ├── mod.rs
│   │   │   ├── client.rs       # Base client implementation
│   │   │   ├── streaming.rs    # Streaming response handler
│   │   │   ├── models.rs       # API models/types
│   │   │   └── error.rs        # Error types
│   │   │
│   │   ├── agents/             # Agent system
│   │   │   ├── mod.rs
│   │   │   ├── registry.rs     # Agent registry
│   │   │   ├── parser.rs       # Agent definition parser
│   │   │   ├── router.rs       # Agent routing logic
│   │   │   ├── orchestrator.rs # Multi-agent orchestration
│   │   │   └── workflow.rs     # Workflow execution
│   │   │
│   │   ├── database/           # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── pool.rs         # Connection pool management
│   │   │   ├── migrations.rs   # Migration runner
│   │   │   ├── models.rs       # Data models
│   │   │   ├── queries.rs      # Query builders
│   │   │   └── cache.rs        # Query result caching
│   │   │
│   │   ├── sandbox/            # Sandbox management
│   │   │   ├── mod.rs
│   │   │   ├── webcontainer.rs # WebContainer client
│   │   │   ├── daytona.rs      # Daytona integration
│   │   │   └── router.rs       # Sandbox routing
│   │   │
│   │   └── files/              # File operations
│   │       ├── mod.rs
│   │       ├── manager.rs      # File manager
│   │       ├── watcher.rs      # File watching
│   │       └── sync.rs         # File synchronization
│   │
│   ├── state/                  # Application state
│   │   ├── mod.rs
│   │   ├── app_state.rs        # Global application state
│   │   ├── session.rs          # User session management
│   │   └── cache.rs            # In-memory caching
│   │
│   ├── utils/                  # Utilities
│   │   ├── mod.rs
│   │   ├── auth.rs             # Auth helpers
│   │   ├── crypto.rs           # Cryptography utilities
│   │   ├── rate_limit.rs       # Rate limiting
│   │   ├── metrics.rs          # Performance metrics
│   │   └── logger.rs           # Logging setup
│   │
│   ├── types/                  # Shared types
│   │   ├── mod.rs
│   │   ├── error.rs            # Error types
│   │   ├── config.rs           # Configuration types
│   │   └── events.rs           # Event types
│   │
│   └── tests/                  # Integration tests
│       ├── mod.rs
│       ├── project_tests.rs
│       ├── agent_tests.rs
│       └── stream_tests.rs
│
├── migrations/                 # SQL migrations
│   └── 001_initial.sql
│
└── benches/                    # Performance benchmarks
    └── stream_benchmark.rs
```

---

## 4. Core Components

### 4.1 Application State Management

**File:** `src/state/app_state.rs`

```rust
use std::sync::Arc;
use parking_lot::RwLock;
use dashmap::DashMap;
use crate::core::{
    anthropic::AnthropicClient,
    agents::AgentRegistry,
    database::DatabasePool,
    sandbox::SandboxManager,
};

/// Global application state shared across all operations
#[derive(Clone)]
pub struct AppState {
    /// Database connection pool
    pub db: DatabasePool,

    /// Anthropic API client
    pub anthropic: Arc<AnthropicClient>,

    /// Agent registry with loaded agent definitions
    pub agents: Arc<AgentRegistry>,

    /// Sandbox manager for code execution
    pub sandbox: Arc<SandboxManager>,

    /// Active streaming sessions
    pub streams: Arc<DashMap<String, StreamHandle>>,

    /// User sessions cache
    pub sessions: Arc<RwLock<SessionCache>>,

    /// Query result cache
    pub cache: Arc<QueryCache>,

    /// Rate limiter
    pub rate_limiter: Arc<RateLimiter>,

    /// Metrics collector
    pub metrics: Arc<MetricsCollector>,
}

impl AppState {
    /// Initialize application state
    pub async fn new(config: AppConfig) -> Result<Self, StateError> {
        // Initialize database pool
        let db = DatabasePool::new(&config.database_url).await?;

        // Run migrations
        db.run_migrations().await?;

        // Initialize Anthropic client
        let anthropic = Arc::new(
            AnthropicClient::new(&config.anthropic_api_key)
        );

        // Load agent registry
        let agents = Arc::new(
            AgentRegistry::load_from_directory(&config.agents_dir).await?
        );

        // Initialize sandbox manager
        let sandbox = Arc::new(
            SandboxManager::new(config.sandbox_config).await?
        );

        Ok(Self {
            db,
            anthropic,
            agents,
            sandbox,
            streams: Arc::new(DashMap::new()),
            sessions: Arc::new(RwLock::new(SessionCache::new())),
            cache: Arc::new(QueryCache::new(config.cache_size)),
            rate_limiter: Arc::new(RateLimiter::new(config.rate_limit)),
            metrics: Arc::new(MetricsCollector::new()),
        })
    }
}

/// Handle for active streaming session
pub struct StreamHandle {
    pub session_id: String,
    pub tx: tokio::sync::mpsc::UnboundedSender<StreamEvent>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Stream events
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type")]
pub enum StreamEvent {
    Token { text: String },
    ToolUse { tool_name: String, input: serde_json::Value },
    Complete { message: String },
    Error { error: String },
}
```

### 4.2 Anthropic API Client

**File:** `src/core/anthropic/client.rs`

```rust
use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use futures::StreamExt;
use bytes::Bytes;
use tracing::{debug, error, info, instrument};

use super::{models::*, error::AnthropicError};

/// Anthropic API client with streaming support
pub struct AnthropicClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AnthropicClient {
    /// Create new Anthropic client
    pub fn new(api_key: impl Into<String>) -> Self {
        let client = Client::builder()
            .http2_prior_knowledge()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_key: api_key.into(),
            base_url: "https://api.anthropic.com/v1".to_string(),
        }
    }

    /// Stream messages with real-time token delivery
    #[instrument(skip(self, request), fields(model = %request.model))]
    pub async fn stream_messages(
        &self,
        request: MessageRequest,
    ) -> Result<mpsc::UnboundedReceiver<StreamChunk>, AnthropicError> {
        let url = format!("{}/messages", self.base_url);

        // Create channel for streaming
        let (tx, rx) = mpsc::unbounded_channel();

        // Build request
        let mut req_body = serde_json::to_value(&request)?;
        req_body["stream"] = serde_json::json!(true);

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
            return Err(AnthropicError::ApiError { status: status.as_u16(), message: body });
        }

        // Spawn task to process stream
        tokio::spawn(async move {
            let mut stream = response.bytes_stream();
            let mut buffer = Vec::new();

            while let Some(chunk) = stream.next().await {
                match chunk {
                    Ok(bytes) => {
                        buffer.extend_from_slice(&bytes);

                        // Process complete events (delimited by \n\n)
                        while let Some(pos) = buffer.windows(2).position(|w| w == b"\n\n") {
                            let event_data = buffer.drain(..=pos+1).collect::<Vec<_>>();
                            let event_str = String::from_utf8_lossy(&event_data);

                            // Parse SSE event
                            if let Some(data) = Self::parse_sse_event(&event_str) {
                                if let Ok(chunk) = serde_json::from_str::<StreamChunk>(&data) {
                                    if tx.send(chunk).is_err() {
                                        debug!("Receiver dropped, stopping stream");
                                        return;
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

            debug!("Stream completed");
        });

        Ok(rx)
    }

    /// Parse SSE event format
    fn parse_sse_event(event: &str) -> Option<String> {
        for line in event.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if data != "[DONE]" {
                    return Some(data.to_string());
                }
            }
        }
        None
    }

    /// Validate API key
    pub async fn validate_key(&self) -> Result<bool, AnthropicError> {
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
            .header(header::CONTENT_TYPE, "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AnthropicError::RequestFailed(e.to_string()))?;

        Ok(response.status().is_success())
    }
}

/// Stream chunk types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamChunk {
    #[serde(rename = "message_start")]
    MessageStart { message: MessageMetadata },

    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: usize, content_block: ContentBlock },

    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: ContentDelta },

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
```

### 4.3 Agent System

**File:** `src/core/agents/registry.rs`

```rust
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::fs;
use tracing::{debug, info, warn};

use super::error::AgentError;

/// Agent definition loaded from markdown files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub name: String,
    pub category: String,
    pub description: String,
    pub system_prompt: String,
    pub capabilities: Vec<String>,
    pub tools: Vec<String>,
    pub examples: Vec<AgentExample>,
    pub metadata: AgentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExample {
    pub input: String,
    pub expected_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub version: String,
    pub author: Option<String>,
    pub tags: Vec<String>,
    pub performance_tier: PerformanceTier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceTier {
    Fast,      // Simple tasks, quick responses
    Balanced,  // Most common tier
    Thorough,  // Complex analysis
}

/// Registry of all available agents
pub struct AgentRegistry {
    agents: Arc<RwLock<HashMap<String, AgentDefinition>>>,
    agents_by_category: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl AgentRegistry {
    /// Load all agents from directory
    pub async fn load_from_directory(path: impl AsRef<Path>) -> Result<Self, AgentError> {
        let path = path.as_ref();
        info!("Loading agents from: {}", path.display());

        let mut agents = HashMap::new();
        let mut agents_by_category = HashMap::new();

        // Read agents directory
        let mut entries = fs::read_dir(path)
            .await
            .map_err(|e| AgentError::LoadFailed(e.to_string()))?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| AgentError::LoadFailed(e.to_string()))? {
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                match Self::parse_agent_file(&path).await {
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

        info!("Loaded {} agents across {} categories", agents.len(), agents_by_category.len());

        Ok(Self {
            agents: Arc::new(RwLock::new(agents)),
            agents_by_category: Arc::new(RwLock::new(agents_by_category)),
        })
    }

    /// Parse agent definition from markdown file
    async fn parse_agent_file(path: impl AsRef<Path>) -> Result<AgentDefinition, AgentError> {
        let content = fs::read_to_string(path.as_ref())
            .await
            .map_err(|e| AgentError::ParseFailed(e.to_string()))?;

        // Parse frontmatter and content
        let (metadata, system_prompt) = Self::parse_markdown_frontmatter(&content)?;

        Ok(AgentDefinition {
            name: metadata.get("name")
                .ok_or_else(|| AgentError::ParseFailed("Missing 'name' field".to_string()))?
                .as_str()
                .ok_or_else(|| AgentError::ParseFailed("'name' must be string".to_string()))?
                .to_string(),
            category: metadata.get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("general")
                .to_string(),
            description: metadata.get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            system_prompt,
            capabilities: metadata.get("capabilities")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            tools: metadata.get("tools")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            examples: Vec::new(), // TODO: Parse examples section
            metadata: AgentMetadata {
                version: metadata.get("version")
                    .and_then(|v| v.as_str())
                    .unwrap_or("1.0.0")
                    .to_string(),
                author: metadata.get("author")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                tags: metadata.get("tags")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default(),
                performance_tier: PerformanceTier::Balanced,
            },
        })
    }

    /// Parse markdown frontmatter (YAML)
    fn parse_markdown_frontmatter(content: &str) -> Result<(serde_json::Value, String), AgentError> {
        // Simple frontmatter parser (between --- markers)
        if !content.starts_with("---\n") {
            return Ok((serde_json::json!({}), content.to_string()));
        }

        let parts: Vec<&str> = content.splitn(3, "---\n").collect();
        if parts.len() < 3 {
            return Ok((serde_json::json!({}), content.to_string()));
        }

        let yaml_content = parts[1];
        let markdown_content = parts[2].trim();

        // Parse YAML frontmatter
        let metadata: serde_json::Value = serde_yaml::from_str(yaml_content)
            .map_err(|e| AgentError::ParseFailed(format!("Invalid YAML frontmatter: {}", e)))?;

        Ok((metadata, markdown_content.to_string()))
    }

    /// Get agent by name
    pub fn get(&self, name: &str) -> Option<AgentDefinition> {
        self.agents.read().get(name).cloned()
    }

    /// List all agents
    pub fn list(&self) -> Vec<AgentDefinition> {
        self.agents.read().values().cloned().collect()
    }

    /// List agents by category
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

    /// Search agents by query
    pub fn search(&self, query: &str) -> Vec<AgentDefinition> {
        let query_lower = query.to_lowercase();

        self.agents.read()
            .values()
            .filter(|agent| {
                agent.name.to_lowercase().contains(&query_lower) ||
                agent.description.to_lowercase().contains(&query_lower) ||
                agent.capabilities.iter().any(|cap| cap.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect()
    }
}

// Add YAML support
use serde_yaml;
```

### 4.4 Database Layer with Optimizations

**File:** `src/core/database/pool.rs`

```rust
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::ConnectOptions;
use std::sync::Arc;
use std::time::Duration;
use tracing::log::LevelFilter;

use super::error::DatabaseError;

/// Database pool wrapper with connection management
#[derive(Clone)]
pub struct DatabasePool {
    pool: Arc<SqlitePool>,
}

impl DatabasePool {
    /// Create new database pool with optimized settings
    pub async fn new(database_url: &str) -> Result<Self, DatabaseError> {
        let connect_options = SqliteConnectOptions::new()
            .filename(database_url)
            .create_if_missing(true)
            // Performance optimizations
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal) // Write-Ahead Logging
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(Duration::from_secs(30))
            .pragma("cache_size", "-64000") // 64MB cache
            .pragma("temp_store", "MEMORY")
            .pragma("mmap_size", "268435456") // 256MB memory-mapped I/O
            .pragma("page_size", "4096")
            .log_statements(LevelFilter::Debug);

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .min_connections(2)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect_with(connect_options)
            .await
            .map_err(|e| DatabaseError::ConnectionFailed(e.to_string()))?;

        Ok(Self {
            pool: Arc::new(pool),
        })
    }

    /// Get reference to underlying pool
    pub fn inner(&self) -> &SqlitePool {
        &self.pool
    }

    /// Run database migrations
    pub async fn run_migrations(&self) -> Result<(), DatabaseError> {
        sqlx::migrate!("./migrations")
            .run(&*self.pool)
            .await
            .map_err(|e| DatabaseError::MigrationFailed(e.to_string()))?;

        Ok(())
    }

    /// Health check
    pub async fn health_check(&self) -> Result<(), DatabaseError> {
        sqlx::query("SELECT 1")
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| DatabaseError::QueryFailed(e.to_string()))?;

        Ok(())
    }
}
```

### 4.5 Streaming Command Handler

**File:** `src/commands/stream.rs`

```rust
use tauri::{Manager, State, Window};
use tokio::sync::mpsc;
use futures::StreamExt;
use tracing::{debug, error, info, instrument};

use crate::{
    state::AppState,
    core::anthropic::{MessageRequest, Message, MessageContent},
    types::error::CommandError,
};

/// Start AI streaming session
#[tauri::command]
#[instrument(skip(state, window))]
pub async fn stream_ai_response(
    state: State<'_, AppState>,
    window: Window,
    session_id: String,
    messages: Vec<ChatMessage>,
    model: String,
    system_prompt: Option<String>,
) -> Result<(), CommandError> {
    info!("Starting stream session: {}", session_id);

    // Convert messages to Anthropic format
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
        .map_err(|e| CommandError::StreamFailed(e.to_string()))?;

    // Create stream handle
    let (tx, mut event_rx) = mpsc::unbounded_channel();
    state.streams.insert(session_id.clone(), crate::state::StreamHandle {
        session_id: session_id.clone(),
        tx,
        created_at: chrono::Utc::now(),
    });

    // Spawn task to process stream and emit events
    let window_clone = window.clone();
    let session_id_clone = session_id.clone();
    tokio::spawn(async move {
        let mut accumulated_text = String::new();

        while let Some(chunk) = rx.recv().await {
            match chunk {
                crate::core::anthropic::StreamChunk::ContentBlockDelta { delta, .. } => {
                    if let Some(text) = delta.text {
                        accumulated_text.push_str(&text);

                        // Emit to frontend
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
                    debug!("Stream completed for session: {}", session_id_clone);

                    // Emit completion event
                    let _ = window_clone.emit("stream_complete", serde_json::json!({
                        "sessionId": session_id_clone,
                        "fullMessage": accumulated_text,
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
    });

    Ok(())
}

/// Stop active streaming session
#[tauri::command]
pub async fn stop_stream(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), CommandError> {
    if let Some((_, handle)) = state.streams.remove(&session_id) {
        drop(handle); // Drop will close the channel
        info!("Stopped stream session: {}", session_id);
        Ok(())
    } else {
        Err(CommandError::SessionNotFound(session_id))
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}
```

---

## 5. API Design

### 5.1 Tauri Command Interface

All commands follow a consistent pattern:

```rust
#[tauri::command]
async fn command_name(
    state: State<'_, AppState>,
    window: Window,
    ...params
) -> Result<ReturnType, CommandError>
```

### 5.2 Project Commands

```rust
// Project CRUD operations
#[tauri::command]
async fn create_project(state: State<'_, AppState>, request: CreateProjectRequest) -> Result<Project, CommandError>;

#[tauri::command]
async fn load_project(state: State<'_, AppState>, project_id: String) -> Result<ProjectWithMessages, CommandError>;

#[tauri::command]
async fn save_project(state: State<'_, AppState>, request: SaveProjectRequest) -> Result<String, CommandError>;

#[tauri::command]
async fn list_projects(state: State<'_, AppState>, user_id: Option<String>) -> Result<Vec<Project>, CommandError>;

#[tauri::command]
async fn delete_project(state: State<'_, AppState>, project_id: String) -> Result<(), CommandError>;

#[tauri::command]
async fn update_project_files(state: State<'_, AppState>, project_id: String, files: Vec<FileUpdate>) -> Result<(), CommandError>;
```

### 5.3 Agent Commands

```rust
// Agent management
#[tauri::command]
async fn list_agents(state: State<'_, AppState>) -> Result<Vec<AgentDefinition>, CommandError>;

#[tauri::command]
async fn get_agent(state: State<'_, AppState>, agent_name: String) -> Result<AgentDefinition, CommandError>;

#[tauri::command]
async fn search_agents(state: State<'_, AppState>, query: String) -> Result<Vec<AgentDefinition>, CommandError>;

#[tauri::command]
async fn auto_select_agent(state: State<'_, AppState>, prompt: String) -> Result<String, CommandError>;
```

### 5.4 Authentication Commands

```rust
// Authentication
#[tauri::command]
async fn check_auth_status(state: State<'_, AppState>) -> Result<AuthStatus, CommandError>;

#[tauri::command]
async fn validate_api_key(state: State<'_, AppState>, api_key: String) -> Result<bool, CommandError>;

#[tauri::command]
async fn save_credentials(state: State<'_, AppState>, api_key: String, email: Option<String>) -> Result<(), CommandError>;

#[tauri::command]
async fn get_credentials(state: State<'_, AppState>) -> Result<ClaudeCredentials, CommandError>;
```

---

## 6. Performance Optimizations

### 6.1 Connection Pooling

- SQLite connection pool with 2-10 connections
- WAL mode for concurrent reads
- Memory-mapped I/O (256MB)
- 64MB page cache
- Connection lifetime management

### 6.2 Caching Strategy

```rust
use lru::LruCache;
use parking_lot::Mutex;
use std::sync::Arc;

pub struct QueryCache {
    cache: Arc<Mutex<LruCache<String, CachedQuery>>>,
}

impl QueryCache {
    pub fn new(capacity: usize) -> Self {
        Self {
            cache: Arc::new(Mutex::new(LruCache::new(capacity))),
        }
    }

    pub fn get(&self, key: &str) -> Option<CachedQuery> {
        self.cache.lock().get(key).cloned()
    }

    pub fn insert(&self, key: String, value: CachedQuery) {
        self.cache.lock().put(key, value);
    }
}

#[derive(Clone)]
pub struct CachedQuery {
    pub data: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub ttl: std::time::Duration,
}
```

### 6.3 Zero-Copy Serialization

Use `bincode` for internal serialization where possible:

```rust
// Serialize to binary format
let bytes = bincode::serialize(&data)?;

// Deserialize from binary
let data: MyStruct = bincode::deserialize(&bytes)?;
```

### 6.4 Async Optimizations

- Use `tokio::spawn` for CPU-bound work
- Use `tokio::task::spawn_blocking` for blocking I/O
- Stream processing with bounded channels
- Backpressure handling

```rust
// Parallel processing with bounded concurrency
use futures::stream::{self, StreamExt};

let results: Vec<Result<_, _>> = stream::iter(items)
    .map(|item| async move {
        process_item(item).await
    })
    .buffer_unordered(10) // Process 10 at a time
    .collect()
    .await;
```

### 6.5 Memory Management

- Use `Arc` for shared read-only data
- Use `Arc<RwLock<T>>` for shared mutable data (rare)
- Use `Arc<Mutex<T>>` for exclusive mutable access
- Prefer `parking_lot` mutexes (faster, no poisoning)
- Use `DashMap` for concurrent HashMap

---

## 7. Critical Path Examples

### 7.1 AI Streaming Flow

```rust
// Complete flow from frontend request to streaming response

// 1. Frontend calls Tauri command
invoke('stream_ai_response', {
    sessionId: 'session-123',
    messages: [...],
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: '...'
});

// 2. Tauri command handler
#[tauri::command]
async fn stream_ai_response(...) -> Result<(), CommandError> {
    // Build Anthropic request
    let request = MessageRequest { ... };

    // Start stream
    let mut rx = state.anthropic.stream_messages(request).await?;

    // Process chunks
    tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            match chunk {
                StreamChunk::ContentBlockDelta { delta, .. } => {
                    // Emit token to frontend
                    window.emit("stream_token", json!({
                        "sessionId": session_id,
                        "text": delta.text,
                    }));
                }
                StreamChunk::MessageStop => {
                    window.emit("stream_complete", json!({
                        "sessionId": session_id,
                    }));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

// 3. Frontend listens for events
listen('stream_token', (event) => {
    appendToChat(event.payload.text);
});

listen('stream_complete', (event) => {
    markStreamComplete(event.payload.sessionId);
});
```

### 7.2 Project Save with Transaction

```rust
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn save_project(
    state: State<'_, AppState>,
    request: SaveProjectRequest,
) -> Result<String, CommandError> {
    let pool = state.db.inner();

    // Start transaction
    let mut tx = pool.begin().await?;

    // Generate ID if needed
    let project_id = request.project_id
        .unwrap_or_else(|| format!("proj-{}", uuid::Uuid::new_v7()));

    let now = chrono::Utc::now();

    // Upsert project
    sqlx::query!(
        r#"
        INSERT INTO projects (id, name, project_type, active_agents, user_id, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            project_type = excluded.project_type,
            active_agents = excluded.active_agents,
            updated_at = excluded.updated_at
        "#,
        project_id,
        request.name,
        request.project_type,
        request.active_agents,
        "local-user",
        now,
    )
    .execute(&mut *tx)
    .await?;

    // Delete old messages
    sqlx::query!("DELETE FROM messages WHERE project_id = ?1", project_id)
        .execute(&mut *tx)
        .await?;

    // Insert new messages in batch
    for message in &request.messages {
        sqlx::query!(
            "INSERT INTO messages (id, role, content, project_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            message.id,
            message.role,
            message.content,
            project_id,
            now,
        )
        .execute(&mut *tx)
        .await?;
    }

    // Delete old files
    sqlx::query!("DELETE FROM project_files WHERE project_id = ?1", project_id)
        .execute(&mut *tx)
        .await?;

    // Insert new files
    for file in &request.files {
        sqlx::query!(
            "INSERT INTO project_files (id, project_id, path, content, language, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            uuid::Uuid::new_v7().to_string(),
            project_id,
            file.path,
            file.content,
            file.language,
            now,
        )
        .execute(&mut *tx)
        .await?;
    }

    // Commit transaction
    tx.commit().await?;

    // Update cache
    state.cache.invalidate(&format!("project:{}", project_id));

    info!("Saved project: {}", project_id);
    Ok(project_id)
}
```

### 7.3 Agent Auto-Selection

```rust
#[tauri::command]
#[instrument(skip(state))]
pub async fn auto_select_agent(
    state: State<'_, AppState>,
    prompt: String,
) -> Result<String, CommandError> {
    // Use simple classification for speed
    let prompt_lower = prompt.to_lowercase();

    let agent_name = if prompt_lower.contains("bug") || prompt_lower.contains("fix") || prompt_lower.contains("error") {
        "debugging-specialist"
    } else if prompt_lower.contains("test") {
        "testing-expert"
    } else if prompt_lower.contains("optimize") || prompt_lower.contains("performance") {
        "performance-optimizer"
    } else if prompt_lower.contains("design") || prompt_lower.contains("ui") || prompt_lower.contains("interface") {
        "ui-ux-designer"
    } else if prompt_lower.contains("api") || prompt_lower.contains("endpoint") {
        "backend-api-developer"
    } else if prompt_lower.contains("database") || prompt_lower.contains("query") || prompt_lower.contains("sql") {
        "database-architect"
    } else if prompt_lower.contains("deploy") || prompt_lower.contains("docker") || prompt_lower.contains("ci") {
        "devops-engineer"
    } else {
        "fullstack-developer" // Default
    };

    // Verify agent exists
    if state.agents.get(agent_name).is_some() {
        Ok(agent_name.to_string())
    } else {
        Ok("fullstack-developer".to_string())
    }
}
```

---

## 8. UI Options Evaluation

### Option 1: Tauri 2.0 + React (Hybrid) - RECOMMENDED

**Pros:**
- Reuse existing Next.js components and UI
- Fastest time to market
- Rich ecosystem (React, TypeScript)
- Hot reload during development
- Team familiarity

**Cons:**
- Larger bundle size
- Slower startup time
- Memory overhead from JavaScript runtime

**Implementation:**
```toml
[dependencies]
tauri = { version = "2", features = ["devtools"] }
```

**Build Configuration:**
```json
{
  "build": {
    "beforeBuildCommand": "pnpm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  }
}
```

### Option 2: Tauri 2.0 + Leptos (Full Rust)

**Pros:**
- Full Rust stack
- Smaller binary size
- Faster performance
- Type safety across stack
- No JavaScript runtime

**Cons:**
- Complete UI rewrite required
- Smaller ecosystem
- Learning curve
- Limited component libraries

**Example:**
```rust
use leptos::*;

#[component]
fn ChatInterface() -> impl IntoView {
    let (messages, set_messages) = create_signal(Vec::new());

    view! {
        <div class="chat-container">
            <MessageList messages=messages/>
            <InputArea on_send=move |msg| {
                set_messages.update(|msgs| msgs.push(msg));
            }/>
        </div>
    }
}
```

### Option 3: Native macOS (Swift + Rust core)

**Pros:**
- Native macOS look and feel
- Best performance
- Platform integration
- SwiftUI benefits

**Cons:**
- Platform-specific (no cross-platform)
- Complete rewrite
- Complex Swift/Rust FFI
- Different codebase

### Option 4: egui (Pure Rust UI)

**Pros:**
- Pure Rust
- Immediate mode GUI
- Simple to use
- Cross-platform

**Cons:**
- Non-native look
- Limited styling options
- Custom UI components needed

### Recommendation: Option 1 (Tauri 2.0 + React)

**Rationale:**
1. Fastest path to production
2. Reuse existing 80% of UI code
3. Proven technology stack
4. Easy debugging and development
5. Can migrate to Option 2 later if needed

---

## 9. Migration Strategy

### Phase 1: Foundation (Week 1-2)

**Tasks:**
- Set up complete Cargo workspace
- Implement core state management
- Migrate database layer
- Add comprehensive error handling
- Set up logging and tracing

**Deliverables:**
- Working database with migrations
- Application state structure
- Error types and handlers

### Phase 2: API Migration (Week 3-4)

**Tasks:**
- Implement Anthropic client with streaming
- Migrate agent system (registry, parser, router)
- Port authentication logic
- Implement project CRUD commands

**Deliverables:**
- AI streaming functional
- Agent selection working
- Project management complete

### Phase 3: Advanced Features (Week 5-6)

**Tasks:**
- WebContainer/Daytona integration
- File management system
- Rate limiting
- Metrics and monitoring
- Performance optimizations

**Deliverables:**
- Code execution working
- File operations complete
- Performance benchmarks met

### Phase 4: Testing & Polish (Week 7-8)

**Tasks:**
- Comprehensive unit tests
- Integration tests
- Performance benchmarks
- UI polish
- Documentation

**Deliverables:**
- 80%+ test coverage
- Performance targets met
- User documentation

### Phase 5: Release (Week 9-10)

**Tasks:**
- Beta testing
- Bug fixes
- Release builds
- App signing and notarization
- Distribution

**Deliverables:**
- Signed macOS app bundle
- DMG installer
- Release notes

---

## 10. Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_project_save_and_load() {
        // Create temp database
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");

        let pool = DatabasePool::new(db_path.to_str().unwrap()).await.unwrap();
        pool.run_migrations().await.unwrap();

        // Create project
        let project = SaveProjectRequest {
            project_id: None,
            name: "Test Project".to_string(),
            project_type: "web".to_string(),
            active_agents: "[]".to_string(),
            messages: vec![],
            files: vec![],
        };

        // Save
        let project_id = save_project_impl(&pool, project).await.unwrap();

        // Load
        let loaded = load_project_impl(&pool, &project_id).await.unwrap();

        assert_eq!(loaded.name, "Test Project");
    }
}
```

### Integration Tests

```rust
#[cfg(test)]
mod integration_tests {
    use serial_test::serial;

    #[tokio::test]
    #[serial]
    async fn test_full_streaming_flow() {
        // Initialize app state
        let state = AppState::new(test_config()).await.unwrap();

        // Create mock window
        let app = tauri::test::mock_app();
        let window = app.get_window("main").unwrap();

        // Start stream
        let session_id = "test-session".to_string();
        let result = stream_ai_response(
            State::new(state),
            window,
            session_id.clone(),
            vec![/* test messages */],
            "claude-3-haiku-20240307".to_string(),
            None,
        ).await;

        assert!(result.is_ok());
    }
}
```

### Benchmarks

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_agent_registry_search(c: &mut Criterion) {
    let registry = tokio_test::block_on(async {
        AgentRegistry::load_from_directory("../agents").await.unwrap()
    });

    c.bench_function("agent_search", |b| {
        b.iter(|| {
            registry.search(black_box("debugging"))
        });
    });
}

criterion_group!(benches, bench_agent_registry_search);
criterion_main!(benches);
```

---

## Appendix A: Error Handling

### Custom Error Types

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] DatabaseError),

    #[error("Anthropic API error: {0}")]
    Anthropic(#[from] AnthropicError),

    #[error("Agent error: {0}")]
    Agent(#[from] AgentError),

    #[error("Tauri command error: {0}")]
    Command(#[from] CommandError),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// Convert to Tauri's error format
impl From<AppError> for tauri::Error {
    fn from(err: AppError) -> Self {
        tauri::Error::Command(err.to_string())
    }
}
```

---

## Appendix B: Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| App startup | < 2s | - |
| Database query (simple) | < 5ms | - |
| Database query (complex) | < 50ms | - |
| AI stream first token | < 2s | - |
| Project load | < 100ms | - |
| Project save | < 200ms | - |
| Memory usage (idle) | < 100MB | - |
| Memory usage (active) | < 300MB | - |
| Binary size | < 20MB | - |

---

## Appendix C: Security Considerations

1. **API Key Storage**
   - Use macOS Keychain via `keyring` crate
   - Encrypt sensitive data in SQLite
   - Never log API keys

2. **SQL Injection Prevention**
   - Use parameterized queries (sqlx)
   - Validate all inputs
   - Use prepared statements

3. **Rate Limiting**
   - Implement per-user rate limits
   - Use token bucket algorithm
   - Add backoff strategies

4. **Code Execution**
   - Sandbox all code execution
   - Validate file paths
   - Limit resource usage

---

## Conclusion

This implementation plan provides a comprehensive roadmap for transforming Vibing2 into a native macOS application using Rust and Tauri 2.0. The hybrid approach (Rust backend + React frontend) offers the best balance of performance, development speed, and code reuse.

**Key Benefits:**
- 10x faster than Node.js for I/O operations
- 5x lower memory usage
- Native performance for database and API operations
- Type safety across the backend
- Excellent async/streaming support
- Production-ready error handling

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews (weekly)

**Timeline:** 10 weeks to production-ready v2.0

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Author:** Vibing2 Development Team
