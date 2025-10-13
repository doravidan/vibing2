# Vibing2 Desktop Test Suite

## Quick Start

Run all tests:

```bash
./run-tests.sh
```

Run specific tests:

```bash
./run-tests.sh -p save_project
```

Run with verbose output:

```bash
./run-tests.sh -v
```

## Test Suite Overview

This test suite provides comprehensive integration testing for all Tauri IPC commands in the Vibing2 Desktop application.

### Test Statistics

- **Total Tests:** 19 integration tests + 3 utility tests = 22 tests
- **Commands Covered:** 7 IPC commands (100% coverage)
- **Test Utilities:** 8 helper functions
- **Execution Time:** ~3-5 seconds for full suite

### Test Files

1. **tests/integration_tests.rs** - Main integration test suite
   - 19 comprehensive tests covering all IPC commands
   - Tests for happy paths, error cases, and edge cases
   - Includes transaction integrity and CASCADE delete tests

2. **tests/test_utils.rs** - Test utilities and helpers
   - Setup and teardown functions
   - Mock data generators
   - Database assertion helpers
   - 3 utility validation tests

3. **src/database.rs** - Database module with test support
   - Connection pool management
   - Migration system
   - Test database creation function
   - 2 database unit tests

4. **src/commands.rs** - IPC command implementations
   - All 7 commands fully implemented with real database operations
   - Transaction support for atomic operations
   - Comprehensive error handling

## Test Coverage by Command

### 1. greet (3 tests)
- ✅ Basic greeting with name
- ✅ Empty name edge case
- ✅ Special characters in name

### 2. save_project (6 tests)
- ✅ Create new project with messages
- ✅ Update existing project
- ✅ Empty messages list
- ✅ Special characters in project name
- ✅ Large message content (10k chars)
- ✅ Transaction integrity

### 3. load_project (2 tests)
- ✅ Load existing project with messages
- ✅ Not found error handling

### 4. list_projects (2 tests)
- ✅ Empty project list
- ✅ Multiple projects with ordering

### 5. delete_project (2 tests)
- ✅ Delete project with CASCADE
- ✅ Not found error handling

### 6. save_settings (2 tests)
- ✅ Save new settings
- ✅ Update existing settings (UPSERT)

### 7. load_settings (2 tests)
- ✅ Load with default values
- ✅ Load with saved values

## Running Tests

### Option 1: Use Test Runner Script (Recommended)

```bash
# Run all tests
./run-tests.sh

# Run with verbose output
./run-tests.sh -v

# Run specific test pattern
./run-tests.sh -p test_save_project_create_new

# Run all save_project tests
./run-tests.sh -p save_project -v

# Get help
./run-tests.sh -h
```

### Option 2: Direct Cargo Commands

```bash
cd vibing2-desktop/src-tauri

# Run all tests
cargo test

# Run only integration tests
cargo test --test integration_tests

# Run only utility tests
cargo test --test test_utils

# Run database module tests
cargo test --lib database

# Run specific test
cargo test test_greet_command

# Run with output
cargo test -- --nocapture

# Run with backtrace
RUST_BACKTRACE=1 cargo test
```

## Test Architecture

### Database Isolation

Each test uses its own temporary SQLite database:

```rust
let (pool, _temp_db) = test_utils::setup_test_db().await;
std::env::set_var("TEST_DATABASE_PATH", pool.connect_options().get_filename());

// ... run tests ...

test_utils::cleanup_test_db(pool).await;
std::env::remove_var("TEST_DATABASE_PATH");
```

### Serial Execution

Tests use the `#[serial]` attribute to prevent race conditions:

```rust
#[tokio::test]
#[serial]
async fn test_save_project_create_new() {
    // Test implementation
}
```

### Test Utilities

Helper functions simplify test setup and assertions:

```rust
// Setup
let (pool, _temp_db) = test_utils::setup_test_db().await;

// Insert test data
test_utils::insert_test_project(&pool, "proj-1", "Test Project").await;
test_utils::insert_test_messages(&pool, "proj-1", 5).await;

// Assertions
test_utils::assert_project_exists(&pool, "proj-1").await;
test_utils::assert_message_count(&pool, "proj-1", 5).await;

// Cleanup
test_utils::cleanup_test_db(pool).await;
```

## Key Features

### 1. Comprehensive Coverage
- Every IPC command has multiple test cases
- Happy paths and error cases covered
- Edge cases like special characters, empty data, large content

### 2. Database Testing
- Real SQLite database operations (not mocked)
- Transaction testing with rollback verification
- CASCADE delete validation
- UPSERT operation verification

### 3. Isolation
- Each test uses its own temporary database
- No shared state between tests
- Clean setup and teardown

### 4. Async Testing
- Uses tokio async runtime
- Proper async/await handling
- Real async database operations

### 5. Error Handling
- Tests for not found errors
- Validates error messages
- Ensures proper Result types

## Test Data

### Mock Project Request
```rust
SaveProjectRequest {
    project_id: None,
    name: "Test Project".to_string(),
    project_type: "web-app".to_string(),
    active_agents: "[]".to_string(),
    messages: vec![
        Message {
            id: "msg-1".to_string(),
            role: "user".to_string(),
            content: "Create a todo app".to_string(),
        },
    ],
    current_code: Some("console.log('Hello');".to_string()),
}
```

### Mock Settings
```rust
Settings {
    anthropic_api_key: Some("test-api-key".to_string()),
    theme: "dark".to_string(),
    auto_save: true,
    default_project_path: "/tmp/test-projects".to_string(),
}
```

## Dependencies

Test dependencies are managed in `Cargo.toml`:

```toml
[dev-dependencies]
tempfile = "3"          # Temporary file creation
tokio-test = "0.4"      # Tokio testing utilities
serial_test = "3"       # Serialize test execution
```

Runtime dependencies include:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
rand = "0.8"
```

## Troubleshooting

### Issue: "no such file or directory"
**Solution:** Ensure you're in the correct directory:
```bash
cd vibing2-desktop
./run-tests.sh
```

### Issue: "database is locked"
**Solution:** Tests already use `#[serial]`. If issue persists, check for orphaned connections.

### Issue: Tests fail intermittently
**Solution:** Verify all tests have proper cleanup:
```rust
test_utils::cleanup_test_db(pool).await;
std::env::remove_var("TEST_DATABASE_PATH");
```

### Issue: Compilation errors
**Solution:** Update dependencies:
```bash
cd src-tauri
cargo update
cargo build
```

## Performance

Expected test execution times:

| Test Type | Time |
|-----------|------|
| Single unit test | 10-50ms |
| Single integration test | 50-200ms |
| Full test suite | 3-5s |
| Setup/teardown | 20-50ms |

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Cache cargo registry
        uses: actions/cache@v3
        with:
          path: ~/.cargo/registry
          key: ${{ runner.os }}-cargo-registry-${{ hashFiles('**/Cargo.lock') }}

      - name: Cache cargo index
        uses: actions/cache@v3
        with:
          path: ~/.cargo/git
          key: ${{ runner.os }}-cargo-git-${{ hashFiles('**/Cargo.lock') }}

      - name: Cache cargo build
        uses: actions/cache@v3
        with:
          path: vibing2-desktop/src-tauri/target
          key: ${{ runner.os }}-cargo-build-target-${{ hashFiles('**/Cargo.lock') }}

      - name: Run tests
        run: cd vibing2-desktop/src-tauri && cargo test --verbose
```

## Best Practices

1. ✅ **Write tests first** - Follow TDD principles
2. ✅ **Test in isolation** - Each test should be independent
3. ✅ **Use descriptive names** - Test names should explain what's being tested
4. ✅ **Test happy and sad paths** - Cover both success and error cases
5. ✅ **Clean up resources** - Always close connections and remove temp files
6. ✅ **Avoid flaky tests** - Use serial execution for database tests
7. ✅ **Keep tests fast** - Minimize setup/teardown overhead
8. ✅ **Document edge cases** - Comment why specific edge cases are tested

## Next Steps

After running tests successfully:

1. Review test coverage reports
2. Add tests for any new features
3. Update tests when modifying commands
4. Run tests before committing changes
5. Configure CI/CD pipeline
6. Monitor test execution times

## Additional Resources

- [Full Testing Guide](./TESTING_GUIDE.md) - Comprehensive documentation
- [Tauri Testing Docs](https://tauri.app/v1/guides/testing/)
- [SQLx Documentation](https://github.com/launchbadge/sqlx)
- [Rust Testing Book](https://doc.rust-lang.org/book/ch11-00-testing.html)

## Support

For questions or issues:
1. Check the [TESTING_GUIDE.md](./TESTING_GUIDE.md)
2. Review test output and error messages
3. Inspect test utilities in `tests/test_utils.rs`
4. Open an issue in the project repository

---

**Last Updated:** 2025-10-12
**Version:** 1.0.0
**Test Suite Status:** ✅ All tests passing
