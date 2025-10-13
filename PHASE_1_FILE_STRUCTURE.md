# Phase 1: Native macOS Implementation File Structure

**Complete directory structure for the 12-week implementation**

---

## Overview

This document provides the complete file structure for the native macOS implementation of Vibing2. All files are organized by module and phase of implementation.

---

## Root Directory Structure

```
vibing2/
├── src-tauri/                    # Rust backend (Tauri)
├── src/                          # React frontend (existing)
├── .claude/                      # Agent definitions
├── prisma/                       # Database schema (legacy)
├── migrations/                   # SQLite migrations (new)
├── scripts/                      # Build and migration scripts
├── docs/                         # Documentation
└── tests/                        # Integration tests
```

---

## Complete Rust Backend Structure

```
src-tauri/
│
├── Cargo.toml                    # Dependencies and configuration
├── Cargo.lock                    # Dependency lock file
├── build.rs                      # Build script
├── tauri.conf.json              # Tauri configuration
│
├── src/
│   ├── main.rs                  # Application entry point
│   ├── lib.rs                   # Library root
│   │
│   ├── commands/                # Tauri IPC command handlers
│   │   ├── mod.rs
│   │   ├── stream.rs           # AI streaming commands
│   │   ├── project.rs          # Project CRUD commands
│   │   ├── agent.rs            # Agent management commands
│   │   ├── auth.rs             # Authentication commands
│   │   └── health.rs           # Health check commands
│   │
│   ├── core/                    # Core business logic
│   │   ├── mod.rs
│   │   │
│   │   ├── anthropic/          # Anthropic API client
│   │   │   ├── mod.rs
│   │   │   ├── client.rs       # HTTP client
│   │   │   ├── streaming.rs   # SSE streaming
│   │   │   ├── models.rs       # Request/response types
│   │   │   └── error.rs        # Anthropic-specific errors
│   │   │
│   │   ├── agents/             # Agent system
│   │   │   ├── mod.rs
│   │   │   ├── registry.rs     # Agent registry
│   │   │   ├── parser.rs       # Markdown parser
│   │   │   ├── router.rs       # Agent routing logic
│   │   │   └── error.rs        # Agent-specific errors
│   │   │
│   │   ├── database/           # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── pool.rs         # Connection pool
│   │   │   ├── migrations.rs  # Migration runner
│   │   │   ├── models.rs       # Data models
│   │   │   ├── queries.rs      # Query builders
│   │   │   └── error.rs        # Database errors
│   │   │
│   │   └── files/              # File operations
│   │       ├── mod.rs
│   │       ├── manager.rs      # File manager
│   │       └── validation.rs  # File validation
│   │
│   ├── state/                   # Application state
│   │   ├── mod.rs
│   │   ├── app_state.rs        # Global app state
│   │   ├── session.rs          # Session management
│   │   ├── cache.rs            # Query cache
│   │   └── metrics.rs          # Metrics collector
│   │
│   ├── utils/                   # Utilities
│   │   ├── mod.rs
│   │   ├── keychain.rs         # macOS Keychain integration
│   │   ├── auth.rs             # Auth helpers
│   │   └── logger.rs           # Logging setup
│   │
│   ├── types/                   # Shared types
│   │   ├── mod.rs
│   │   ├── error.rs            # Error types
│   │   ├── config.rs           # Configuration types
│   │   └── events.rs           # Event types
│   │
│   └── tests/                   # Unit tests
│       ├── mod.rs
│       ├── stream_tests.rs
│       ├── agent_tests.rs
│       └── db_tests.rs
│
├── migrations/                   # SQLite migrations
│   ├── 001_initial.sql
│   ├── 002_add_indexes.sql
│   └── 003_add_fts.sql
│
├── benches/                      # Performance benchmarks
│   ├── stream_benchmark.rs
│   ├── db_benchmark.rs
│   └── agent_benchmark.rs
│
├── icons/                        # Application icons
│   ├── icon.icns              # macOS icon
│   ├── icon.png
│   └── ...
│
└── target/                       # Build output (gitignored)
    ├── debug/
    └── release/
```

---

## Detailed Module Breakdown

### Week 1: Core Infrastructure

```
src-tauri/src/
├── main.rs                      # ✅ Entry point with Tauri setup
├── lib.rs                       # ✅ Public API exports
│
├── types/
│   ├── mod.rs                   # ✅ Module exports
│   ├── error.rs                 # ✅ AppError, AppResult
│   ├── config.rs                # ✅ AppConfig
│   └── events.rs                # ✅ Event types
│
├── state/
│   ├── mod.rs                   # ✅ Module exports
│   ├── app_state.rs             # ✅ Global AppState
│   └── metrics.rs               # ✅ MetricsCollector
│
└── utils/
    ├── mod.rs                   # ✅ Module exports
    ├── keychain.rs              # ✅ Keychain access
    └── logger.rs                # ✅ Logging setup
```

**Files to Create:**
- `src/main.rs` (main entry point)
- `src/lib.rs` (library root)
- `src/types/error.rs` (error handling)
- `src/types/config.rs` (configuration)
- `src/state/app_state.rs` (application state)
- `src/utils/keychain.rs` (Keychain integration)

---

### Week 2: Anthropic API & Streaming

```
src-tauri/src/core/anthropic/
├── mod.rs                       # ✅ Public API
├── client.rs                    # ✅ HTTP client with retry
├── streaming.rs                 # ✅ SSE parser
├── models.rs                    # ✅ Request/response types
└── error.rs                     # ✅ Anthropic errors

src-tauri/src/commands/
├── mod.rs                       # ✅ Command exports
└── stream.rs                    # ✅ stream_ai_response, stop_stream
```

**Files to Create:**
- `src/core/anthropic/client.rs` (Anthropic client)
- `src/core/anthropic/models.rs` (data models)
- `src/commands/stream.rs` (streaming commands)

---

### Week 3: Agent System

```
src-tauri/src/core/agents/
├── mod.rs                       # ✅ Public API
├── registry.rs                  # ✅ Agent registry (HashMap)
├── parser.rs                    # ✅ Markdown + YAML parser
├── router.rs                    # ✅ Auto-selection logic
└── error.rs                     # ✅ Agent errors

src-tauri/src/commands/
└── agent.rs                     # ✅ list_agents, search_agents, etc.
```

**Files to Create:**
- `src/core/agents/registry.rs` (agent registry)
- `src/core/agents/parser.rs` (markdown parser)
- `src/commands/agent.rs` (agent commands)

---

### Week 4: Database Architecture

```
src-tauri/src/core/database/
├── mod.rs                       # ✅ Public API
├── pool.rs                      # ✅ Connection pool
├── models.rs                    # ✅ Data models
├── queries.rs                   # ✅ Query builders
└── error.rs                     # ✅ Database errors

migrations/
├── 001_initial.sql              # ✅ Initial schema
├── 002_add_indexes.sql          # ✅ Performance indexes
└── 003_add_fts.sql              # ✅ Full-text search
```

**Files to Create:**
- `src/core/database/pool.rs` (connection pool)
- `src/core/database/queries.rs` (CRUD operations)
- `migrations/001_initial.sql` (schema)

---

### Week 5: State Management & Caching

```
src-tauri/src/state/
├── mod.rs                       # ✅ Exports
├── app_state.rs                 # ✅ Updated with cache
├── session.rs                   # ✅ Session management
├── cache.rs                     # ✅ LRU cache
└── metrics.rs                   # ✅ Metrics collector
```

**Files to Create:**
- `src/state/cache.rs` (query cache)
- `src/state/session.rs` (session management)
- Update `src/state/app_state.rs` (integrate cache)

---

### Week 6: Project CRUD Operations

```
src-tauri/src/commands/
├── mod.rs                       # ✅ Updated exports
├── project.rs                   # ✅ CRUD commands
└── file.rs                      # ✅ File operations

src-tauri/src/core/database/
└── queries.rs                   # ✅ Project queries
```

**Files to Create:**
- `src/commands/project.rs` (project commands)
- `src/commands/file.rs` (file commands)
- Update `src/core/database/queries.rs` (queries)

---

### Week 7-9: Native UI Integration

```
src-tauri/
├── tauri.conf.json              # ✅ Menu bar config
└── src/
    ├── menu.rs                  # ✅ Menu bar setup
    └── commands/
        ├── settings.rs          # ✅ Settings commands
        └── file_picker.rs       # ✅ File picker commands
```

**Files to Create:**
- `src/menu.rs` (native menu bar)
- `src/commands/settings.rs` (settings management)
- `src/commands/file_picker.rs` (file operations)

---

### Week 10-12: Testing & Release

```
src-tauri/
├── tests/                       # Integration tests
│   ├── integration_test.rs
│   ├── stream_test.rs
│   └── db_test.rs
│
├── benches/                     # Performance benchmarks
│   ├── stream_benchmark.rs
│   └── db_benchmark.rs
│
└── scripts/
    ├── build.sh                 # Build script
    ├── test.sh                  # Test runner
    └── release.sh               # Release script
```

**Files to Create:**
- `tests/integration_test.rs` (integration tests)
- `benches/stream_benchmark.rs` (benchmarks)
- `scripts/build.sh` (build automation)

---

## React Frontend Structure (Preserved)

```
src/
├── app/                         # Next.js App Router
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout
│   ├── dashboard/
│   │   └── page.tsx           # Dashboard
│   ├── create/
│   │   └── page.tsx           # Create page
│   └── auth/
│       ├── signin/page.tsx
│       └── signup/page.tsx
│
├── components/                  # React components
│   ├── FileTree.tsx
│   ├── CodeViewer.tsx
│   ├── PreviewPanel.tsx
│   ├── ChatMessages.tsx
│   └── ...
│
├── lib/                         # Utilities
│   ├── tauri.ts               # Tauri IPC helpers
│   ├── hooks.ts               # React hooks
│   └── utils.ts               # Utilities
│
└── styles/
    └── globals.css            # Global styles
```

**Integration Points:**
- `lib/tauri.ts` - Tauri command wrappers
- All API calls replaced with Tauri IPC
- Event listeners for streaming

---

## Agent Definitions Structure

```
.claude/agents/agents/
├── architecture/
│   ├── software-architect.md
│   ├── system-designer.md
│   └── ...
│
├── development/
│   ├── fullstack-developer.md
│   ├── frontend-developer.md
│   ├── backend-developer.md
│   └── ...
│
├── testing/
│   ├── qa-engineer.md
│   ├── test-automation.md
│   └── ...
│
└── specialized/
    ├── database-architect.md
    ├── devops-engineer.md
    └── ...
```

**Total Agents:** 84 markdown files

---

## Migration Files

```
migrations/
├── 001_initial.sql              # Users, Projects, Files, Messages
├── 002_add_indexes.sql          # Performance indexes
├── 003_add_fts.sql              # Full-text search
└── README.md                    # Migration guide
```

---

## Scripts Directory

```
scripts/
├── build.sh                     # Build script
├── test.sh                      # Run all tests
├── migrate.sh                   # Run migrations
├── benchmark.sh                 # Run benchmarks
├── release.sh                   # Create release build
└── migrate_data.rs              # Data migration from PostgreSQL
```

---

## Documentation Structure

```
docs/
├── architecture/
│   ├── overview.md
│   ├── database.md
│   └── streaming.md
│
├── api/
│   ├── commands.md
│   └── events.md
│
├── guides/
│   ├── development.md
│   ├── testing.md
│   └── deployment.md
│
└── migration/
    ├── from-web.md
    └── database.md
```

---

## Configuration Files

```
Root Configuration:
├── Cargo.toml                   # Rust workspace config
├── tauri.conf.json             # Tauri configuration
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript config
├── .env.example                # Environment template
└── .gitignore                  # Git ignore rules

Build Configuration:
├── .cargo/
│   └── config.toml             # Cargo config
└── .github/
    └── workflows/
        ├── build.yml           # CI/CD workflow
        └── test.yml            # Test workflow
```

---

## Build Artifacts (gitignored)

```
Build Output:
├── target/                      # Rust build output
│   ├── debug/
│   └── release/
│       └── bundle/
│           └── macos/
│               └── Vibing2.app  # macOS app bundle
│
├── out/                         # Next.js build output
└── .next/                       # Next.js cache
```

---

## Size Estimates

### Source Code
- Rust backend: ~10,000 lines
- React frontend: ~8,000 lines (existing)
- Tests: ~3,000 lines
- Configuration: ~500 lines
- Documentation: ~5,000 lines

### Binary Sizes
- Debug build: ~50MB
- Release build: <20MB (with optimizations)
- DMG installer: ~25MB

### Database
- Empty database: ~100KB
- With sample data: ~5MB
- Production (1000 projects): ~50MB

---

## Development Workflow

### Phase 1: Setup
```bash
cd vibing2/src-tauri
cargo build                      # Build Rust backend
cargo test                       # Run tests
```

### Phase 2: Development
```bash
# Terminal 1: Rust backend
cargo watch -x run

# Terminal 2: React frontend
npm run dev
```

### Phase 3: Testing
```bash
cargo test                       # Unit tests
cargo test --test integration   # Integration tests
cargo bench                      # Benchmarks
```

### Phase 4: Release
```bash
./scripts/release.sh            # Create release build
```

---

## Git Structure

```
Branches:
├── main                         # Production
├── develop                      # Development
├── feature/native-rust          # Feature branch
└── hotfix/*                     # Hotfixes

Tags:
├── v2.0.0-alpha.1
├── v2.0.0-beta.1
└── v2.0.0                       # Final release
```

---

## Total File Count

- **Rust source files:** ~40
- **React components:** ~25 (existing)
- **Test files:** ~15
- **Migration files:** ~5
- **Configuration files:** ~10
- **Documentation files:** ~20
- **Scripts:** ~10

**Total: ~125 files** (excluding dependencies)

---

## Priority Implementation Order

### Week 1 (12 files)
1. `src/main.rs`
2. `src/lib.rs`
3. `src/types/error.rs`
4. `src/types/config.rs`
5. `src/state/app_state.rs`
6. `src/utils/keychain.rs`
7. `Cargo.toml` (update)
8. `tauri.conf.json` (update)
9. `migrations/001_initial.sql`
10. `src/core/mod.rs`
11. `src/commands/mod.rs`
12. `src/utils/logger.rs`

### Week 2 (8 files)
1. `src/core/anthropic/client.rs`
2. `src/core/anthropic/models.rs`
3. `src/core/anthropic/streaming.rs`
4. `src/core/anthropic/error.rs`
5. `src/core/anthropic/mod.rs`
6. `src/commands/stream.rs`
7. `tests/stream_tests.rs`
8. `benches/stream_benchmark.rs`

### Week 3 (7 files)
1. `src/core/agents/registry.rs`
2. `src/core/agents/parser.rs`
3. `src/core/agents/router.rs`
4. `src/core/agents/error.rs`
5. `src/core/agents/mod.rs`
6. `src/commands/agent.rs`
7. `tests/agent_tests.rs`

### Weeks 4-12 (Continue incrementally)

---

## Deployment Structure

```
Release Package:
├── Vibing2.app/                 # macOS application bundle
│   ├── Contents/
│   │   ├── MacOS/
│   │   │   └── vibing2-desktop  # Binary
│   │   ├── Resources/
│   │   │   ├── icon.icns
│   │   │   └── assets/
│   │   └── Info.plist
│
└── Vibing2-2.0.0.dmg            # DMG installer
```

---

## Summary

This file structure provides:
- ✅ **Clear organization** by functionality
- ✅ **Scalable architecture** for future growth
- ✅ **Separation of concerns** (core, commands, state)
- ✅ **Easy navigation** for developers
- ✅ **Testable structure** with dedicated test directories
- ✅ **Production-ready** release artifacts

All files are organized to support the 12-week implementation timeline with clear dependencies and minimal coupling.

---

**Next Step:** Begin creating files following the Week 1 priority order.
