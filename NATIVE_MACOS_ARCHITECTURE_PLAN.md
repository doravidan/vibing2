# Native macOS Architecture Migration Plan
## Vibing2 - AI-Powered Development Platform

**Status:** Architectural Blueprint
**Target:** Native macOS Application
**Current:** Next.js 15 + React 19 + Tauri 2.0 (Hybrid)
**Document Version:** 1.0
**Date:** 2025-10-13

---

## Executive Summary

This document provides a comprehensive architectural analysis and migration strategy for transforming Vibing2 from a web-first application into a fully native macOS experience. After evaluating four architectural approaches, **Option B: Tauri 2.0 + Native UI Enhancement** emerges as the optimal path, offering the best balance of development velocity, native performance, and code reuse.

### Key Findings

**Current Architecture Strengths:**
- 154 specialized AI agents with sophisticated orchestration
- Robust multi-agent system with dependency management
- Comprehensive API layer (26 routes, 3,770 lines)
- PostgreSQL/SQLite dual database support
- Advanced streaming and SSE implementation

**Current Architecture Weaknesses:**
- Web-centric design with heavy Next.js dependencies
- Mixed client/server components requiring runtime
- Authentication tied to NextAuth (web sessions)
- Limited native OS integration
- Preview system relies on iframe sandboxing

**Migration Impact:** HIGH
**Estimated Timeline:** 12-16 weeks (phased approach)
**Risk Level:** Medium (with mitigation strategies)

---

## 1. Current Architecture Analysis

### 1.1 Technology Stack Inventory

#### Frontend Layer
```
Framework:        Next.js 15.5.4 (App Router)
UI Library:       React 19.1.0
State Management: Zustand 5.0.8 (persistent stores)
Styling:          Tailwind CSS 4.0
Components:       10 core components (PreviewPanel, ChatMessages, etc.)
Real-time:        Socket.io 4.8.1 (client/server)
```

#### Backend Layer
```
Runtime:          Node.js (production server via server.js)
API Framework:    Next.js API Routes (26 endpoints)
Authentication:   NextAuth 5.0.0-beta.25 (JWT sessions)
Database ORM:     Prisma 6.16.3
Streaming:        Custom SSE parser + Anthropic SDK streaming
Rate Limiting:    Upstash Redis (optional)
Logging:          Pino 10.0.0
```

#### Data Layer
```
Primary DB:       PostgreSQL (production)
Local DB:         SQLite (development/desktop)
Caching:          In-memory + Upstash Redis
Schema:           12 models (User, Project, ProjectFile, Message, etc.)
Migrations:       Prisma migrate
```

#### AI/Agent Layer
```
LLM Provider:     Anthropic Claude (Sonnet 4, Opus 4)
Agent System:     154 specialized agents (markdown-based)
Orchestration:    Custom multi-agent orchestrator
Context:          PFC (Prompt Flow Control) system
Streaming:        Real-time SSE with tool events
Auto-Selection:   Intelligent agent routing
```

#### Sandbox/Preview Layer
```
WebContainer:     @webcontainer/api 1.6.1 (browser-based)
Daytona:          @daytonaio/sdk 0.109.0 (cloud sandboxes)
Local Sandbox:    Custom iframe + blob URL manager
File Management:  Multi-file project structure
```

#### Desktop (Tauri) Layer
```
Tauri:            2.0 (Rust backend)
Database:         SQLx + SQLite
Commands:         10 Tauri commands (save_project, load_project, etc.)
Auth:             Local API key storage + validation
Build:            DMG packaging for macOS
```

### 1.2 API Routes Analysis

**26 API Routes (3,770 total lines):**

#### Core AI Routes
- `/api/agent/stream` - Primary AI streaming endpoint (521 lines)
- `/api/agent/stream-daytona` - Daytona sandbox integration
- `/api/agents/list` - Agent registry listing
- `/api/agents/auto-select` - Intelligent agent selection
- `/api/workflows/execute` - Multi-agent workflow orchestration
- `/api/workflows/list` - Workflow templates

#### Project Management Routes
- `/api/projects/save` - Save project + messages (152 lines)
- `/api/projects/load` - Load project with pagination (96 lines)
- `/api/projects/list` - List user projects
- `/api/projects/[projectId]` - Get/update/delete project
- `/api/projects/fork` - Fork existing project
- `/api/projects/like` - Like/unlike project

#### Authentication Routes
- `/api/auth/[...nextauth]` - NextAuth handler
- `/api/auth/signup` - User registration
- `/api/auth/clear-session` - Session cleanup

#### Collaboration Routes
- `/api/collab/invite` - Send collaboration invite
- `/api/collab/respond` - Accept/reject invite
- `/api/collab/members` - List collaborators

#### Discovery Routes
- `/api/discover` - Discover public projects
- `/api/competitions` - Competition listings

#### Health & Monitoring Routes
- `/api/health` - Basic health check
- `/api/health/database` - Database connectivity
- `/api/metrics` - Performance metrics
- `/api/metrics/web-vitals` - Frontend vitals
- `/api/monitor/queries` - Query performance

#### Real-time Routes
- `/api/stream/chat` - Chat streaming endpoint

### 1.3 Database Schema Analysis

**12 Prisma Models:**

```prisma
User {
  - Authentication & profile
  - Token balance & context tracking
  - Plan management (FREE/PRO/ENTERPRISE)
  - Relations: projects, tokenUsage, sessions
}

Project {
  - Core project metadata
  - Multi-file support (ProjectFile relation)
  - Visibility (PRIVATE/PUBLIC)
  - Social features (likes, forks)
  - Collaboration support
}

ProjectFile {
  - Individual file storage
  - Path-based organization
  - Language detection
  - Unique constraint: [projectId, path]
}

Message {
  - Chat history per project
  - Role-based (user/assistant)
  - Indexed by [projectId, createdAt]
}

TokenUsage {
  - Token consumption tracking
  - PFC savings metrics
  - Per-endpoint analytics
}

ProjectCollaborator {
  - Role-based access (VIEWER/EDITOR/OWNER)
  - Team collaboration
}

CollaborationInvite {
  - Pending invites
  - Status tracking (PENDING/ACCEPTED/REJECTED)
}

Account, Session, VerificationToken {
  - NextAuth models
  - OAuth support (future)
}
```

**Migration Challenge:** NextAuth-specific models need redesign for native auth.

### 1.4 State Management Architecture

**Zustand Store (`lib/stores/project-store.ts`):**

```typescript
ProjectState {
  // Core state
  projectId, projectType, messages, projectFiles, activeAgents

  // UI state
  isLoading, error, progress

  // Sandbox state
  sandboxId, sandboxProvider, previewUrl, previewCode

  // Persistence
  localStorage (selective persistence)
}
```

**Benefits:**
- Simple, lightweight state management
- Built-in persistence middleware
- Selector-based optimizations
- Easy to migrate to native store

### 1.5 Agent System Architecture

**154 Agents in `.claude/agents/`:**

```
agents/
├── backend/ (API, database, security specialists)
├── design/ (UI/UX, accessibility, branding)
├── devops/ (CI/CD, deployment, monitoring)
├── frontend/ (React, Vue, Svelte specialists)
├── fullstack/ (Full-stack architects)
├── mobile/ (iOS, Android, React Native)
├── specialized/ (Domain experts: fintech, healthcare, etc.)
└── testing/ (QA, E2E, performance testing)
```

**Agent Registry (`lib/agents/agent-registry.ts`):**
- File-system based agent loading
- Markdown parsing with metadata extraction
- Category and model-tier indexing
- Fast lookup and search capabilities

**Agent Orchestrator (`lib/agents/orchestrator.ts`):**
- Multi-agent parallel execution
- Dependency graph resolution
- Agent-to-agent message bus
- Context sharing strategies (shared/isolated/hierarchical)
- Wave-based execution with configurable parallelism

**Migration Requirement:** File-system access requires Tauri command wrapper.

### 1.6 External Integrations

#### Anthropic API
```typescript
- Model: claude-sonnet-4-20250514, claude-opus-4-20250514
- Streaming: Full SSE support with tool events
- Context: Up to 200K tokens (Sonnet 4)
- Output: 64K max tokens
```

#### Daytona SDK
```typescript
- Purpose: Cloud-based development sandboxes
- Usage: Complex project previews
- Status: Optional (fallback to local sandbox)
```

#### WebContainer API
```typescript
- Purpose: Browser-based Node.js runtime
- Usage: In-browser preview execution
- Limitation: Browser-only (won't work in Tauri)
```

#### Upstash Redis
```typescript
- Purpose: Rate limiting
- Usage: AI request throttling (3 req/min)
- Status: Optional (in-memory fallback)
```

### 1.7 Current Tauri Implementation

**Existing Tauri Backend (`vibing2-desktop/src-tauri/`):**

```rust
Commands (10):
1. greet                 - Test command
2. save_project          - Save to local SQLite
3. load_project          - Load with messages
4. list_projects         - List all projects
5. delete_project        - Remove project
6. save_settings         - Store app settings
7. load_settings         - Retrieve settings
8. check_claude_auth     - Check API key status
9. save_api_key          - Validate & store API key
10. get_credentials      - Retrieve credentials

Database:
- SQLx + SQLite
- Same schema as Prisma (manual sync)
- Local storage in ~/Library/Application Support/

Authentication:
- Local API key storage
- Validation against Anthropic API
- No user accounts (single-user mode)
```

**Current Tauri Limitations:**
1. No AI streaming support (Rust integration needed)
2. No agent registry access
3. No WebContainer support (browser-only)
4. No real-time collaboration
5. Limited to local database

---

## 2. Architectural Options Evaluation

### Option A: SwiftUI + Swift Backend

**Architecture:**
```
UI Layer:        SwiftUI (100% native macOS)
Backend:         Swift + Vapor/Kitura
Database:        Core Data / Realm / SQLite.swift
AI Integration:  URLSession + AsyncStream
Agent System:    Swift Package (agent loading & orchestration)
Sandbox:         WKWebView + JavaScriptCore
```

**Pros:**
- **True Native Performance:** Metal rendering, Core Animation
- **Deep OS Integration:** Shortcuts, Spotlight, iCloud, Handoff
- **Native UI Components:** NSToolbar, NSSplitView, sheets, popovers
- **Memory Efficiency:** ARC memory management
- **App Store Ready:** Full compliance with guidelines
- **Future-Proof:** Aligned with Apple's ecosystem roadmap

**Cons:**
- **Complete Rewrite:** ~16,000 lines TypeScript → Swift
- **Team Ramp-Up:** 4-6 weeks learning curve for web developers
- **Agent System Port:** 154 agents need Swift parser
- **No Code Reuse:** Zero React component reuse
- **Testing Infrastructure:** New test suite from scratch
- **Timeline:** 16-20 weeks for full migration

**Cost-Benefit Analysis:**
- Development Cost: HIGH (4-5 months)
- Maintenance Cost: MEDIUM (new language/ecosystem)
- Performance Gain: HIGH (+40-60% faster)
- Native Integration: EXCELLENT (10/10)
- Risk: HIGH (complete platform shift)

**Verdict:** ⚠️ **Too Risky** - Only consider if targeting iOS/visionOS simultaneously.

---

### Option B: Tauri 2.0 + Native UI Enhancement ✅ RECOMMENDED

**Architecture:**
```
UI Layer:        React 19 + Tailwind (retained)
                 + Native overlays (NSPanel, sheets)
Window Manager:  Tauri native window APIs
Backend:         Rust (Tauri commands)
Database:        SQLx + SQLite (existing)
AI Integration:  Rust async streaming
Agent System:    Rust file I/O + TypeScript logic
Sandbox:         Native WebView (WKWebView on macOS)
IPC:             Tauri invoke system
```

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│                  macOS Application                      │
├─────────────────────────────────────────────────────────┤
│  UI Layer (Web Technologies)                            │
│  ┌────────────────────┐  ┌─────────────────────────┐   │
│  │ React 19 + Zustand │  │ Tailwind CSS            │   │
│  │ Components         │  │ Native window controls  │   │
│  └────────────────────┘  └─────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  IPC Bridge (Tauri Invoke)                              │
├─────────────────────────────────────────────────────────┤
│  Rust Backend Layer                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ AI Streaming │ │ Agent System │ │ Project Manager│  │
│  │ (Anthropic)  │ │ Registry     │ │ (CRUD ops)    │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Auth Manager │ │ File System  │ │ Preview Engine │  │
│  │ (Local keys) │ │ (Native I/O) │ │ (WebView mgmt) │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ SQLite       │ │ File Cache   │ │ Keychain       │  │
│  │ (Projects)   │ │ (Agents)     │ │ (API Keys)     │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  macOS Integration                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Spotlight • Shortcuts • Notification Center      │  │
│  │ iCloud Sync • Touch Bar • Handoff               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- **Code Reuse:** 70-80% frontend code retained
- **Proven Foundation:** Existing Tauri setup working
- **Gradual Enhancement:** Incremental native features
- **Fast Development:** 8-12 weeks vs. 16-20 weeks
- **Team Skills:** Minimal Rust learning curve
- **Agent System:** TypeScript logic kept, Rust file I/O
- **Risk Mitigation:** Fallback to web experience possible

**Cons:**
- **Hybrid Architecture:** Not 100% native experience
- **WebView Overhead:** ~10-15% performance penalty vs. native
- **Bundle Size:** Larger than pure Swift (~80MB vs. ~40MB)
- **UI Limitations:** Some native controls require bridging

**Migration Path:**
1. **Phase 1 (Weeks 1-3):** Enhance Rust backend with AI streaming
2. **Phase 2 (Weeks 4-6):** Migrate API routes to Tauri commands
3. **Phase 3 (Weeks 7-9):** Native window management & OS integration
4. **Phase 4 (Weeks 10-12):** Polish, testing, and optimization

**Cost-Benefit Analysis:**
- Development Cost: MEDIUM (3 months)
- Maintenance Cost: LOW (familiar tech stack)
- Performance Gain: MEDIUM (+20-30% faster)
- Native Integration: GOOD (7/10)
- Risk: LOW (incremental changes)

**Verdict:** ✅ **RECOMMENDED** - Best balance of speed, cost, and risk.

---

### Option C: Rust + egui/iced Native UI

**Architecture:**
```
UI Layer:        egui 0.28 / iced 0.12 (Immediate/Retained mode GUI)
Backend:         Pure Rust
Database:        SQLx + SQLite
AI Integration:  reqwest + async streaming
Agent System:    Rust parser + execution engine
Sandbox:         Embedded WebView (wry)
```

**Pros:**
- **Pure Rust:** Single language, excellent performance
- **Small Binary:** ~20-30MB app bundle
- **Cross-Platform:** Linux, Windows, macOS from same code
- **Memory Safety:** Rust guarantees
- **No WebView:** Reduced attack surface

**Cons:**
- **Complete UI Rewrite:** No React component reuse
- **Limited Ecosystem:** Fewer UI widgets than SwiftUI/React
- **Learning Curve:** Rust ownership model + GUI framework
- **Agent System:** Complex parser implementation in Rust
- **Timeline:** 14-18 weeks
- **Tooling:** Less mature IDE support vs. Swift/TypeScript

**Cost-Benefit Analysis:**
- Development Cost: HIGH (4 months)
- Maintenance Cost: MEDIUM (Rust learning curve)
- Performance Gain: HIGH (+35-50% faster)
- Native Integration: FAIR (5/10 - requires platform code)
- Risk: MEDIUM-HIGH (new paradigm)

**Verdict:** ⚠️ **Not Recommended** - egui/iced not mature enough for complex UIs.

---

### Option D: Electron Alternative (Neutralinojs/NodeGUI)

**Architecture:**
```
UI Layer:        React 19 (retained)
Backend:         Node.js
Framework:       Neutralinojs / NodeGUI
Database:        Better-sqlite3
AI Integration:  Anthropic SDK (unchanged)
```

**Pros:**
- **Minimal Migration:** Keep entire React codebase
- **Fast Timeline:** 4-6 weeks
- **Small Binary:** ~15-20MB (Neutralinojs)
- **Familiar Stack:** No new language learning

**Cons:**
- **Poor macOS Integration:** Limited native APIs
- **Security Concerns:** Node.js runtime exposure
- **Performance:** Similar to Electron overhead
- **Unmaintained Ecosystem:** Neutralinojs less active
- **App Store Issues:** May not meet guidelines

**Cost-Benefit Analysis:**
- Development Cost: LOW (6 weeks)
- Maintenance Cost: HIGH (ecosystem uncertainty)
- Performance Gain: NEGLIGIBLE (0-5%)
- Native Integration: POOR (3/10)
- Risk: MEDIUM (uncertain future)

**Verdict:** ❌ **Rejected** - No significant advantages over Tauri.

---

## 3. Recommended Architecture: Tauri 2.0 Enhanced

### 3.1 Target Architecture Overview

**Core Principles:**
1. **Native-First:** Use native APIs where performance matters
2. **Web-Compatible:** Keep React for complex UI logic
3. **Offline-First:** All data local, cloud sync optional
4. **Performant:** Rust for heavy lifting, TS for UI
5. **Secure:** Keychain for secrets, sandboxed preview

### 3.2 Component-by-Component Migration

#### 3.2.1 UI Layer (React Components)

**Status:** RETAIN with enhancements

```typescript
// Current: 10 React components
components/
├── AgentSelector.tsx       → Keep (add native dropdown binding)
├── ChatMessages.tsx        → Keep (add native scrolling)
├── CodeViewer.tsx          → Keep (add syntax highlighting cache)
├── FileStructurePanel.tsx  → Keep (add native tree view option)
├── FileTree.tsx            → Keep
├── FileUpload.tsx          → Enhance (native file picker)
├── MessageDisplay.tsx      → Keep
├── MultiFileView.tsx       → Keep (optimize rendering)
├── PreviewPanel.tsx        → Enhance (native WebView control)
├── VoiceRecorder.tsx       → Enhance (native audio APIs)

// New Native Overlays
components/native/
├── NativeSettingsPanel.swift   // macOS Settings window
├── NativeAboutBox.swift        // Native about dialog
├── NativeTouchBar.swift        // Touch Bar controls
└── NativeMenuBar.swift         // Menu bar integration
```

**Migration Strategy:**
- Keep all React components initially
- Gradually add native overlays for system dialogs
- Use Tauri events for native → React communication

#### 3.2.2 State Management (Zustand)

**Status:** RETAIN + enhance persistence

```typescript
// Current: Zustand with localStorage
lib/stores/project-store.ts    → Keep
lib/stores/settings-store.ts   → New (native settings)
lib/stores/agent-store.ts      → New (agent state cache)

// Enhancement: Native storage bridge
stores/native-storage.ts {
  // Tauri command wrappers
  async saveState(key: string, value: any): Promise<void> {
    await invoke('save_app_state', { key, value });
  }

  async loadState(key: string): Promise<any> {
    return await invoke('load_app_state', { key });
  }
}
```

**Migration Steps:**
1. Keep existing Zustand stores
2. Replace localStorage with Tauri storage commands
3. Add state compression for large projects
4. Implement state versioning for migrations

#### 3.2.3 API Layer → Tauri Commands

**Critical Migration:** 26 API routes → Rust commands

```rust
// New Tauri commands architecture
src-tauri/src/
├── commands/
│   ├── ai.rs              // AI streaming & agent execution
│   ├── projects.rs        // Project CRUD (existing, enhanced)
│   ├── agents.rs          // Agent registry & orchestration
│   ├── auth.rs            // Authentication (existing, enhanced)
│   ├── collaboration.rs   // Real-time collaboration
│   ├── sandbox.rs         // Preview & execution
│   └── workflows.rs       // Workflow orchestration
├── services/
│   ├── anthropic_client.rs   // Anthropic API client
│   ├── agent_registry.rs     // Agent loading & caching
│   ├── stream_manager.rs     // SSE streaming
│   └── file_manager.rs       // Project file operations
└── models/
    ├── project.rs
    ├── agent.rs
    └── message.rs
```

**Detailed Command Mapping:**

| Current API Route | New Tauri Command | Complexity |
|-------------------|-------------------|------------|
| `/api/agent/stream` | `stream_ai_response` | HIGH |
| `/api/agents/list` | `list_agents` | LOW |
| `/api/agents/auto-select` | `auto_select_agent` | MEDIUM |
| `/api/workflows/execute` | `execute_workflow` | HIGH |
| `/api/projects/save` | `save_project` ✅ | EXISTING |
| `/api/projects/load` | `load_project` ✅ | EXISTING |
| `/api/projects/list` | `list_projects` ✅ | EXISTING |
| `/api/projects/[id]` | `get_project`, `update_project` | LOW |
| `/api/projects/fork` | `fork_project` | MEDIUM |
| `/api/projects/like` | `toggle_like` | LOW |
| `/api/collab/invite` | `send_collaboration_invite` | MEDIUM |
| `/api/collab/respond` | `respond_to_invite` | MEDIUM |
| `/api/collab/members` | `list_collaborators` | LOW |
| `/api/discover` | `discover_projects` | MEDIUM |
| `/api/health/*` | `health_check`, `database_status` | LOW |
| `/api/metrics/*` | `get_metrics`, `track_web_vitals` | LOW |

**AI Streaming Implementation (Rust):**

```rust
// src-tauri/src/commands/ai.rs
use anthropic_sdk::Client;
use tauri::Window;
use tokio_stream::StreamExt;

#[tauri::command]
pub async fn stream_ai_response(
    window: Window,
    messages: Vec<Message>,
    agent_name: Option<String>,
    project_type: String,
) -> Result<(), String> {
    // Load agent from registry
    let agent = if let Some(name) = agent_name {
        AGENT_REGISTRY.get_agent(&name)
            .ok_or("Agent not found")?
    } else {
        // Auto-select based on project type
        auto_select_agent(&project_type)?
    };

    // Build system prompt
    let system_prompt = build_system_prompt(&agent, &project_type);

    // Create Anthropic client
    let client = Client::new(&get_api_key()?);

    // Stream response
    let mut stream = client
        .messages()
        .create_stream(CreateMessageRequest {
            model: "claude-sonnet-4-20250514",
            max_tokens: 64000,
            messages: messages.into_iter().map(|m| m.into()).collect(),
            system: Some(system_prompt),
            stream: true,
        })
        .await
        .map_err(|e| e.to_string())?;

    // Emit events to frontend
    window.emit("ai:progress", json!({
        "type": "progress",
        "status": "starting",
        "message": "🤖 Initializing Claude Agent..."
    })).ok();

    let mut full_response = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;

        match chunk {
            StreamEvent::ContentBlockDelta { delta, .. } => {
                if let ContentBlockDelta::TextDelta { text } = delta {
                    full_response.push_str(&text);

                    // Stream text to frontend
                    window.emit("ai:text", text).ok();
                }
            }
            StreamEvent::MessageStart { message } => {
                window.emit("ai:progress", json!({
                    "type": "progress",
                    "status": "generating",
                    "message": "✍️ Generating response..."
                })).ok();
            }
            StreamEvent::MessageDelta { usage, .. } => {
                // Track token usage
                window.emit("ai:metrics", json!({
                    "tokensUsed": usage.output_tokens,
                })).ok();
            }
            _ => {}
        }
    }

    // Extract file operations
    let file_ops = extract_file_operations(&full_response)?;

    window.emit("ai:file_operations", file_ops).ok();
    window.emit("ai:complete", json!({
        "type": "complete",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    })).ok();

    Ok(())
}
```

#### 3.2.4 Agent System Migration

**Challenge:** File-system based agents need Rust loader

```rust
// src-tauri/src/services/agent_registry.rs
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub name: String,
    pub description: String,
    pub category: String,
    pub model: String, // haiku, sonnet, opus
    pub system_prompt: String,
}

pub struct AgentRegistry {
    agents: HashMap<String, Agent>,
    agents_by_category: HashMap<String, Vec<String>>,
}

impl AgentRegistry {
    pub fn load_from_resources() -> Result<Self, std::io::Error> {
        let mut registry = AgentRegistry {
            agents: HashMap::new(),
            agents_by_category: HashMap::new(),
        };

        // Get agents directory from app resources
        let agents_dir = get_agents_directory()?;

        // Recursively load all .md files
        registry.load_agents_from_dir(&agents_dir)?;

        Ok(registry)
    }

    fn load_agents_from_dir(&mut self, dir: &PathBuf) -> Result<(), std::io::Error> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.load_agents_from_dir(&path)?;
            } else if path.extension() == Some("md".as_ref()) {
                if let Ok(agent) = parse_agent_file(&path) {
                    let name = agent.name.clone();
                    let category = agent.category.clone();

                    self.agents.insert(name.clone(), agent);

                    self.agents_by_category
                        .entry(category)
                        .or_insert_with(Vec::new)
                        .push(name);
                }
            }
        }

        Ok(())
    }

    pub fn get_agent(&self, name: &str) -> Option<&Agent> {
        self.agents.get(name)
    }

    pub fn search_agents(&self, query: &str) -> Vec<&Agent> {
        let query_lower = query.to_lowercase();
        self.agents
            .values()
            .filter(|agent| {
                agent.name.to_lowercase().contains(&query_lower)
                    || agent.description.to_lowercase().contains(&query_lower)
            })
            .collect()
    }
}

// Global registry (lazy static)
use lazy_static::lazy_static;
use std::sync::RwLock;

lazy_static! {
    pub static ref AGENT_REGISTRY: RwLock<AgentRegistry> =
        RwLock::new(AgentRegistry::load_from_resources().unwrap());
}
```

**Agent File Parser (Rust):**

```rust
fn parse_agent_file(path: &PathBuf) -> Result<Agent, std::io::Error> {
    let content = fs::read_to_string(path)?;

    // Parse frontmatter (YAML)
    let (metadata, system_prompt) = parse_markdown_frontmatter(&content)?;

    Ok(Agent {
        name: metadata.get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        description: metadata.get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        category: metadata.get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("general")
            .to_string(),
        model: metadata.get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("sonnet")
            .to_string(),
        system_prompt,
    })
}
```

#### 3.2.5 Database Layer

**Status:** ENHANCE existing SQLite implementation

```rust
// Current: SQLx + SQLite (good foundation)
// Enhancements needed:

1. Add full-text search (FTS5):
   - Search messages by content
   - Search projects by name/description
   - Agent search optimization

2. Add caching layer:
   - In-memory LRU cache for hot projects
   - Agent metadata cache
   - Recent messages cache

3. Database versioning:
   - Migration system for schema changes
   - Backward compatibility checks

4. Optimize indexes:
   - Add composite indexes for common queries
   - Analyze query performance
   - Add EXPLAIN QUERY PLAN logging
```

**Enhanced Schema (SQLite):**

```sql
-- Add full-text search
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=id
);

-- Triggers for FTS sync
CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content)
    VALUES (new.rowid, new.content);
END;

-- Add agent usage tracking
CREATE TABLE agent_usage (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    project_id TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Add performance indexes
CREATE INDEX idx_messages_project_created ON messages(project_id, created_at DESC);
CREATE INDEX idx_projects_user_updated ON projects(user_id, updated_at DESC);
CREATE INDEX idx_agent_usage_name_created ON agent_usage(agent_name, created_at);
```

#### 3.2.6 Preview/Sandbox Layer

**Challenge:** WebContainer won't work in Tauri

**Solution:** Native WebView with custom protocol

```rust
// src-tauri/src/commands/sandbox.rs
use tauri::{Manager, Window};
use std::collections::HashMap;

pub struct SandboxManager {
    sandboxes: HashMap<String, Sandbox>,
}

struct Sandbox {
    id: String,
    files: HashMap<String, String>,
    preview_html: Option<String>,
}

impl SandboxManager {
    pub fn create_sandbox(&mut self, project_name: &str) -> String {
        let sandbox_id = format!("sandbox-{}", uuid::Uuid::new_v4());

        let sandbox = Sandbox {
            id: sandbox_id.clone(),
            files: HashMap::new(),
            preview_html: None,
        };

        self.sandboxes.insert(sandbox_id.clone(), sandbox);
        sandbox_id
    }

    pub fn write_file(&mut self, sandbox_id: &str, path: &str, content: &str)
        -> Result<(), String>
    {
        let sandbox = self.sandboxes.get_mut(sandbox_id)
            .ok_or("Sandbox not found")?;

        sandbox.files.insert(path.to_string(), content.to_string());
        Ok(())
    }

    pub fn generate_preview(&mut self, sandbox_id: &str)
        -> Result<String, String>
    {
        let sandbox = self.sandboxes.get_mut(sandbox_id)
            .ok_or("Sandbox not found")?;

        // Combine all files into single HTML
        let html = combine_files(&sandbox.files)?;
        sandbox.preview_html = Some(html.clone());

        Ok(html)
    }
}

#[tauri::command]
pub async fn create_preview(
    state: tauri::State<'_, SandboxManager>,
    sandbox_id: String,
) -> Result<String, String> {
    let mut manager = state.lock().unwrap();
    manager.generate_preview(&sandbox_id)
}
```

**Frontend Integration:**

```typescript
// components/PreviewPanel.tsx (enhanced)
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export default function PreviewPanel() {
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    // Listen for preview updates from Rust
    const unlisten = listen('preview:update', (event) => {
      setPreviewHtml(event.payload as string);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const refreshPreview = async () => {
    const html = await invoke<string>('generate_preview', {
      sandboxId: currentSandboxId,
    });
    setPreviewHtml(html);
  };

  return (
    <div className="preview-panel">
      <iframe
        srcDoc={previewHtml}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
      />
    </div>
  );
}
```

#### 3.2.7 Authentication Layer

**Migration:** NextAuth → Native Auth

```rust
// src-tauri/src/commands/auth.rs (enhanced)
use keyring::Entry;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    id: String,
    email: String,
    name: String,
    api_key_hash: String, // bcrypt hash
}

// Store API key in macOS Keychain
pub fn store_api_key_securely(api_key: &str) -> Result<(), String> {
    let entry = Entry::new("com.vibing2.desktop", "anthropic_api_key")
        .map_err(|e| e.to_string())?;

    entry.set_password(api_key)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Retrieve from Keychain
pub fn get_api_key_securely() -> Result<String, String> {
    let entry = Entry::new("com.vibing2.desktop", "anthropic_api_key")
        .map_err(|e| e.to_string())?;

    entry.get_password()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_and_store_api_key(api_key: String) -> Result<bool, String> {
    // Validate with Anthropic API
    let is_valid = validate_api_key(&api_key).await?;

    if is_valid {
        // Store in Keychain
        store_api_key_securely(&api_key)?;
        Ok(true)
    } else {
        Err("Invalid API key".to_string())
    }
}
```

**Multi-User Support (Optional Phase 2):**

```rust
// For future cloud sync
pub struct CloudUser {
    id: String,
    email: String,
    auth_token: String, // JWT for cloud API
}

// iCloud-backed sync
pub async fn sync_projects_to_icloud() -> Result<(), String> {
    // Use NSUbiquitousKeyValueStore for lightweight sync
    // Or CloudKit for full project sync
    todo!("Implement iCloud sync")
}
```

#### 3.2.8 Real-time Collaboration

**Current:** Socket.io (web-based)
**Migration:** Native WebSocket + Tauri events

```rust
// src-tauri/src/services/collaboration.rs
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};

pub struct CollaborationService {
    connections: HashMap<String, WebSocketConnection>,
}

impl CollaborationService {
    pub async fn connect_to_room(&mut self, room_id: &str, window: Window)
        -> Result<(), String>
    {
        let ws_url = format!("wss://collab.vibing2.app/room/{}", room_id);

        let (ws_stream, _) = connect_async(ws_url)
            .await
            .map_err(|e| e.to_string())?;

        let (mut write, mut read) = ws_stream.split();

        // Spawn listener task
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                if let Ok(Message::Text(text)) = msg {
                    // Emit to frontend
                    window.emit("collab:message", text).ok();
                }
            }
        });

        Ok(())
    }
}
```

**Simplified Approach:** Drop real-time collaboration in Phase 1, add in Phase 2 with cloud sync.

---

### 3.3 Data Flow Architecture

**Request Flow (AI Streaming):**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Input (React Component)                            │
│    - ChatInput.tsx captures user message                   │
│    - Validates input, checks agent selection               │
└────────────┬────────────────────────────────────────────────┘
             │ invoke('stream_ai_response', {...})
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Tauri Command Handler (Rust)                            │
│    - Receives message + context                            │
│    - Loads agent from registry (cached)                    │
│    - Builds system prompt with PFC meta-prompt             │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP POST (streaming)
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Anthropic API                                            │
│    - Streams SSE chunks                                     │
│    - Returns content deltas + usage metrics                │
└────────────┬────────────────────────────────────────────────┘
             │ Stream events
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Rust Stream Handler                                      │
│    - Parses SSE chunks                                      │
│    - Extracts file operations                               │
│    - Emits Tauri events to frontend                         │
└────────────┬────────────────────────────────────────────────┘
             │ window.emit('ai:text', ...)
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. React Event Listener                                     │
│    - Updates Zustand store                                  │
│    - Re-renders ChatMessages component                      │
│    - Updates PreviewPanel with new code                     │
└─────────────────────────────────────────────────────────────┘
```

**Database Operations:**

```
┌───────────────┐         ┌─────────────────┐
│ React UI      │  invoke │ Tauri Command   │
│ (TypeScript)  │────────▶│ (Rust)          │
└───────────────┘         └────────┬────────┘
                                   │ SQLx query
                                   ▼
                          ┌─────────────────┐
                          │ SQLite Database │
                          │ (Local storage) │
                          └─────────────────┘
```

**File Operations:**

```
┌───────────────┐         ┌─────────────────┐         ┌──────────────┐
│ AI Response   │  emit   │ File Manager    │ write   │ Sandbox      │
│ (code blocks) │────────▶│ (Rust service)  │────────▶│ (in-memory)  │
└───────────────┘         └─────────────────┘         └──────┬───────┘
                                                              │ generate
                                                              ▼
                                                       ┌──────────────┐
                                                       │ Preview HTML │
                                                       │ (WebView)    │
                                                       └──────────────┘
```

---

### 3.4 Native macOS Integrations

#### 3.4.1 Menu Bar & Dock

```swift
// src-tauri/src/native/menu.rs (Tauri 2.0 menu API)
use tauri::menu::{Menu, MenuItem, Submenu};

pub fn create_app_menu(app: &tauri::AppHandle) -> Menu {
    let menu = Menu::new();

    // Vibing2 Menu
    let app_menu = Submenu::new("Vibing2", true);
    app_menu.append(MenuItem::about("Vibing2"));
    app_menu.append(MenuItem::separator());
    app_menu.append(MenuItem::preferences("Preferences..."));
    app_menu.append(MenuItem::separator());
    app_menu.append(MenuItem::hide("Vibing2"));
    app_menu.append(MenuItem::quit("Quit Vibing2"));

    // File Menu
    let file_menu = Submenu::new("File", true);
    file_menu.append(MenuItem::new("New Project", "cmd+n"));
    file_menu.append(MenuItem::new("Open Project...", "cmd+o"));
    file_menu.append(MenuItem::separator());
    file_menu.append(MenuItem::new("Save", "cmd+s"));
    file_menu.append(MenuItem::new("Save As...", "cmd+shift+s"));

    // Edit Menu (standard)
    let edit_menu = Submenu::new("Edit", true);
    edit_menu.append(MenuItem::undo());
    edit_menu.append(MenuItem::redo());
    edit_menu.append(MenuItem::separator());
    edit_menu.append(MenuItem::cut());
    edit_menu.append(MenuItem::copy());
    edit_menu.append(MenuItem::paste());

    // View Menu
    let view_menu = Submenu::new("View", true);
    view_menu.append(MenuItem::new("Toggle Sidebar", "cmd+b"));
    view_menu.append(MenuItem::new("Toggle Preview", "cmd+p"));
    view_menu.append(MenuItem::separator());
    view_menu.append(MenuItem::new("Zoom In", "cmd++"));
    view_menu.append(MenuItem::new("Zoom Out", "cmd+-"));

    // Agents Menu
    let agents_menu = Submenu::new("Agents", true);
    agents_menu.append(MenuItem::new("Browse Agents...", "cmd+shift+a"));
    agents_menu.append(MenuItem::new("Auto-Select Agent", "cmd+k"));

    menu.append(&app_menu);
    menu.append(&file_menu);
    menu.append(&edit_menu);
    menu.append(&view_menu);
    menu.append(&agents_menu);

    menu
}
```

**Dock Integration:**

```rust
#[cfg(target_os = "macos")]
pub fn setup_dock_menu(app: &tauri::AppHandle) {
    use cocoa::appkit::{NSMenu, NSMenuItem};
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;

    unsafe {
        let dock_menu: id = NSMenu::alloc(nil).init();

        // Add "New Project" to dock menu
        let item = NSMenuItem::alloc(nil)
            .initWithTitle_action_keyEquivalent_(
                NSString::alloc(nil).init_str("New Project"),
                sel!(newProject:),
                NSString::alloc(nil).init_str(""),
            );
        dock_menu.addItem_(item);

        // Set dock menu
        let app_delegate: id = msg_send![class!(NSApplication), sharedApplication];
        let _: () = msg_send![app_delegate, setDockMenu: dock_menu];
    }
}
```

#### 3.4.2 Spotlight Integration

```swift
// Spotlight indexing for projects
#[cfg(target_os = "macos")]
use core_spotlight::*;

pub fn index_project_for_spotlight(project: &Project) -> Result<(), String> {
    let searchable_item = CSSearchableItem::new(
        &project.id,
        "com.vibing2.project",
    );

    let attributes = CSSearchableItemAttributeSet::new(
        "com.vibing2.project",
    );
    attributes.set_title(&project.name);
    attributes.set_content_description(&project.description.unwrap_or_default());
    attributes.set_keywords(&[
        &project.project_type,
        "vibing2",
        "ai",
        "project",
    ]);

    searchable_item.set_attribute_set(attributes);

    CSSearchableIndex::default_index()
        .index_searchable_items(&[searchable_item])
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

#### 3.4.3 Touch Bar Support

```rust
#[cfg(target_os = "macos")]
pub fn create_touch_bar(app: &tauri::AppHandle) {
    use cocoa::appkit::{NSTouchBar, NSTouchBarItem};

    // Touch Bar items:
    // - Agent selector (NSPopoverTouchBarItem)
    // - New message button
    // - Voice input button
    // - Regenerate button
    // - Save button

    // Implementation requires Objective-C bridge
    // See: https://developer.apple.com/documentation/appkit/nstouchbar
}
```

#### 3.4.4 Shortcuts Integration

```swift
// App Intents for Shortcuts
import AppIntents

struct CreateProjectIntent: AppIntent {
    static var title: LocalizedStringResource = "Create New Project"
    static var description = IntentDescription("Create a new Vibing2 project")

    @Parameter(title: "Project Type")
    var projectType: ProjectType

    @Parameter(title: "Project Name")
    var projectName: String

    func perform() async throws -> some IntentResult {
        // Call Tauri command to create project
        let projectId = await invoke("create_project", args: [
            "name": projectName,
            "projectType": projectType.rawValue
        ])

        return .result(value: "Created project: \(projectName)")
    }
}

enum ProjectType: String, AppEnum {
    case website = "website"
    case webApp = "webapp"
    case game = "game"
    case animation = "animation"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Project Type")
    static var caseDisplayRepresentations: [ProjectType: DisplayRepresentation] = [
        .website: "Website",
        .webApp: "Web App",
        .game: "Game",
        .animation: "Animation"
    ]
}
```

#### 3.4.5 Notification Center

```rust
use tauri::notification::Notification;

pub fn notify_generation_complete(app: &tauri::AppHandle, project_name: &str) {
    Notification::new(&app.config().tauri.bundle.identifier)
        .title("Generation Complete")
        .body(&format!("Your project '{}' is ready to preview", project_name))
        .icon("app-icon")
        .sound("default")
        .show()
        .ok();
}
```

#### 3.4.6 iCloud Sync (Phase 2)

```rust
#[cfg(target_os = "macos")]
pub mod icloud {
    use std::path::PathBuf;

    pub fn get_ubiquity_container() -> Option<PathBuf> {
        // NSFileManager.default.url(forUbiquityContainerIdentifier:)
        // Requires iCloud entitlement
        todo!("Implement iCloud container access")
    }

    pub async fn sync_project_to_icloud(project_id: &str) -> Result<(), String> {
        // Copy project files to iCloud container
        // Use NSUbiquitousKeyValueStore for metadata
        todo!("Implement project sync")
    }
}
```

---

### 3.5 Performance Optimizations

#### 3.5.1 Caching Strategy

```rust
// src-tauri/src/services/cache.rs
use lru::LruCache;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct CacheManager {
    // Agent metadata cache (hot agents)
    agent_cache: Arc<RwLock<LruCache<String, Agent>>>,

    // Project cache (recent projects)
    project_cache: Arc<RwLock<LruCache<String, ProjectWithMessages>>>,

    // Message cache (current project)
    message_cache: Arc<RwLock<LruCache<String, Vec<Message>>>>,
}

impl CacheManager {
    pub fn new() -> Self {
        Self {
            agent_cache: Arc::new(RwLock::new(LruCache::new(100))),
            project_cache: Arc::new(RwLock::new(LruCache::new(20))),
            message_cache: Arc::new(RwLock::new(LruCache::new(50))),
        }
    }

    pub async fn get_agent(&self, name: &str) -> Option<Agent> {
        let cache = self.agent_cache.read().await;
        cache.peek(name).cloned()
    }

    pub async fn cache_agent(&self, name: String, agent: Agent) {
        let mut cache = self.agent_cache.write().await;
        cache.put(name, agent);
    }
}
```

#### 3.5.2 Database Connection Pooling

```rust
// Already implemented with SQLx, optimize pool size
let pool = SqlitePoolOptions::new()
    .max_connections(10)           // Increase from 5
    .min_connections(2)             // Keep 2 warm
    .acquire_timeout(Duration::from_secs(5))
    .idle_timeout(Duration::from_secs(300))
    .connect(&db_url)
    .await?;
```

#### 3.5.3 Lazy Loading

```typescript
// Frontend: Lazy load heavy components
const CodeViewer = lazy(() => import('./components/CodeViewer'));
const MultiFileView = lazy(() => import('./components/MultiFileView'));
const AgentSelector = lazy(() => import('./components/AgentSelector'));

// Backend: Lazy load agents on first use
lazy_static! {
    static ref AGENT_REGISTRY: RwLock<Option<AgentRegistry>> = RwLock::new(None);
}

pub fn get_agent_registry() -> Arc<RwLock<AgentRegistry>> {
    let mut registry = AGENT_REGISTRY.write().unwrap();
    if registry.is_none() {
        *registry = Some(AgentRegistry::load_from_resources().unwrap());
    }
    // Return Arc to avoid cloning
}
```

#### 3.5.4 Streaming Optimization

```rust
// Use channels for efficient streaming
use tokio::sync::mpsc;

pub async fn stream_ai_response_optimized(
    window: Window,
    messages: Vec<Message>,
) -> Result<(), String> {
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn streaming task
    tokio::spawn(async move {
        let mut stream = create_anthropic_stream(messages).await?;

        while let Some(chunk) = stream.next().await {
            tx.send(chunk).await.ok();
        }
    });

    // Batch events to reduce IPC overhead
    let mut buffer = String::with_capacity(1024);

    while let Some(chunk) = rx.recv().await {
        buffer.push_str(&chunk);

        // Emit in batches of 512 bytes
        if buffer.len() >= 512 {
            window.emit("ai:text", &buffer).ok();
            buffer.clear();
        }
    }

    // Flush remaining
    if !buffer.is_empty() {
        window.emit("ai:text", &buffer).ok();
    }

    Ok(())
}
```

---

### 3.6 Security Architecture

#### 3.6.1 Secure Storage

```rust
// API keys → macOS Keychain
use keyring::Entry;

pub fn store_api_key(api_key: &str) -> Result<(), String> {
    let entry = Entry::new("com.vibing2.desktop", "anthropic_api_key")?;
    entry.set_password(api_key)?;
    Ok(())
}

// Sensitive settings → Encrypted database
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};

pub fn encrypt_setting(value: &str, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::from_slice(key));
    let nonce = Nonce::from_slice(b"unique nonce"); // Generate unique per-value

    cipher.encrypt(nonce, value.as_bytes())
        .map_err(|e| e.to_string())
}
```

#### 3.6.2 Sandbox Isolation

```rust
// Preview iframe sandboxing
pub fn generate_sandboxed_preview(html: &str) -> String {
    format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'self';
                script-src 'unsafe-inline' 'unsafe-eval';
                style-src 'unsafe-inline';
                img-src data: https:;
                connect-src 'none';
            ">
        </head>
        <body>
            {}
        </body>
        </html>
        "#,
        html
    )
}
```

#### 3.6.3 Input Validation

```rust
use validator::{Validate, ValidationError};

#[derive(Debug, Validate)]
pub struct CreateProjectRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,

    #[validate(length(max = 500))]
    pub description: Option<String>,

    #[validate(custom = "validate_project_type")]
    pub project_type: String,
}

fn validate_project_type(project_type: &str) -> Result<(), ValidationError> {
    match project_type {
        "website" | "webapp" | "game" | "animation" => Ok(()),
        _ => Err(ValidationError::new("invalid_project_type"))
    }
}
```

---

## 4. Migration Strategy & Timeline

### 4.1 Phased Approach

#### Phase 1: Core Backend Migration (Weeks 1-4)

**Objective:** Migrate critical API routes to Tauri commands

**Tasks:**
1. **Week 1: AI Streaming Foundation**
   - Implement `stream_ai_response` command in Rust
   - Add Anthropic client with streaming support
   - Create event-based communication with frontend
   - Test streaming with 5 sample agents

2. **Week 2: Agent System**
   - Port agent registry to Rust
   - Implement markdown parser
   - Add agent caching layer
   - Test loading all 154 agents

3. **Week 3: Project Management**
   - Enhance existing Tauri commands
   - Add file operation commands
   - Implement batch save/load
   - Add full-text search

4. **Week 4: Testing & Optimization**
   - Integration tests for all commands
   - Performance profiling
   - Fix memory leaks
   - Optimize database queries

**Deliverables:**
- 15 Tauri commands operational
- AI streaming working end-to-end
- All 154 agents loadable
- 90% API parity with web version

**Risk Mitigation:**
- Keep web version running in parallel
- Feature flags for gradual rollout
- Extensive logging and error handling

---

#### Phase 2: Native UI Enhancements (Weeks 5-8)

**Objective:** Add macOS-specific features and polish

**Tasks:**
1. **Week 5: Window Management**
   - Native window controls
   - Multi-window support (editor + preview)
   - Persistent window state
   - Custom title bar

2. **Week 6: System Integration**
   - Menu bar implementation
   - Dock menu
   - Keyboard shortcuts
   - Notification Center

3. **Week 7: Settings & Preferences**
   - Native settings window
   - Keychain integration
   - Theme system (light/dark/auto)
   - Preference syncing

4. **Week 8: File Management**
   - Native file picker
   - Export projects (ZIP, Git)
   - Import from templates
   - File associations (.vibing project files)

**Deliverables:**
- Native menu bar with full functionality
- System-level integrations working
- Settings panel with Keychain storage
- File import/export operational

---

#### Phase 3: Performance & Polish (Weeks 9-12)

**Objective:** Optimize performance and user experience

**Tasks:**
1. **Week 9: Performance Optimization**
   - Profile and fix bottlenecks
   - Implement lazy loading
   - Add caching layer
   - Database query optimization

2. **Week 10: UI/UX Polish**
   - Animations and transitions
   - Loading states
   - Error handling UI
   - Empty states

3. **Week 11: Advanced Features**
   - Voice input (native audio APIs)
   - Touch Bar support
   - Spotlight indexing
   - Quick Actions

4. **Week 12: Testing & Bug Fixes**
   - End-to-end testing
   - User acceptance testing
   - Performance benchmarking
   - Bug bash week

**Deliverables:**
- 50% performance improvement over web version
- Polished native UI experience
- Advanced macOS features working
- Beta-ready build

---

#### Phase 4 (Optional): Cloud Sync & Collaboration (Weeks 13-16)

**Objective:** Add cloud features for multi-device use

**Tasks:**
1. **Week 13: Cloud Backend**
   - Set up cloud API (Rust + Actix/Axum)
   - Authentication service
   - Project storage (S3/CloudFlare R2)
   - WebSocket server for collaboration

2. **Week 14: iCloud Integration**
   - iCloud Drive sync for projects
   - CloudKit for metadata
   - Conflict resolution
   - Offline-first architecture

3. **Week 15: Collaboration Features**
   - Real-time cursors
   - Live chat
   - Presence indicators
   - Share links

4. **Week 16: Testing & Launch**
   - Stress testing with multiple users
   - Security audit
   - App Store submission
   - Documentation and tutorials

**Deliverables:**
- iCloud sync working
- Real-time collaboration operational
- App Store approved build
- 1.0 launch ready

---

### 4.2 Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|---------|---------------------|
| **Rust learning curve** | MEDIUM | MEDIUM | - Provide Rust training<br>- Pair programming<br>- Code reviews<br>- Start with simple commands |
| **AI streaming complexity** | HIGH | HIGH | - Prototype early (Week 1)<br>- Extensive testing<br>- Fallback to synchronous mode<br>- Monitor Anthropic API changes |
| **Agent system port** | MEDIUM | HIGH | - Reuse TypeScript parser logic<br>- Incremental migration<br>- Automated tests for all agents |
| **Database migration issues** | LOW | MEDIUM | - Keep SQLite schema in sync<br>- Automated migration tests<br>- Backup before migrations |
| **Performance regressions** | MEDIUM | HIGH | - Continuous benchmarking<br>- Performance budgets<br>- Profiling in CI/CD |
| **WebContainer replacement** | HIGH | HIGH | - Build custom sandbox early<br>- Test with complex projects<br>- Consider server-side execution |
| **Native API breaking changes** | LOW | MEDIUM | - Monitor Tauri releases<br>- Pin dependencies<br>- Test on beta macOS versions |
| **Timeline overrun** | MEDIUM | HIGH | - Weekly progress reviews<br>- Adjust scope dynamically<br>- Parallelize independent work |

---

### 4.3 Testing Strategy

#### Unit Tests

```rust
// Rust backend tests
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_agent_registry_loads_all_agents() {
        let registry = AgentRegistry::load_from_resources().unwrap();
        assert_eq!(registry.agents.len(), 154);
    }

    #[tokio::test]
    async fn test_stream_ai_response() {
        let response = stream_ai_response(
            mock_window(),
            vec![Message { role: "user".into(), content: "Test".into() }],
            None,
            "website".into(),
        ).await;

        assert!(response.is_ok());
    }

    #[tokio::test]
    async fn test_save_project_creates_database_entry() {
        let request = SaveProjectRequest {
            project_id: None,
            name: "Test Project".into(),
            project_type: "website".into(),
            active_agents: "[]".into(),
            messages: vec![],
            current_code: None,
        };

        let result = save_project(request).await;
        assert!(result.is_ok());
    }
}
```

```typescript
// Frontend tests (Jest + React Testing Library)
describe('PreviewPanel', () => {
  it('renders preview when code is provided', async () => {
    const { getByTitle } = render(
      <PreviewPanel previewCode="<h1>Test</h1>" />
    );

    const iframe = getByTitle('Preview');
    expect(iframe).toBeInTheDocument();
  });

  it('calls invoke when refresh button is clicked', async () => {
    const mockInvoke = vi.fn();
    vi.mocked(invoke).mockImplementation(mockInvoke);

    const { getByText } = render(<PreviewPanel />);
    fireEvent.click(getByText('Refresh'));

    expect(mockInvoke).toHaveBeenCalledWith('generate_preview', expect.any(Object));
  });
});
```

#### Integration Tests

```rust
// End-to-end command tests
#[tokio::test]
async fn test_full_project_lifecycle() {
    // Create project
    let project_id = save_project(create_test_project()).await.unwrap();

    // Load project
    let loaded = load_project(project_id.clone()).await.unwrap();
    assert_eq!(loaded.name, "Test Project");

    // List projects
    let projects = list_projects().await.unwrap();
    assert!(projects.iter().any(|p| p.id == project_id));

    // Delete project
    delete_project(project_id.clone()).await.unwrap();

    // Verify deletion
    let result = load_project(project_id).await;
    assert!(result.is_err());
}
```

#### Performance Tests

```rust
#[tokio::test]
async fn benchmark_agent_registry_load() {
    let start = std::time::Instant::now();

    let registry = AgentRegistry::load_from_resources().unwrap();

    let duration = start.elapsed();
    assert!(duration.as_millis() < 100, "Agent registry should load in <100ms");
    assert_eq!(registry.agents.len(), 154);
}

#[tokio::test]
async fn benchmark_project_save() {
    let project = create_large_test_project(1000); // 1000 messages

    let start = std::time::Instant::now();
    save_project(project).await.unwrap();
    let duration = start.elapsed();

    assert!(duration.as_millis() < 500, "Large project save should be <500ms");
}
```

#### Playwright E2E Tests

```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test';

test('creates new project and generates code', async ({ page }) => {
  await page.goto('tauri://localhost');

  // Select project type
  await page.click('text=Website');
  await page.click('button:has-text("Continue")');

  // Enter prompt
  await page.fill('[placeholder="Describe what you want to build"]',
    'Create a landing page for a SaaS product');

  // Submit
  await page.click('button:has-text("Generate")');

  // Wait for streaming to complete
  await page.waitForSelector('text=Generation Complete', { timeout: 60000 });

  // Verify preview is visible
  const iframe = page.frameLocator('iframe[title="Preview"]');
  await expect(iframe.locator('body')).toBeVisible();

  // Verify project is saved
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=Project saved')).toBeVisible();
});
```

---

### 4.4 Performance Benchmarks

**Target Metrics:**

| Metric | Web Version | Native Target | Improvement |
|--------|-------------|---------------|-------------|
| **Cold Start** | 2.5s | <1.0s | 60% faster |
| **Agent Registry Load** | 350ms | <100ms | 71% faster |
| **Project Load (1000 msgs)** | 1200ms | <400ms | 67% faster |
| **Message Rendering** | 60 FPS | 120 FPS | 2x smoother |
| **Memory Usage (idle)** | 300MB | <150MB | 50% reduction |
| **AI Streaming Latency** | 200ms | <100ms | 50% faster |
| **Bundle Size** | 120MB (Electron) | 80MB (Tauri) | 33% smaller |

**Measurement Tools:**
- Rust: `criterion` for micro-benchmarks
- Frontend: Lighthouse + React DevTools Profiler
- Memory: Instruments.app (macOS)
- Network: Anthropic API latency monitoring

---

## 5. Code Migration Examples

### 5.1 API Route → Tauri Command

**Before (Next.js API Route):**

```typescript
// app/api/agents/list/route.ts
import { NextResponse } from 'next/server';
import { getAgentRegistry } from '@/lib/agents/agent-registry';

export async function GET() {
  try {
    const registry = await getAgentRegistry();
    const agents = registry.getAllAgents();

    return NextResponse.json({
      success: true,
      agents: agents.map(a => ({
        name: a.metadata.name,
        description: a.metadata.description,
        category: a.metadata.category,
        model: a.metadata.model,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**After (Tauri Command):**

```rust
// src-tauri/src/commands/agents.rs
use crate::services::agent_registry::{AGENT_REGISTRY, AgentMetadata};

#[derive(Debug, Serialize)]
pub struct AgentInfo {
    name: String,
    description: String,
    category: String,
    model: String,
}

#[tauri::command]
pub async fn list_agents() -> Result<Vec<AgentInfo>, String> {
    let registry = AGENT_REGISTRY.read()
        .map_err(|e| format!("Failed to read registry: {}", e))?;

    let agents = registry.get_all_agents()
        .iter()
        .map(|agent| AgentInfo {
            name: agent.name.clone(),
            description: agent.description.clone(),
            category: agent.category.clone(),
            model: agent.model.clone(),
        })
        .collect();

    Ok(agents)
}
```

**Frontend Update:**

```typescript
// Before
const response = await fetch('/api/agents/list');
const data = await response.json();
const agents = data.agents;

// After
import { invoke } from '@tauri-apps/api/core';
const agents = await invoke<AgentInfo[]>('list_agents');
```

---

### 5.2 Zustand Store → Native Storage

**Before (localStorage persistence):**

```typescript
// lib/stores/project-store.ts
export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projectId: null,
      messages: [],
      // ...
    }),
    {
      name: 'project-storage', // localStorage key
    }
  )
);
```

**After (Tauri storage):**

```typescript
// lib/stores/project-store.ts
import { invoke } from '@tauri-apps/api/core';

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  messages: [],

  // Load from native storage on init
  async hydrate() {
    const state = await invoke<Partial<ProjectState>>('load_app_state', {
      key: 'project-storage',
    });
    set(state);
  },

  // Save to native storage on change
  async persist() {
    const state = get();
    await invoke('save_app_state', {
      key: 'project-storage',
      value: {
        projectId: state.projectId,
        messages: state.messages,
        // ... only save what's needed
      },
    });
  },
}));

// Auto-save on state changes
useProjectStore.subscribe((state) => {
  state.persist();
});
```

**Rust Implementation:**

```rust
// src-tauri/src/commands/storage.rs
use serde_json::Value;
use std::fs;

#[tauri::command]
pub async fn save_app_state(key: String, value: Value) -> Result<(), String> {
    let state_dir = get_app_state_dir()?;
    let file_path = state_dir.join(format!("{}.json", key));

    let json = serde_json::to_string_pretty(&value)
        .map_err(|e| e.to_string())?;

    fs::write(file_path, json)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn load_app_state(key: String) -> Result<Value, String> {
    let state_dir = get_app_state_dir()?;
    let file_path = state_dir.join(format!("{}.json", key));

    if !file_path.exists() {
        return Ok(Value::Null);
    }

    let json = fs::read_to_string(file_path)
        .map_err(|e| e.to_string())?;

    serde_json::from_str(&json)
        .map_err(|e| e.to_string())
}

fn get_app_state_dir() -> Result<PathBuf, String> {
    dirs::data_local_dir()
        .ok_or("Failed to get local data dir")?
        .join("com.vibing2.desktop")
        .join("state")
}
```

---

### 5.3 WebContainer → Native WebView

**Before (WebContainer API):**

```typescript
// lib/webcontainer-client.ts
import { WebContainer } from '@webcontainer/api';

export async function createPreview(code: string): Promise<string> {
  const container = await WebContainer.boot();

  await container.fs.writeFile('index.html', code);

  const process = await container.spawn('npx', ['serve', '.']);

  const url = await new Promise<string>((resolve) => {
    process.output.pipeTo(new WritableStream({
      write(data) {
        const match = data.match(/http:\/\/localhost:\d+/);
        if (match) resolve(match[0]);
      },
    }));
  });

  return url;
}
```

**After (Native WebView):**

```rust
// src-tauri/src/commands/sandbox.rs
use tauri::Window;

#[tauri::command]
pub async fn create_preview(
    window: Window,
    sandbox_id: String,
) -> Result<(), String> {
    let manager = SANDBOX_MANAGER.lock().unwrap();
    let preview_html = manager.generate_preview(&sandbox_id)?;

    // Emit preview HTML to frontend
    window.emit("preview:ready", preview_html)
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

**Frontend:**

```typescript
// components/PreviewPanel.tsx
import { listen } from '@tauri-apps/api/event';

export default function PreviewPanel() {
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const unlisten = listen<string>('preview:ready', (event) => {
      setPreviewHtml(event.payload);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <iframe
      srcDoc={previewHtml}
      sandbox="allow-scripts"
      className="preview-iframe"
    />
  );
}
```

---

## 6. Deployment & Distribution

### 6.1 Build Configuration

**Tauri Configuration (`tauri.conf.json`):**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Vibing2",
  "version": "1.0.0",
  "identifier": "com.vibing2.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev:next",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "Vibing2",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "trafficLightPosition": {
          "x": 16,
          "y": 20
        }
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
      "dangerousRemoteDomainIpcAccess": []
    },
    "macOS": {
      "minimumSystemVersion": "11.0",
      "exceptionDomain": "anthropic.com"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": [
      "icons/icon_32x32.png",
      "icons/icon_128x128.png",
      "icons/icon_256x256.png",
      "icons/icon.png"
    ],
    "publisher": "Vibing2 Inc.",
    "copyright": "Copyright © 2025 Vibing2. All rights reserved.",
    "category": "DeveloperTool",
    "shortDescription": "AI-Powered Development Platform",
    "longDescription": "Build web applications with 154 specialized AI agents, 70% cost savings through PFC, and 100% local data storage.",
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "11.0",
      "signingIdentity": "Developer ID Application: Vibing2 Inc.",
      "providerShortName": "XXXXXXXXXX",
      "entitlements": "entitlements.plist",
      "hardenedRuntime": true
    }
  },
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.vibing2.app/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 6.2 Code Signing & Notarization

**Entitlements (`entitlements.plist`):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
```

**Build Script (`scripts/build-release.sh`):**

```bash
#!/bin/bash
set -e

echo "🏗️  Building Vibing2 for macOS..."

# Clean previous builds
rm -rf src-tauri/target/release
rm -rf out/

# Build frontend
echo "📦 Building frontend..."
BUILD_MODE=desktop pnpm build

# Build Tauri app
echo "🦀 Building Rust backend..."
cd src-tauri
cargo build --release
cd ..

# Sign app
echo "✍️  Signing application..."
codesign --force --deep --sign "Developer ID Application: Vibing2 Inc." \
  "src-tauri/target/release/bundle/macos/Vibing2.app"

# Create DMG
echo "📀 Creating DMG..."
create-dmg \
  --volname "Vibing2" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "Vibing2.app" 200 190 \
  --hide-extension "Vibing2.app" \
  --app-drop-link 600 185 \
  "Vibing2.dmg" \
  "src-tauri/target/release/bundle/macos/Vibing2.app"

# Notarize
echo "📝 Submitting for notarization..."
xcrun notarytool submit Vibing2.dmg \
  --apple-id "your-apple-id@example.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# Staple ticket
echo "📎 Stapling notarization ticket..."
xcrun stapler staple Vibing2.dmg

echo "✅ Build complete: Vibing2.dmg"
```

### 6.3 Auto-Updates

**Update Server (Rust + Axum):**

```rust
// update-server/src/main.rs
use axum::{Router, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct UpdateResponse {
    version: String,
    notes: String,
    pub_date: String,
    url: String,
    signature: String,
}

async fn check_update(platform: String, current_version: String)
    -> Json<Option<UpdateResponse>>
{
    // Check if newer version available
    if has_update(&current_version) {
        Json(Some(UpdateResponse {
            version: "1.1.0".into(),
            notes: "New features: ...",
            pub_date: "2025-11-01T00:00:00Z".into(),
            url: "https://releases.vibing2.app/Vibing2-1.1.0.dmg".into(),
            signature: "BASE64_SIGNATURE".into(),
        }))
    } else {
        Json(None)
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/update/:platform/:version", get(check_update));

    axum::Server::bind(&"0.0.0.0:3001".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### 6.4 App Store Distribution (Optional)

**Considerations:**
- Requires **sandboxing** (more restrictive entitlements)
- Cannot use **Keychain** for API keys (must use CloudKit)
- Must use **App Sandbox** container for file storage
- **In-App Purchase** for Pro features
- Longer review process (1-2 weeks)

**Verdict:** Recommend **direct distribution** initially, App Store in Phase 2.

---

## 7. Success Metrics

### 7.1 Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cold start time** | <1.0s | Time from launch to window visible |
| **Time to first AI response** | <2.0s | From submit to first token |
| **Memory usage (idle)** | <150MB | Instruments.app |
| **Memory usage (active)** | <500MB | With 10 projects open |
| **Database query latency (P95)** | <50ms | SQLx logs |
| **Agent registry load** | <100ms | Rust benchmarks |
| **Bundle size** | <80MB | DMG file size |
| **Crash rate** | <0.1% | Sentry/Crashlytics |

### 7.2 User Experience KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User satisfaction (NPS)** | >40 | In-app survey |
| **Task completion rate** | >90% | Analytics |
| **Time to first project** | <5 min | Onboarding funnel |
| **Daily active users (DAU)** | 1000+ | Analytics |
| **Retention (Day 7)** | >40% | Cohort analysis |
| **Average session duration** | >15 min | Analytics |

### 7.3 Business KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Conversion rate (Free → Pro)** | >5% | Stripe |
| **Monthly recurring revenue (MRR)** | $10K+ | Stripe |
| **Customer acquisition cost (CAC)** | <$50 | Marketing spend / signups |
| **Churn rate** | <5%/mo | Subscription cancellations |
| **App Store rating** | >4.5 ⭐ | App Store Connect |

---

## 8. Open Questions & Future Considerations

### 8.1 Technical Decisions

1. **iOS Version?**
   - **Question:** Should we build an iOS companion app?
   - **Consideration:** Shared Rust backend, SwiftUI frontend
   - **Timeline:** 8-10 weeks after macOS 1.0
   - **Decision:** Phase 3 (post-launch)

2. **visionOS Support?**
   - **Question:** Native visionOS app for spatial computing?
   - **Consideration:** Unique UX opportunities (3D code visualization)
   - **Timeline:** 12-16 weeks (experimental)
   - **Decision:** Exploratory (2026)

3. **Local LLM Support?**
   - **Question:** Integrate with local models (Ollama, LM Studio)?
   - **Consideration:** Privacy, offline mode, but slower
   - **Timeline:** 4-6 weeks
   - **Decision:** Phase 2 feature

4. **Multi-Language Agent Support?**
   - **Question:** Support agents in languages other than English?
   - **Consideration:** i18n for system prompts, UI translation
   - **Timeline:** 6-8 weeks
   - **Decision:** Phase 3 (demand-driven)

### 8.2 Product Strategy

1. **Pricing Model**
   - **Free Tier:** 10K tokens/month, 5 projects, basic agents
   - **Pro Tier ($19/mo):** 100K tokens/month, unlimited projects, all agents
   - **Team Tier ($49/mo):** 500K tokens/month, collaboration, priority support
   - **Enterprise:** Custom pricing, on-prem deployment, SSO

2. **Competitive Positioning**
   - **vs. Cursor:** More affordable, multi-agent orchestration
   - **vs. Bolt.new:** Native performance, offline mode
   - **vs. v0.dev:** Local data, no cloud dependency
   - **vs. Replit:** Faster, agent specialization

3. **Go-to-Market Strategy**
   - **Launch:** Product Hunt, Hacker News, Reddit (r/MacApps)
   - **Content:** YouTube tutorials, blog posts, X threads
   - **Community:** Discord server, GitHub discussions
   - **Partnerships:** AI influencers, developer advocates

### 8.3 Risks & Contingencies

1. **Anthropic API Changes**
   - **Risk:** Breaking changes, pricing increases
   - **Mitigation:** Support multiple providers (OpenAI, Gemini)
   - **Timeline:** 2-3 weeks to add provider

2. **Apple API Deprecations**
   - **Risk:** macOS updates break native integrations
   - **Mitigation:** Test on beta releases, maintain fallbacks
   - **Timeline:** Ongoing maintenance

3. **Tauri Ecosystem Maturity**
   - **Risk:** Bugs, missing features in Tauri 2.0
   - **Mitigation:** Contribute patches, maintain fork if needed
   - **Timeline:** N/A (low probability)

---

## 9. Conclusion & Recommendation

### 9.1 Summary of Analysis

After comprehensive evaluation of Vibing2's current architecture and four potential migration paths, **Option B: Tauri 2.0 + Native UI Enhancement** emerges as the clear winner.

**Key Reasons:**
1. **Proven Foundation:** Existing Tauri implementation reduces risk
2. **Code Reuse:** 70-80% of React codebase retained
3. **Faster Timeline:** 12 weeks vs. 16-20 weeks for full rewrite
4. **Lower Risk:** Incremental enhancement vs. big-bang migration
5. **Team Alignment:** Minimal new skills required (Rust basics)
6. **Performance Gains:** 20-30% improvement with 50% less effort

### 9.2 Final Recommendation

**Proceed with Option B: Tauri 2.0 Enhanced Native macOS App**

**Phase 1 Start:** Week of 2025-10-20
**Phase 1 Target Completion:** 2025-12-15 (12 weeks)
**Beta Launch:** 2026-01-01
**Public 1.0 Launch:** 2026-02-01

**Team Composition:**
- 2 Rust developers (backend + IPC)
- 2 React developers (frontend + UI polish)
- 1 DevOps engineer (CI/CD + release automation)
- 1 QA engineer (testing + performance)
- 1 Product designer (macOS UI/UX)

**Budget Estimate:**
- Development: $120K (12 weeks × $10K/week)
- Infrastructure: $2K (testing devices, CI/CD)
- Code signing: $99/year (Apple Developer)
- Miscellaneous: $5K (tools, licenses)
- **Total:** ~$127K

**Expected ROI:**
- Year 1 MRR: $240K ($20K/month × 12)
- Customer LTV: $500 (avg. 26 months × $19)
- Break-even: Month 5-6
- Year 1 Profit: ~$100K

### 9.3 Next Steps

1. **Immediate (Week 1):**
   - Form migration team
   - Set up Rust development environment
   - Create detailed Sprint 1 backlog
   - Kick-off meeting with stakeholders

2. **Short-term (Weeks 2-4):**
   - Implement AI streaming in Rust
   - Migrate agent registry
   - Set up CI/CD pipeline
   - Begin integration testing

3. **Medium-term (Weeks 5-12):**
   - Complete Phase 1 migration
   - Native UI enhancements
   - Performance optimization
   - Beta testing program

4. **Long-term (Post-launch):**
   - Monitor metrics and iterate
   - Plan Phase 2 (cloud sync)
   - Explore iOS/visionOS
   - Scale infrastructure

---

## Appendix A: Technology Stack Comparison

| Layer | Web Version | Native Version | Change Type |
|-------|-------------|----------------|-------------|
| **UI Framework** | React 19 + Next.js 15 | React 19 (retained) | KEEP |
| **State Management** | Zustand | Zustand + Tauri storage | ENHANCE |
| **Styling** | Tailwind CSS 4 | Tailwind CSS 4 | KEEP |
| **Backend Runtime** | Node.js | Rust (Tauri) | REPLACE |
| **API Layer** | Next.js API Routes | Tauri Commands | MIGRATE |
| **Database** | PostgreSQL (prod) / SQLite (dev) | SQLite only | SIMPLIFY |
| **ORM** | Prisma | SQLx | REPLACE |
| **Authentication** | NextAuth | Native + Keychain | REPLACE |
| **Real-time** | Socket.io | Tauri Events | REPLACE |
| **AI Client** | Anthropic SDK (TS) | Custom Rust client | IMPLEMENT |
| **Sandbox** | WebContainer | Native WebView | REPLACE |
| **File System** | Node.js fs | Rust std::fs | REPLACE |
| **Caching** | Redis (optional) | LRU in-memory | REPLACE |
| **Logging** | Pino | tracing-subscriber | REPLACE |
| **Testing** | Jest + Playwright | Rust tests + Playwright | ENHANCE |
| **Build** | Webpack/Turbopack | Cargo + Tauri CLI | REPLACE |
| **Distribution** | Vercel/Docker | DMG installer | REPLACE |

---

## Appendix B: File Structure (Post-Migration)

```
vibing2-native/
├── src/                           # React frontend (unchanged)
│   ├── components/
│   ├── lib/
│   ├── app/
│   └── public/
├── src-tauri/                     # Rust backend (enhanced)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/              # Tauri commands
│   │   │   ├── ai.rs
│   │   │   ├── agents.rs
│   │   │   ├── projects.rs
│   │   │   ├── auth.rs
│   │   │   ├── sandbox.rs
│   │   │   └── workflows.rs
│   │   ├── services/              # Business logic
│   │   │   ├── anthropic_client.rs
│   │   │   ├── agent_registry.rs
│   │   │   ├── stream_manager.rs
│   │   │   ├── file_manager.rs
│   │   │   └── cache_manager.rs
│   │   ├── models/                # Data models
│   │   │   ├── project.rs
│   │   │   ├── agent.rs
│   │   │   ├── message.rs
│   │   │   └── user.rs
│   │   ├── database/              # Database layer
│   │   │   ├── schema.rs
│   │   │   ├── migrations.rs
│   │   │   └── queries.rs
│   │   └── native/                # macOS integrations
│   │       ├── menu.rs
│   │       ├── notifications.rs
│   │       └── spotlight.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── .claude/                       # Agent definitions (unchanged)
│   └── agents/
│       ├── backend/
│       ├── frontend/
│       ├── design/
│       └── ...
├── scripts/                       # Build & release scripts
│   ├── build-release.sh
│   ├── notarize.sh
│   └── create-dmg.sh
├── tests/                         # E2E tests
│   └── e2e/
│       ├── create-project.spec.ts
│       ├── agent-selection.spec.ts
│       └── collaboration.spec.ts
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## Appendix C: Rust Dependencies

```toml
# src-tauri/Cargo.toml
[package]
name = "vibing2"
version = "1.0.0"
edition = "2021"

[dependencies]
# Tauri
tauri = { version = "2.0", features = ["macos-private-api"] }
tauri-plugin-shell = "2.0"
tauri-plugin-dialog = "2.0"
tauri-plugin-fs = "2.0"

# Async runtime
tokio = { version = "1.40", features = ["full"] }
tokio-stream = "0.1"

# Database
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio-rustls"] }

# HTTP client
reqwest = { version = "0.12", features = ["json", "stream"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Caching
lru = "0.12"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Security
keyring = "3.2"
bcrypt = "0.16"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.10", features = ["v4", "serde"] }
lazy_static = "1.5"

# Testing
[dev-dependencies]
tempfile = "3.12"
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|---------|---------|
| 1.0 | 2025-10-13 | Architecture Team | Initial comprehensive analysis |

---

**End of Document**

For questions or clarifications, contact: architecture@vibing2.app
