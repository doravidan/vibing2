# Phase 1: Quick Start Guide
## Native macOS Implementation - Getting Started in 30 Minutes

**Last Updated:** 2025-10-13
**Status:** READY TO START

---

## Overview

This quick start guide gets you from zero to a working native macOS build in 30 minutes. Follow the steps in order.

---

## Prerequisites (5 minutes)

### Required Tools

```bash
# 1. Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Node.js 18+ (for React frontend)
# Download from: https://nodejs.org/

# 3. Xcode Command Line Tools (macOS)
xcode-select --install

# 4. pnpm (package manager)
npm install -g pnpm
```

### Verify Installation

```bash
rustc --version    # Should be 1.75+
node --version     # Should be 18+
pnpm --version     # Should be 8+
cargo --version    # Should match rustc
```

---

## Step 1: Project Setup (5 minutes)

### Clone Repository

```bash
cd /Users/I347316/dev/vibing2
```

### Install Rust Dependencies

```bash
cd src-tauri

# Update Cargo.toml with new dependencies (see PHASE_1_CODE_TEMPLATES.md)

# Build to verify dependencies
cargo build
```

Expected output:
```
   Compiling vibing2-desktop v2.0.0
    Finished dev [unoptimized + debuginfo] target(s) in 2m 34s
```

---

## Step 2: Create Core Files (10 minutes)

### Create Directory Structure

```bash
cd src-tauri/src

# Create core modules
mkdir -p core/anthropic core/agents core/database
mkdir -p commands state utils types

# Create module files
touch core/mod.rs core/anthropic/mod.rs core/agents/mod.rs core/database/mod.rs
touch commands/mod.rs state/mod.rs utils/mod.rs types/mod.rs
touch types/error.rs types/config.rs
touch state/app_state.rs
touch utils/keychain.rs
```

### Create Main Entry Point

Copy the template from `PHASE_1_CODE_TEMPLATES.md`:

```bash
# src/main.rs
# Copy from template section "Main Application Setup"
```

### Create Error Types

```bash
# src/types/error.rs
# Copy from template section "Error Types"
```

### Create Configuration

```bash
# src/types/config.rs
# Copy from template section "Configuration"
```

---

## Step 3: Database Setup (5 minutes)

### Create Migrations Directory

```bash
cd src-tauri
mkdir -p migrations
```

### Create Initial Migration

```bash
# migrations/001_initial.sql
# Copy from PHASE_1_MIGRATION_SCRIPTS.md
```

### Test Database

```bash
# Run migrations
cargo run --bin migrate

# Or manually test
sqlite3 vibing2.db < migrations/001_initial.sql
```

---

## Step 4: Build & Run (5 minutes)

### First Build

```bash
cd src-tauri

# Clean build
cargo clean

# Build with all features
cargo build --all-features
```

### Run Development Server

```bash
# Terminal 1: Rust backend
cargo run

# Terminal 2: React frontend
cd ..
pnpm run dev
```

Expected output:
```
[Tauri] Starting application...
[Tauri] Listening on http://localhost:3000
```

---

## Step 5: Verify Installation (5 minutes)

### Test Checklist

```bash
# 1. Check app starts
cargo run
# Should open window without errors

# 2. Test database
cargo test db_tests

# 3. Check health endpoint
curl http://localhost:3000/api/health

# 4. Verify agents loaded
ls .claude/agents/agents/*.md | wc -l
# Should show 84
```

### Common Issues & Fixes

#### Issue: Build fails with missing dependencies
```bash
# Fix: Update Cargo.toml
cargo update
cargo build
```

#### Issue: Database migration fails
```bash
# Fix: Delete and recreate
rm vibing2.db
cargo run --bin migrate
```

#### Issue: Agents don't load
```bash
# Fix: Check path
export AGENTS_DIR=".claude/agents/agents"
cargo run
```

---

## Next Steps

### Week 1 Tasks (Immediate)

1. **Complete Core Infrastructure** (Days 1-5)
   - [ ] Update `Cargo.toml` with all dependencies
   - [ ] Implement error handling framework
   - [ ] Create configuration management
   - [ ] Set up application state
   - [ ] Configure logging

2. **Test Core Setup**
   ```bash
   cargo test
   cargo clippy
   cargo fmt
   ```

3. **Start Week 2** (See PHASE_1_NATIVE_MACOS_12_WEEK_PLAN.md)

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Start development
cd src-tauri

# 3. Run with hot reload
cargo watch -x run

# 4. In another terminal: Run tests
cargo watch -x test

# 5. Check code quality
cargo clippy -- -D warnings
cargo fmt --check
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/native-rust

# Commit changes
git add .
git commit -m "feat: implement core infrastructure"

# Push to remote
git push origin feature/native-rust

# Create PR on GitHub
```

---

## Useful Commands

### Cargo Commands

```bash
# Build
cargo build                    # Debug build
cargo build --release          # Release build

# Run
cargo run                      # Run application
cargo run --bin <name>         # Run specific binary

# Test
cargo test                     # Run all tests
cargo test <name>              # Run specific test
cargo test -- --nocapture      # Show test output

# Check & Lint
cargo check                    # Quick syntax check
cargo clippy                   # Linter
cargo fmt                      # Format code

# Clean
cargo clean                    # Remove build artifacts
```

### Development Tools

```bash
# Watch for changes
cargo install cargo-watch
cargo watch -x run

# Code coverage
cargo install cargo-tarpaulin
cargo tarpaulin --out Html

# Benchmarking
cargo bench

# Dependency tree
cargo tree
```

---

## Troubleshooting

### Build Issues

#### Issue: Linker errors
```bash
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Verify
xcode-select -p
```

#### Issue: Out of disk space
```bash
# Clean Cargo cache
cargo clean
rm -rf ~/.cargo/registry
rm -rf ~/.cargo/git
```

#### Issue: Dependency conflicts
```bash
# Update dependencies
cargo update

# Or force rebuild
cargo clean
cargo build
```

### Runtime Issues

#### Issue: Database locked
```bash
# Close all connections and retry
rm vibing2.db-wal vibing2.db-shm
```

#### Issue: API key not found
```bash
# Set in environment
export ANTHROPIC_API_KEY="sk-ant-..."

# Or use Keychain (macOS)
# Will be prompted on first run
```

#### Issue: Agents not loading
```bash
# Check path exists
ls -la .claude/agents/agents/

# Set explicit path
export AGENTS_DIR="/absolute/path/to/agents"
```

---

## Resources

### Documentation
- [Complete 12-Week Plan](PHASE_1_NATIVE_MACOS_12_WEEK_PLAN.md)
- [Code Templates](PHASE_1_CODE_TEMPLATES.md)
- [File Structure](PHASE_1_FILE_STRUCTURE.md)
- [Testing Strategy](PHASE_1_TESTING_STRATEGY.md)
- [Migration Scripts](PHASE_1_MIGRATION_SCRIPTS.md)

### External Resources
- [Tauri Documentation](https://tauri.app/v2/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Tokio Documentation](https://tokio.rs/)

### Community
- [Tauri Discord](https://discord.com/invite/tauri)
- [Rust Discord](https://discord.gg/rust-lang)

---

## Success Checklist

After completing this quick start, you should have:

- ✅ Rust development environment set up
- ✅ Project builds successfully
- ✅ Database migrations working
- ✅ Core modules created
- ✅ Tests running
- ✅ Development workflow established

---

## What's Next?

### Week 1 Goals
1. Complete core infrastructure
2. Implement error handling
3. Set up state management
4. Configure database pool
5. Begin Anthropic client

### Week 2 Goals
1. Implement AI streaming
2. Create SSE parser
3. Add stream commands
4. Test end-to-end streaming

### Week 3 Goals
1. Migrate agent system
2. Load 84 agent definitions
3. Implement search
4. Add auto-selection

---

## Getting Help

### If You Get Stuck

1. **Check Documentation**
   - Read the detailed plan for your current week
   - Review code templates
   - Check troubleshooting section

2. **Run Diagnostics**
   ```bash
   ./scripts/diagnose.sh
   ```

3. **Ask for Help**
   - Create GitHub issue
   - Post in Tauri Discord
   - Ask in Rust Discord

4. **Debug Mode**
   ```bash
   RUST_LOG=debug cargo run
   ```

---

## Summary

You now have:
- ✅ **Development environment** ready
- ✅ **Core structure** in place
- ✅ **Database** initialized
- ✅ **Build system** working
- ✅ **Clear roadmap** for next steps

**Time to Start:** Begin Week 1, Day 1 tasks from the 12-week plan!

---

**Good luck with your native macOS implementation!** 🚀

*If you encounter any issues, refer to the comprehensive documentation or create a GitHub issue.*
