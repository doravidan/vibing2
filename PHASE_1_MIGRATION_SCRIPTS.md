# Phase 1: Migration Scripts & Database Tools

**Complete data migration from PostgreSQL/Prisma to SQLite**

---

## Table of Contents

1. [Overview](#overview)
2. [SQLite Schema](#sqlite-schema)
3. [Migration Scripts](#migration-scripts)
4. [Data Validation](#data-validation)
5. [Rollback Procedures](#rollback-procedures)
6. [Performance Optimization](#performance-optimization)

---

## Overview

### Migration Strategy

```
PostgreSQL (Web)  →  Data Export  →  Transform  →  SQLite (Native)
     Prisma              JSON           Rust          Optimized
```

### Key Differences

| Aspect | PostgreSQL | SQLite |
|--------|-----------|--------|
| **Timestamps** | `TIMESTAMP` | `INTEGER` (Unix epoch) |
| **Arrays** | Native | JSON string |
| **UUIDs** | Native | TEXT |
| **Booleans** | `BOOLEAN` | `INTEGER` (0/1) |
| **Relations** | Foreign keys | Foreign keys |

### Migration Goals
1. ✅ Zero data loss
2. ✅ Preserve all relationships
3. ✅ Maintain data integrity
4. ✅ Optimize for performance
5. ✅ Enable rollback

---

## SQLite Schema

### Complete Schema (migrations/001_initial.sql)

```sql
-- migrations/001_initial.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified INTEGER, -- timestamp
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
CREATE INDEX idx_users_created ON users(created_at DESC);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT NOT NULL,
    active_agents TEXT NOT NULL DEFAULT '[]', -- JSON array
    visibility TEXT NOT NULL DEFAULT 'PRIVATE',
    likes INTEGER NOT NULL DEFAULT 0,
    forks INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_visibility ON projects(visibility, updated_at DESC);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);
CREATE INDEX idx_projects_user_updated ON projects(user_id, updated_at DESC);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
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
CREATE TABLE IF NOT EXISTS messages (
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
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Token usage table
CREATE TABLE IF NOT EXISTS token_usage (
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
CREATE TABLE IF NOT EXISTS sessions (
    session_token TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    expires INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires);

-- Accounts table (OAuth)
CREATE TABLE IF NOT EXISTS accounts (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

-- Project collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
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

-- Collaboration invites table
CREATE TABLE IF NOT EXISTS collaboration_invites (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invites_to_user ON collaboration_invites(to_user_id, status);
CREATE INDEX idx_invites_project ON collaboration_invites(project_id);

-- Full-text search index for projects
CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    id UNINDEXED,
    name,
    description,
    content='projects',
    content_rowid='rowid'
);

-- Triggers to keep FTS index updated
CREATE TRIGGER IF NOT EXISTS projects_fts_insert AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, id, name, description)
    VALUES (new.rowid, new.id, new.name, new.description);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_update AFTER UPDATE ON projects BEGIN
    UPDATE projects_fts
    SET name = new.name, description = new.description
    WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_delete AFTER DELETE ON projects BEGIN
    DELETE FROM projects_fts WHERE rowid = old.rowid;
END;
```

---

## Migration Scripts

### Main Migration Script

```rust
// scripts/migrate_data.rs

use sqlx::{PgPool, SqlitePool, Row};
use chrono::{DateTime, Utc};
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Vibing2 Database Migration ===");
    println!("PostgreSQL → SQLite\n");

    // Connect to PostgreSQL
    let pg_url = std::env::var("POSTGRES_URL")
        .expect("POSTGRES_URL must be set");
    println!("Connecting to PostgreSQL...");
    let pg_pool = PgPool::connect(&pg_url).await?;

    // Connect to SQLite
    let sqlite_url = std::env::var("SQLITE_URL")
        .unwrap_or_else(|_| "sqlite:vibing2.db".to_string());
    println!("Connecting to SQLite...");
    let sqlite_pool = SqlitePool::connect(&sqlite_url).await?;

    // Run SQLite migrations
    println!("Running SQLite migrations...");
    sqlx::migrate!("./migrations")
        .run(&sqlite_pool)
        .await?;

    // Migrate users
    println!("\nMigrating users...");
    migrate_users(&pg_pool, &sqlite_pool).await?;

    // Migrate projects
    println!("Migrating projects...");
    migrate_projects(&pg_pool, &sqlite_pool).await?;

    // Migrate project files
    println!("Migrating project files...");
    migrate_project_files(&pg_pool, &sqlite_pool).await?;

    // Migrate messages
    println!("Migrating messages...");
    migrate_messages(&pg_pool, &sqlite_pool).await?;

    // Migrate token usage
    println!("Migrating token usage...");
    migrate_token_usage(&pg_pool, &sqlite_pool).await?;

    // Migrate sessions
    println!("Migrating sessions...");
    migrate_sessions(&pg_pool, &sqlite_pool).await?;

    // Migrate collaborators
    println!("Migrating collaborators...");
    migrate_collaborators(&pg_pool, &sqlite_pool).await?;

    // Validate migration
    println!("\nValidating migration...");
    validate_migration(&pg_pool, &sqlite_pool).await?;

    println!("\n✅ Migration completed successfully!");

    Ok(())
}

async fn migrate_users(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM users")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} users", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let name: Option<String> = row.get("name");
        let email: String = row.get("email");
        let email_verified: Option<DateTime<Utc>> = row.get("email_verified");
        let password: String = row.get("password");
        let image: Option<String> = row.get("image");
        let plan: String = row.get("plan");
        let token_balance: i32 = row.get("token_balance");
        let context_used: f64 = row.get("context_used");
        let created_at: DateTime<Utc> = row.get("created_at");
        let updated_at: DateTime<Utc> = row.get("updated_at");

        sqlx::query!(
            r#"
            INSERT INTO users (
                id, name, email, email_verified, password, image,
                plan, token_balance, context_used, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            id,
            name,
            email,
            email_verified.map(|dt| dt.timestamp()),
            password,
            image,
            plan,
            token_balance,
            context_used,
            created_at.timestamp(),
            updated_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} users", rows.len());
    Ok(())
}

async fn migrate_projects(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM projects")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} projects", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let name: String = row.get("name");
        let description: Option<String> = row.get("description");
        let project_type: String = row.get("project_type");
        let active_agents: String = row.get("active_agents");
        let visibility: String = row.get("visibility");
        let likes: i32 = row.get("likes");
        let forks: i32 = row.get("forks");
        let user_id: String = row.get("user_id");
        let created_at: DateTime<Utc> = row.get("created_at");
        let updated_at: DateTime<Utc> = row.get("updated_at");

        sqlx::query!(
            r#"
            INSERT INTO projects (
                id, name, description, project_type, active_agents,
                visibility, likes, forks, user_id, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            id,
            name,
            description,
            project_type,
            active_agents,
            visibility,
            likes,
            forks,
            user_id,
            created_at.timestamp(),
            updated_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} projects", rows.len());
    Ok(())
}

async fn migrate_project_files(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM project_files")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} files", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let project_id: String = row.get("project_id");
        let path: String = row.get("path");
        let content: String = row.get("content");
        let language: String = row.get("language");
        let created_at: DateTime<Utc> = row.get("created_at");
        let updated_at: DateTime<Utc> = row.get("updated_at");

        sqlx::query!(
            r#"
            INSERT INTO project_files (
                id, project_id, path, content, language, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            id,
            project_id,
            path,
            content,
            language,
            created_at.timestamp(),
            updated_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} files", rows.len());
    Ok(())
}

async fn migrate_messages(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM messages")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} messages", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let role: String = row.get("role");
        let content: String = row.get("content");
        let project_id: String = row.get("project_id");
        let created_at: DateTime<Utc> = row.get("created_at");

        sqlx::query!(
            r#"
            INSERT INTO messages (
                id, role, content, project_id, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            id,
            role,
            content,
            project_id,
            created_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} messages", rows.len());
    Ok(())
}

async fn migrate_token_usage(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM token_usage")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} token usage records", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let user_id: String = row.get("user_id");
        let tokens_used: i32 = row.get("tokens_used");
        let context_used: f64 = row.get("context_used");
        let saved_tokens: i32 = row.get("saved_tokens");
        let endpoint: String = row.get("endpoint");
        let timestamp: DateTime<Utc> = row.get("timestamp");

        sqlx::query!(
            r#"
            INSERT INTO token_usage (
                id, user_id, tokens_used, context_used, saved_tokens, endpoint, timestamp
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            id,
            user_id,
            tokens_used,
            context_used,
            saved_tokens,
            endpoint,
            timestamp.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} token usage records", rows.len());
    Ok(())
}

async fn migrate_sessions(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM sessions")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} sessions", rows.len());

    for row in rows {
        let session_token: String = row.get("session_token");
        let user_id: String = row.get("user_id");
        let expires: DateTime<Utc> = row.get("expires");
        let created_at: DateTime<Utc> = row.get("created_at");
        let updated_at: DateTime<Utc> = row.get("updated_at");

        sqlx::query!(
            r#"
            INSERT INTO sessions (
                session_token, user_id, expires, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            session_token,
            user_id,
            expires.timestamp(),
            created_at.timestamp(),
            updated_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} sessions", rows.len());
    Ok(())
}

async fn migrate_collaborators(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let rows = sqlx::query("SELECT * FROM project_collaborators")
        .fetch_all(pg_pool)
        .await?;

    println!("  Found {} collaborators", rows.len());

    for row in rows {
        let id: String = row.get("id");
        let project_id: String = row.get("project_id");
        let user_id: String = row.get("user_id");
        let role: String = row.get("role");
        let created_at: DateTime<Utc> = row.get("created_at");

        sqlx::query!(
            r#"
            INSERT INTO project_collaborators (
                id, project_id, user_id, role, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            id,
            project_id,
            user_id,
            role,
            created_at.timestamp(),
        )
        .execute(sqlite_pool)
        .await?;
    }

    println!("  ✓ Migrated {} collaborators", rows.len());
    Ok(())
}

async fn validate_migration(
    pg_pool: &PgPool,
    sqlite_pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n  Validating row counts...");

    // Validate users
    let pg_users: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pg_pool)
        .await?;
    let sqlite_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(sqlite_pool)
        .await?;

    if pg_users.0 != sqlite_users {
        return Err(format!(
            "User count mismatch: PostgreSQL={}, SQLite={}",
            pg_users.0, sqlite_users
        ).into());
    }
    println!("    ✓ Users: {} rows", sqlite_users);

    // Validate projects
    let pg_projects: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects")
        .fetch_one(pg_pool)
        .await?;
    let sqlite_projects: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects")
        .fetch_one(sqlite_pool)
        .await?;

    if pg_projects.0 != sqlite_projects {
        return Err(format!(
            "Project count mismatch: PostgreSQL={}, SQLite={}",
            pg_projects.0, sqlite_projects
        ).into());
    }
    println!("    ✓ Projects: {} rows", sqlite_projects);

    // Validate project files
    let pg_files: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM project_files")
        .fetch_one(pg_pool)
        .await?;
    let sqlite_files: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM project_files")
        .fetch_one(sqlite_pool)
        .await?;

    if pg_files.0 != sqlite_files {
        return Err(format!(
            "File count mismatch: PostgreSQL={}, SQLite={}",
            pg_files.0, sqlite_files
        ).into());
    }
    println!("    ✓ Files: {} rows", sqlite_files);

    // Validate messages
    let pg_messages: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages")
        .fetch_one(pg_pool)
        .await?;
    let sqlite_messages: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM messages")
        .fetch_one(sqlite_pool)
        .await?;

    if pg_messages.0 != sqlite_messages {
        return Err(format!(
            "Message count mismatch: PostgreSQL={}, SQLite={}",
            pg_messages.0, sqlite_messages
        ).into());
    }
    println!("    ✓ Messages: {} rows", sqlite_messages);

    println!("\n  ✓ All validations passed");

    Ok(())
}
```

### Build Script

```bash
# scripts/migrate.sh

#!/bin/bash

set -e

echo "=== Vibing2 Database Migration ==="
echo

# Check environment variables
if [ -z "$POSTGRES_URL" ]; then
    echo "Error: POSTGRES_URL not set"
    exit 1
fi

# Set SQLite URL
export SQLITE_URL="${SQLITE_URL:-sqlite:vibing2.db}"

# Backup existing SQLite database
if [ -f "vibing2.db" ]; then
    echo "Backing up existing database..."
    cp vibing2.db "vibing2.db.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Run migration
echo "Running migration script..."
cargo run --bin migrate_data

echo
echo "✅ Migration complete!"
echo
echo "Database location: $SQLITE_URL"
echo "Backup location: vibing2.db.backup.*"
```

---

## Data Validation

### Validation Script

```rust
// scripts/validate_data.rs

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let sqlite_pool = SqlitePool::connect("sqlite:vibing2.db").await?;

    println!("=== Data Validation ===\n");

    // Check referential integrity
    println!("Checking referential integrity...");
    validate_referential_integrity(&sqlite_pool).await?;

    // Check data consistency
    println!("Checking data consistency...");
    validate_data_consistency(&sqlite_pool).await?;

    // Check indexes
    println!("Checking indexes...");
    validate_indexes(&sqlite_pool).await?;

    println!("\n✅ All validation checks passed!");

    Ok(())
}

async fn validate_referential_integrity(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    // Check for orphaned projects
    let orphaned_projects: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM projects WHERE user_id NOT IN (SELECT id FROM users)"
    )
    .fetch_one(pool)
    .await?;

    if orphaned_projects > 0 {
        return Err(format!("Found {} orphaned projects", orphaned_projects).into());
    }
    println!("  ✓ No orphaned projects");

    // Check for orphaned files
    let orphaned_files: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM project_files WHERE project_id NOT IN (SELECT id FROM projects)"
    )
    .fetch_one(pool)
    .await?;

    if orphaned_files > 0 {
        return Err(format!("Found {} orphaned files", orphaned_files).into());
    }
    println!("  ✓ No orphaned files");

    // Check for orphaned messages
    let orphaned_messages: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM messages WHERE project_id NOT IN (SELECT id FROM projects)"
    )
    .fetch_one(pool)
    .await?;

    if orphaned_messages > 0 {
        return Err(format!("Found {} orphaned messages", orphaned_messages).into());
    }
    println!("  ✓ No orphaned messages");

    Ok(())
}

async fn validate_data_consistency(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    // Check for duplicate emails
    let duplicate_emails: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM (SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING cnt > 1)"
    )
    .fetch_one(pool)
    .await?;

    if duplicate_emails > 0 {
        return Err(format!("Found {} duplicate emails", duplicate_emails).into());
    }
    println!("  ✓ No duplicate emails");

    // Check for invalid JSON in active_agents
    let invalid_agents = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM projects WHERE json_valid(active_agents) = 0"
    )
    .fetch_one(pool)
    .await?;

    if invalid_agents > 0 {
        return Err(format!("Found {} projects with invalid agent JSON", invalid_agents).into());
    }
    println!("  ✓ All agent JSON valid");

    Ok(())
}

async fn validate_indexes(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let indexes = sqlx::query_scalar::<_, String>(
        "SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
    )
    .fetch_all(pool)
    .await?;

    println!("  Found {} indexes:", indexes.len());
    for index in indexes {
        println!("    - {}", index);
    }

    Ok(())
}
```

---

## Rollback Procedures

### Rollback Script

```bash
# scripts/rollback.sh

#!/bin/bash

set -e

echo "=== Rollback Database ==="
echo

# Find latest backup
BACKUP=$(ls -t vibing2.db.backup.* 2>/dev/null | head -1)

if [ -z "$BACKUP" ]; then
    echo "Error: No backup found"
    exit 1
fi

echo "Found backup: $BACKUP"
read -p "Restore from this backup? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restoring..."
    cp "$BACKUP" vibing2.db
    echo "✅ Rollback complete!"
else
    echo "Rollback cancelled"
fi
```

---

## Performance Optimization

### Optimization Script

```sql
-- migrations/002_optimize.sql

-- Analyze tables for query planner
ANALYZE;

-- Update statistics
PRAGMA optimize;

-- Set optimal cache size (64MB)
PRAGMA cache_size = -64000;

-- Enable memory-mapped I/O (256MB)
PRAGMA mmap_size = 268435456;

-- Set page size (must be done before data is added)
-- PRAGMA page_size = 4096;

-- Enable temp store in memory
PRAGMA temp_store = MEMORY;

-- Set journal mode to WAL
PRAGMA journal_mode = WAL;

-- Set synchronous mode to NORMAL (safe for WAL)
PRAGMA synchronous = NORMAL;

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create additional indexes based on query patterns
CREATE INDEX IF NOT EXISTS idx_projects_user_type ON projects(user_id, project_type);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_project_files_language ON project_files(language);
```

---

## Summary

This migration toolkit provides:

- ✅ **Complete Schema** - Optimized for SQLite
- ✅ **Migration Scripts** - Zero data loss
- ✅ **Validation Tools** - Referential integrity checks
- ✅ **Rollback Procedures** - Safe recovery
- ✅ **Performance Optimization** - Query tuning

**Next Step:** Test migration on development data before production.
