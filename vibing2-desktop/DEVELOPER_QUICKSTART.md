# Developer Quick Start

Get up and running with Vibing2 Desktop development in 5 minutes.

---

## 5-Minute Setup

### Prerequisites Check

Ensure you have these installed:

```bash
# Check Node.js (need 18+)
node --version

# Check pnpm (need 9+)
pnpm --version

# Check Rust (need 1.70+)
rustc --version
```

Don't have them? Install now:

```bash
# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and pnpm
brew install node@18 pnpm

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/vibing2/vibing2.git
cd vibing2/vibing2-desktop

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm run dev

# That's it! The app should open automatically.
```

---

## Project Structure

```
vibing2-desktop/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Library exports
│   │   ├── database.rs     # SQLite operations
│   │   └── commands.rs     # Tauri IPC commands
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # App configuration
├── public/                 # Frontend (Next.js build output)
├── scripts/
│   └── copy-assets.js      # Build helper
└── package.json            # Node.js dependencies
```

---

## Common Development Tasks

### Starting Development

```bash
# Start with hot-reload
pnpm run dev

# Development features:
# - Hot reload for Rust changes
# - Live frontend updates
# - DevTools available (right-click > Inspect)
# - Console logging enabled
```

### Building for Production

```bash
# Full production build
pnpm run build

# Output locations:
# - App bundle: src-tauri/target/release/bundle/macos/Vibing2.app
# - DMG installer: src-tauri/target/release/bundle/dmg/
```

### Running Tests

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run specific test
cargo test test_database_init

# Run with output
cargo test -- --nocapture

# Run with logging
RUST_LOG=debug cargo test
```

### Code Quality

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Check formatting
cargo fmt --check

# Run linter
cargo clippy

# Run with strict linting
cargo clippy -- -D warnings
```

### Dependency Management

```bash
# Add Rust dependency
cd src-tauri
cargo add serde

# Update dependencies
cargo update

# Check for outdated packages
cargo outdated

# Add Node dependency
cd ..
pnpm add package-name

# Update Node dependencies
pnpm update
```

---

## Debugging Tips

### Rust Debugging

#### Enable Debug Logging

```bash
# Set log level
export RUST_LOG=debug
pnpm run dev

# Or in code (src-tauri/src/main.rs):
env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("debug")).init();
```

#### Using println! Debugging

```rust
// In src-tauri/src/commands.rs
#[tauri::command]
async fn save_project(request: SaveProjectRequest) -> Result<Project, String> {
    println!("DEBUG: Received project request: {:?}", request);

    // Your code here

    println!("DEBUG: Project saved successfully");
    Ok(project)
}
```

#### Using dbg! Macro

```rust
let result = some_function();
dbg!(&result);  // Prints debug info with file and line number
```

#### Inspecting Database

```bash
# Open SQLite database
sqlite3 ~/Library/Application\ Support/com.vibing2.desktop/vibing2.db

# Common queries:
sqlite> .tables
sqlite> SELECT * FROM users;
sqlite> SELECT * FROM projects LIMIT 5;
sqlite> .schema projects
sqlite> .quit
```

### Frontend Debugging

#### Open DevTools

In the running app:
1. Right-click anywhere
2. Select "Inspect Element"
3. DevTools panel opens

Or use keyboard shortcut: `Cmd+Option+I`

#### Console Logging

```typescript
// In frontend code
console.log('Debug info:', data);
console.error('Error occurred:', error);
console.warn('Warning:', warning);
console.table(arrayOfObjects);  // Nice table view
```

#### Inspecting IPC Calls

```typescript
// Add logging to IPC calls
import { invoke } from '@tauri-apps/api/core';

async function saveProject(data) {
  console.log('Invoking save_project with:', data);
  try {
    const result = await invoke('save_project', { request: data });
    console.log('Save successful:', result);
    return result;
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
}
```

### Common Issues

#### Port Already in Use

```bash
# Error: "Port 3000 already in use"

# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in tauri.conf.json
```

#### Build Failures

```bash
# Clean everything
rm -rf src-tauri/target
rm -rf node_modules
rm pnpm-lock.yaml

# Fresh install
pnpm install

# Rebuild
pnpm run build
```

#### Database Locked

```bash
# Close all Vibing2 instances
killall vibing2-desktop

# Remove lock file (if exists)
rm ~/Library/Application\ Support/com.vibing2.desktop/*.lock

# Restart development
pnpm run dev
```

---

## Hot Reload Usage

### What Auto-Reloads?

**Rust Changes** (src-tauri/src/*.rs)
- Automatically recompiles
- App restarts (takes 10-30 seconds)
- State is lost (use database for persistence)

**Frontend Changes** (public/*)
- Instantly updates
- No app restart needed
- State preserved in most cases

**Configuration Changes** (tauri.conf.json)
- Requires manual restart
- Stop dev server (Ctrl+C)
- Run `pnpm run dev` again

### Optimizing Reload Time

#### Incremental Compilation

Add to `src-tauri/.cargo/config.toml`:

```toml
[build]
incremental = true

[target.x86_64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[target.aarch64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]
```

#### Faster Linking (macOS)

```bash
# Install faster linker
brew install llvm

# Use in Rust compilation (already configured above)
```

#### Reduce Dependencies

Keep `src-tauri/Cargo.toml` lean:
- Only add dependencies you need
- Use features flags to reduce compile time
- Consider splitting into workspace crates for large projects

---

## Building and Testing

### Development Builds

```bash
# Quick development build (unoptimized, with debug symbols)
cd src-tauri
cargo build

# Run the binary directly
./target/debug/vibing2-desktop

# Check binary size (should be large, 100MB+)
ls -lh target/debug/vibing2-desktop
```

### Release Builds

```bash
# Optimized release build
pnpm run build

# Check binary size (should be smaller, ~30-50MB)
ls -lh src-tauri/target/release/vibing2-desktop

# Test release build
open src-tauri/target/release/bundle/macos/Vibing2.app
```

### Running Specific Tests

```bash
cd src-tauri

# Run all tests
cargo test

# Run tests in specific file
cargo test --test integration_tests

# Run specific test function
cargo test test_save_project

# Run tests with pattern
cargo test database

# Run tests and show output
cargo test -- --nocapture

# Run tests in parallel (default)
cargo test

# Run tests serially (for database tests)
cargo test -- --test-threads=1
```

### Test Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage

# Open report
open coverage/index.html
```

### Integration Testing

```bash
# Run integration tests
cd src-tauri
cargo test --test '*' -- --nocapture

# Test specific integration
cargo test --test api_integration

# Run with real database
cargo test --features "test-db"
```

---

## Code Snippets

### Adding a New Tauri Command

**1. Define in src-tauri/src/commands.rs:**

```rust
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::database::Database;

#[derive(Debug, Deserialize)]
pub struct MyRequest {
    pub name: String,
    pub data: String,
}

#[derive(Debug, Serialize)]
pub struct MyResponse {
    pub id: String,
    pub success: bool,
}

#[tauri::command]
pub async fn my_command(
    request: MyRequest,
    db: State<'_, Database>,
) -> Result<MyResponse, String> {
    println!("Received request: {:?}", request);

    // Your logic here
    let id = uuid::Uuid::new_v4().to_string();

    Ok(MyResponse {
        id,
        success: true,
    })
}
```

**2. Register in src-tauri/src/main.rs:**

```rust
mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::save_project,
            commands::load_project,
            commands::my_command,  // Add your command here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**3. Call from frontend:**

```typescript
import { invoke } from '@tauri-apps/api/core';

async function callMyCommand() {
  try {
    const response = await invoke('my_command', {
      request: {
        name: 'test',
        data: 'example'
      }
    });
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Adding Database Tables

**1. Create migration in src-tauri/src/database.rs:**

```rust
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS my_table (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            data TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_my_table_name
        ON my_table(name)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
```

**2. Add CRUD operations:**

```rust
// Create
pub async fn create_item(
    pool: &SqlitePool,
    name: &str,
    data: &str,
) -> Result<String, sqlx::Error> {
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO my_table (id, name, data)
        VALUES (?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(data)
    .execute(pool)
    .await?;

    Ok(id)
}

// Read
pub async fn get_item(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<MyItem>, sqlx::Error> {
    let item = sqlx::query_as::<_, MyItem>(
        r#"
        SELECT id, name, data, created_at, updated_at
        FROM my_table
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(item)
}

// Update
pub async fn update_item(
    pool: &SqlitePool,
    id: &str,
    data: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE my_table
        SET data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(data)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

// Delete
pub async fn delete_item(
    pool: &SqlitePool,
    id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM my_table WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
```

### Error Handling Pattern

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// Implement conversion to String for Tauri
impl From<AppError> for String {
    fn from(error: AppError) -> String {
        error.to_string()
    }
}

// Use in commands
#[tauri::command]
pub async fn my_command(id: String) -> Result<MyData, AppError> {
    let item = get_item(&id)
        .await?
        .ok_or_else(|| AppError::NotFound(id.clone()))?;

    Ok(item)
}
```

---

## Useful Commands Cheatsheet

### Development

```bash
# Start dev server
pnpm run dev

# Build production
pnpm run build

# Clean build
rm -rf src-tauri/target && pnpm run build

# Check Tauri info
pnpm tauri info
```

### Testing

```bash
# All tests
cargo test

# Specific test
cargo test test_name

# With output
cargo test -- --nocapture

# Single threaded
cargo test -- --test-threads=1
```

### Code Quality

```bash
# Format
cargo fmt

# Lint
cargo clippy

# Strict lint
cargo clippy -- -D warnings

# Security audit
cargo audit
```

### Database

```bash
# Open database
sqlite3 ~/Library/Application\ Support/com.vibing2.desktop/vibing2.db

# Common commands:
.tables              # List tables
.schema table_name   # Show schema
SELECT * FROM users; # Query
.quit               # Exit
```

### Debugging

```bash
# Run with logging
RUST_LOG=debug pnpm run dev

# Check running processes
ps aux | grep vibing2

# Kill all instances
killall vibing2-desktop

# Monitor logs
tail -f ~/Library/Logs/com.vibing2.desktop/app.log
```

---

## IDE Setup

### VS Code (Recommended)

**Install Extensions:**

1. **rust-analyzer** - Rust language support
2. **Tauri** - Tauri-specific features
3. **Even Better TOML** - TOML syntax
4. **CodeLLDB** - Rust debugging

**Recommended Settings (.vscode/settings.json):**

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "files.watcherExclude": {
    "**/target/**": true
  }
}
```

**Debug Configuration (.vscode/launch.json):**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Vibing2",
      "cargo": {
        "args": ["build", "--manifest-path=src-tauri/Cargo.toml"],
        "filter": {
          "name": "vibing2-desktop",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### Vim/Neovim

**Install rust-analyzer:**

```bash
rustup component add rust-analyzer
```

**Configure (with coc.nvim):**

```json
{
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

---

## Performance Tips

### Faster Compilation

1. **Use Incremental Compilation** (already enabled in dev)
2. **Install faster linker** (see Hot Reload section)
3. **Reduce dependencies** - only include what you need
4. **Use workspace** - split large projects

### Smaller Binary Size

```toml
# In src-tauri/Cargo.toml [profile.release]
opt-level = "z"     # Optimize for size (already "s")
lto = true          # Link-time optimization (already enabled)
codegen-units = 1   # Better optimization (already set)
strip = true        # Remove debug symbols (already enabled)
```

### Runtime Performance

```rust
// Use references instead of cloning
fn process_data(data: &str) { ... }  // Good
fn process_data(data: String) { ... }  // Bad (copies data)

// Use String::from for static strings
let s = String::from("hello");  // Good
let s = "hello".to_string();    // Also fine

// Reuse allocations
let mut vec = Vec::with_capacity(1000);  // Pre-allocate

// Use async for I/O
#[tauri::command]
async fn my_command() { ... }  // Good for I/O
```

---

## Contributing

### Before Submitting PR

1. **Run tests**: `cargo test`
2. **Format code**: `cargo fmt`
3. **Run linter**: `cargo clippy`
4. **Update docs**: If you changed APIs
5. **Test manually**: Build and run the app

### Commit Message Format

```
type(scope): brief description

Longer description if needed.

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Example:**

```
feat(database): add caching layer for frequently accessed data

Implements an LRU cache for project queries to improve performance.
Cache size is configurable via settings.

Closes #456
```

---

## Resources

### Documentation

- [Tauri Docs](https://tauri.app/v2/guides/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Serde Guide](https://serde.rs/)

### Tools

- [Rust Playground](https://play.rust-lang.org/) - Test Rust code
- [SQLite Browser](https://sqlitebrowser.org/) - Visual database tool
- [Postman](https://www.postman.com/) - API testing
- [Instruments](https://developer.apple.com/xcode/features/) - macOS profiling

### Community

- [Discord](https://discord.gg/vibing2)
- [GitHub Discussions](https://github.com/vibing2/vibing2/discussions)
- [Tauri Discord](https://discord.gg/tauri)

---

## Quick Reference

### File Locations

```
# App binary
/Applications/Vibing2.app

# User data
~/Library/Application Support/com.vibing2.desktop/

# Database
~/Library/Application Support/com.vibing2.desktop/vibing2.db

# Preferences
~/Library/Preferences/com.vibing2.desktop.plist

# Logs
~/Library/Logs/com.vibing2.desktop/

# Caches
~/Library/Caches/com.vibing2.desktop/
```

### Environment Variables

```bash
# Enable debug logging
export RUST_LOG=debug

# Custom database path
export VIBING2_DB_PATH=/path/to/custom.db

# Development mode
export VIBING2_ENV=development
```

---

## Next Steps

Now that you're set up:

1. **Explore the codebase**
   - Start with `src-tauri/src/main.rs`
   - Read through `commands.rs`
   - Understand `database.rs`

2. **Try making a change**
   - Add a new command
   - Modify the UI
   - Add a database table

3. **Read full documentation**
   - [DEPLOYMENT_GUIDE.md](/Users/I347316/dev/vibing2/vibing2-desktop/DEPLOYMENT_GUIDE.md)
   - [Main README.md](/Users/I347316/dev/vibing2/vibing2-desktop/README.md)

4. **Join the community**
   - Introduce yourself in Discord
   - Ask questions in GitHub Discussions
   - Share what you're building!

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Maintainer:** Vibing2 Team

Happy coding!
