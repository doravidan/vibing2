# Phase 1: Testing Strategy & Performance Benchmarks

**Comprehensive testing approach for native macOS implementation**

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Coverage Goals](#test-coverage-goals)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Performance Benchmarking](#performance-benchmarking)
6. [End-to-End Testing](#end-to-end-testing)
7. [Manual Testing Checklist](#manual-testing-checklist)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Test Data Management](#test-data-management)

---

## Testing Philosophy

### Principles
1. **Test Early, Test Often** - Write tests alongside code
2. **Fast Feedback** - Unit tests run in <5 seconds
3. **Realistic Tests** - Use real data and scenarios
4. **Automated Everything** - No manual regression testing
5. **Performance-First** - Benchmark all critical paths

### Test Pyramid
```
    ┌─────────────┐
    │   Manual    │  5% - User acceptance
    │   Testing   │
    ├─────────────┤
    │  E2E Tests  │  15% - Full workflows
    ├─────────────┤
    │ Integration │  30% - Module interaction
    │    Tests    │
    ├─────────────┤
    │   Unit      │  50% - Individual functions
    │   Tests     │
    └─────────────┘
```

---

## Test Coverage Goals

### Overall Coverage Targets
- **Unit Tests:** >85% code coverage
- **Integration Tests:** All critical paths
- **Performance Tests:** All async operations
- **E2E Tests:** Top 5 user workflows

### Module-Specific Targets

| Module | Coverage | Critical Paths |
|--------|----------|----------------|
| Anthropic Client | 90%+ | Stream, Validate |
| Agent Registry | 85%+ | Load, Search |
| Database | 90%+ | CRUD, Transactions |
| Commands | 80%+ | All IPC commands |
| State Management | 85%+ | Cache, Sessions |

---

## Unit Testing

### Setup

```rust
// tests/common/mod.rs
use tempfile::TempDir;
use sqlx::SqlitePool;

pub struct TestContext {
    pub temp_dir: TempDir,
    pub db_pool: SqlitePool,
}

impl TestContext {
    pub async fn new() -> Self {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");

        let pool = SqlitePool::connect(&format!("sqlite:{}", db_path.display()))
            .await
            .unwrap();

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();

        Self { temp_dir, db_pool: pool }
    }
}
```

### Test Templates

#### Basic Unit Test
```rust
#[test]
fn test_error_conversion() {
    let error = AppError::Config("test error".into());
    let error_string = error.to_string();
    assert!(error_string.contains("test error"));
}
```

#### Async Unit Test
```rust
#[tokio::test]
async fn test_database_connection() {
    let ctx = TestContext::new().await;
    let result = sqlx::query("SELECT 1")
        .fetch_one(&ctx.db_pool)
        .await;
    assert!(result.is_ok());
}
```

#### Mocked Test
```rust
#[tokio::test]
async fn test_anthropic_client_validation() {
    let client = AnthropicClient::new("test-key");
    // Test with mock server
    let mut server = mockito::Server::new_async().await;
    let _mock = server.mock("POST", "/v1/messages")
        .with_status(200)
        .with_body(r#"{"id":"msg_123"}"#)
        .create_async()
        .await;

    // Test client
    // ...
}
```

---

## Integration Testing

### Test Categories

#### 1. Database Integration Tests

```rust
// tests/integration/database_tests.rs
use serial_test::serial;

#[tokio::test]
#[serial]
async fn test_project_crud_workflow() {
    let ctx = TestContext::new().await;
    let pool = &ctx.db_pool;

    // Create project
    let project = ProjectQueries::create(pool, CreateProjectInput {
        name: "Test Project".into(),
        project_type: "WEB_APP".into(),
        user_id: "test-user".into(),
        ..Default::default()
    }).await.unwrap();

    // Read project
    let loaded = ProjectQueries::find_by_id(pool, &project.id)
        .await
        .unwrap()
        .expect("Project not found");

    assert_eq!(loaded.name, "Test Project");

    // Update project
    let updated = ProjectQueries::update(pool, &project.id, UpdateProjectInput {
        name: Some("Updated Project".into()),
        ..Default::default()
    }).await.unwrap();

    assert_eq!(updated.name, "Updated Project");

    // Delete project
    ProjectQueries::delete(pool, &project.id).await.unwrap();

    let deleted = ProjectQueries::find_by_id(pool, &project.id)
        .await
        .unwrap();

    assert!(deleted.is_none());
}
```

#### 2. Agent System Integration Tests

```rust
// tests/integration/agent_tests.rs
#[tokio::test]
async fn test_agent_registry_loading() {
    let registry = AgentRegistry::load_from_directory(".claude/agents/agents")
        .await
        .unwrap();

    // Verify count
    assert!(registry.count() >= 84, "Expected at least 84 agents");

    // Test search
    let results = registry.search("debugging");
    assert!(!results.is_empty());

    // Test get by name
    let agent = registry.get("fullstack-developer");
    assert!(agent.is_some());

    // Test categories
    let categories = registry.categories();
    assert!(categories.contains(&"development".to_string()));
}
```

#### 3. Streaming Integration Tests

```rust
// tests/integration/stream_tests.rs
#[tokio::test]
async fn test_streaming_workflow() {
    let state = AppState::new().await.unwrap();

    // Create mock messages
    let messages = vec![
        ChatMessage {
            role: "user".into(),
            content: "Hello".into(),
        }
    ];

    // Start stream
    let session_id = uuid::Uuid::new_v4().to_string();

    // Note: This requires a real API key or mock server
    // Use conditional compilation for CI
    #[cfg(feature = "integration-tests")]
    {
        let result = stream_ai_response(
            tauri::State::new(state),
            mock_window(),
            session_id.clone(),
            messages,
            "claude-3-haiku-20240307".into(),
            None,
        ).await;

        assert!(result.is_ok());
    }
}
```

#### 4. Cache Integration Tests

```rust
// tests/integration/cache_tests.rs
#[tokio::test]
async fn test_cache_operations() {
    let cache = QueryCache::new(100);

    // Insert
    cache.insert(
        "test-key".into(),
        serde_json::json!({"data": "value"}),
        std::time::Duration::from_secs(60),
    );

    // Get (should hit)
    let value = cache.get("test-key");
    assert!(value.is_some());

    // Wait for expiration
    tokio::time::sleep(std::time::Duration::from_secs(61)).await;

    // Get (should miss)
    let value = cache.get("test-key");
    assert!(value.is_none());
}
```

---

## Performance Benchmarking

### Setup

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["async_tokio"] }

[[bench]]
name = "stream_benchmark"
harness = false
```

### Benchmark Templates

#### 1. Streaming Performance

```rust
// benches/stream_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use vibing2_desktop::core::anthropic::AnthropicClient;

fn bench_stream_parsing(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("parse_sse_event", |b| {
        b.iter(|| {
            let event = "data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"Hello\"}}";
            black_box(parse_event(event))
        });
    });
}

fn bench_stream_processing(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("stream_1kb_response", |b| {
        b.to_async(&rt).iter(|| async {
            // Benchmark full streaming workflow
            black_box(process_stream().await)
        });
    });
}

criterion_group!(benches, bench_stream_parsing, bench_stream_processing);
criterion_main!(benches);
```

#### 2. Database Performance

```rust
// benches/db_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_database_queries(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("project_load", |b| {
        b.to_async(&rt).iter(|| async {
            let pool = setup_test_db().await;
            black_box(load_project(&pool, "test-id").await)
        });
    });

    c.bench_function("project_save", |b| {
        b.to_async(&rt).iter(|| async {
            let pool = setup_test_db().await;
            black_box(save_project(&pool, create_test_project()).await)
        });
    });
}

criterion_group!(benches, bench_database_queries);
criterion_main!(benches);
```

#### 3. Agent Registry Performance

```rust
// benches/agent_benchmark.rs
fn bench_agent_operations(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let registry = rt.block_on(async {
        AgentRegistry::load_from_directory(".claude/agents/agents")
            .await
            .unwrap()
    });

    c.bench_function("agent_search", |b| {
        b.iter(|| {
            black_box(registry.search("debugging"))
        });
    });

    c.bench_function("agent_get", |b| {
        b.iter(|| {
            black_box(registry.get("fullstack-developer"))
        });
    });
}

criterion_group!(benches, bench_agent_operations);
criterion_main!(benches);
```

### Performance Targets

| Operation | Target | Critical? |
|-----------|--------|-----------|
| App Startup | <1s | ✅ Yes |
| Database Query (simple) | <5ms | ✅ Yes |
| Database Query (complex) | <50ms | ✅ Yes |
| AI Stream First Token | <2s | ✅ Yes |
| Project Load (cached) | <10ms | ✅ Yes |
| Project Load (uncached) | <100ms | ✅ Yes |
| Project Save | <200ms | ✅ Yes |
| Agent Search | <10ms | ✅ Yes |
| Cache Hit | <1ms | ✅ Yes |

---

## End-to-End Testing

### Playwright Tests (React Frontend)

```typescript
// tests/e2e/create-project.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Create Project Workflow', () => {
  test('should create new project', async ({ page }) => {
    // Navigate to create page
    await page.goto('/create');

    // Select project type
    await page.click('text=Web App');

    // Enter prompt
    await page.fill('[data-testid="prompt-input"]', 'Create a todo app');

    // Submit
    await page.click('[data-testid="submit-button"]');

    // Wait for streaming
    await page.waitForSelector('[data-testid="stream-complete"]', {
      timeout: 30000
    });

    // Verify output
    const output = await page.textContent('[data-testid="output"]');
    expect(output).toContain('<!DOCTYPE html>');
  });
});
```

### Tauri IPC Tests

```rust
// tests/integration/tauri_tests.rs
#[tokio::test]
async fn test_ipc_commands() {
    let app = tauri::test::mock_app();
    let state = AppState::new().await.unwrap();

    // Test create_project command
    let result = create_project(
        tauri::State::new(state.clone()),
        CreateProjectRequest {
            name: "Test".into(),
            project_type: "WEB_APP".into(),
            active_agents: "[]".into(),
            description: None,
        }
    ).await;

    assert!(result.is_ok());
}
```

---

## Manual Testing Checklist

### Week 1-3: Core Functionality
- [ ] App starts successfully
- [ ] Configuration loads from Keychain
- [ ] Database initializes and migrates
- [ ] Agents load from directory (84 total)
- [ ] Health check endpoint responds
- [ ] Logging outputs to console

### Week 4-6: AI & Streaming
- [ ] API key validation works
- [ ] Streaming starts and emits tokens
- [ ] Stream cancellation works
- [ ] Error handling displays properly
- [ ] Rate limiting activates
- [ ] Metrics track correctly

### Week 7-9: Project Management
- [ ] Create project saves to database
- [ ] Load project retrieves all data
- [ ] Update project persists changes
- [ ] Delete project removes from database
- [ ] File operations work correctly
- [ ] Cache speeds up repeated loads

### Week 10-12: Native UI
- [ ] Menu bar displays correctly
- [ ] Keyboard shortcuts work
- [ ] File picker opens
- [ ] Drag-drop accepts files
- [ ] Settings save to Keychain
- [ ] Window state persists

### Performance Verification
- [ ] Startup time <1 second
- [ ] Memory usage <150MB
- [ ] Database queries <5ms
- [ ] Stream latency <100ms
- [ ] No UI freezing

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: macos-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable

    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: |
          ~/.cargo
          target/
        key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

    - name: Run tests
      run: |
        cd src-tauri
        cargo test --all-features

    - name: Run benchmarks
      run: |
        cd src-tauri
        cargo bench --no-run

    - name: Check formatting
      run: cargo fmt -- --check

    - name: Run clippy
      run: cargo clippy -- -D warnings

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

## Test Data Management

### Sample Data Generator

```rust
// tests/common/fixtures.rs
pub fn create_test_project() -> CreateProjectInput {
    CreateProjectInput {
        name: format!("Test Project {}", uuid::Uuid::new_v4()),
        description: Some("Test description".into()),
        project_type: "WEB_APP".into(),
        active_agents: r#"["fullstack-developer"]"#.into(),
        visibility: "PRIVATE".into(),
        user_id: "test-user".into(),
    }
}

pub fn create_test_messages(count: usize) -> Vec<CreateMessageInput> {
    (0..count)
        .map(|i| CreateMessageInput {
            role: if i % 2 == 0 { "user" } else { "assistant" }.into(),
            content: format!("Message {}", i),
            project_id: "test-project".into(),
            tokens_used: Some(100),
        })
        .collect()
}

pub fn create_test_files(count: usize) -> Vec<CreateFileInput> {
    (0..count)
        .map(|i| CreateFileInput {
            project_id: "test-project".into(),
            path: format!("src/file{}.ts", i),
            content: format!("// File {}\nconsole.log('test');", i),
            language: "typescript".into(),
        })
        .collect()
}
```

### Database Seeding

```rust
// tests/common/seed.rs
pub async fn seed_database(pool: &SqlitePool) {
    // Create test user
    sqlx::query!(
        "INSERT INTO users (id, name, email, password) VALUES (?1, ?2, ?3, ?4)",
        "test-user",
        "Test User",
        "test@example.com",
        "hashed_password"
    )
    .execute(pool)
    .await
    .unwrap();

    // Create test projects
    for i in 0..10 {
        let project_id = format!("test-project-{}", i);
        sqlx::query!(
            "INSERT INTO projects (id, name, project_type, user_id) VALUES (?1, ?2, ?3, ?4)",
            project_id,
            format!("Test Project {}", i),
            "WEB_APP",
            "test-user"
        )
        .execute(pool)
        .await
        .unwrap();
    }
}
```

---

## Test Execution

### Quick Commands

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_name

# Run tests in parallel
cargo test -- --test-threads=4

# Run integration tests only
cargo test --test integration

# Run benchmarks
cargo bench

# Run with coverage
cargo tarpaulin --out Html

# Run E2E tests
npm run test:e2e
```

### Test Organization

```bash
# Unit tests (fast, <5s)
cargo test --lib

# Integration tests (medium, <30s)
cargo test --test '*'

# Benchmarks (slow, varies)
cargo bench

# All tests
./scripts/test.sh
```

---

## Continuous Monitoring

### Metrics to Track
- Test execution time
- Code coverage percentage
- Benchmark results over time
- Flaky test detection
- Performance regression alerts

### Alerting Thresholds
- Coverage drops below 85%
- Any test takes >5 minutes
- Benchmark regresses >10%
- More than 2 flaky tests

---

## Summary

This testing strategy ensures:
- ✅ **High Confidence** - 85%+ code coverage
- ✅ **Fast Feedback** - Unit tests in <5 seconds
- ✅ **Performance Validation** - All critical paths benchmarked
- ✅ **Automated Testing** - No manual regression tests
- ✅ **Production Ready** - Comprehensive E2E coverage

**Next Step:** Begin implementing tests alongside code in Week 1.
