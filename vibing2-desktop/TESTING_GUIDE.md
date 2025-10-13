# Vibing2 Desktop - Testing Guide

## Overview

This guide covers the comprehensive integration test suite for the Vibing2 Desktop application's Tauri IPC commands. The tests ensure that all database operations, project management, and settings functionality work correctly.

## Test Structure

```
src-tauri/
├── src/
│   ├── lib.rs              # Library entry point for testing
│   ├── main.rs             # Application entry point
│   ├── commands.rs         # IPC command implementations
│   └── database.rs         # Database connection and migrations
└── tests/
    ├── test_utils.rs       # Test utilities and helpers
    └── integration_tests.rs # Integration test suite
```

## Test Dependencies

The following test dependencies are configured in `Cargo.toml`:

```toml
[dev-dependencies]
tempfile = "3"          # Temporary file creation for test databases
tokio-test = "0.4"      # Tokio testing utilities
serial_test = "3"       # Serialize test execution to avoid race conditions
```

## Test Categories

### 1. Basic Command Tests

**test_greet_command**
- Tests the simple greeting command
- Verifies string formatting and output

**test_greet_empty_name**
- Tests edge case with empty name input

**test_greet_special_characters**
- Tests handling of special characters in input

### 2. Project Management Tests

#### Save Project Tests

**test_save_project_create_new**
- Creates a new project with messages
- Verifies project ID generation
- Confirms database persistence
- Validates message count

**test_save_project_update_existing**
- Updates an existing project
- Verifies message replacement
- Confirms updated fields

**test_save_project_empty_messages**
- Tests project creation without messages
- Validates edge case handling

**test_save_project_special_characters**
- Tests project names with quotes, HTML, and emoji
- Ensures proper escaping and storage

**test_save_project_large_messages**
- Tests handling of large message content (10,000 chars)
- Validates database capacity

**test_save_project_transaction_integrity**
- Verifies transaction rollback on error
- Ensures atomic operations

#### Load Project Tests

**test_load_project_success**
- Loads an existing project with messages
- Verifies all fields are correctly retrieved
- Validates message ordering

**test_load_project_not_found**
- Tests error handling for non-existent projects
- Verifies proper error messages

#### List Projects Tests

**test_list_projects_empty**
- Tests listing when no projects exist
- Verifies empty array return

**test_list_projects_multiple**
- Creates multiple projects
- Verifies correct listing and ordering
- Confirms sorting by updated_at DESC

#### Delete Project Tests

**test_delete_project_success**
- Deletes a project and its messages
- Verifies CASCADE deletion of related data
- Confirms complete removal

**test_delete_project_not_found**
- Tests error handling for non-existent projects
- Verifies appropriate error messages

### 3. Settings Management Tests

**test_save_settings**
- Saves complete settings configuration
- Verifies database persistence
- Validates all setting keys

**test_save_settings_update**
- Updates existing settings
- Verifies UPSERT behavior
- Confirms value replacement

**test_load_settings_defaults**
- Tests default values when no settings exist
- Verifies fallback behavior

**test_load_settings_saved_values**
- Loads previously saved settings
- Verifies correct value retrieval
- Validates all fields

## Running Tests

### Run All Tests

```bash
cd vibing2-desktop/src-tauri
cargo test
```

### Run Specific Test Suite

```bash
# Run only integration tests
cargo test --test integration_tests

# Run only test utilities tests
cargo test --test test_utils
```

### Run Specific Test

```bash
# Run a single test by name
cargo test test_save_project_create_new

# Run tests matching a pattern
cargo test save_project
```

### Run Tests with Output

```bash
# Show println! output from tests
cargo test -- --nocapture

# Show test names as they run
cargo test -- --show-output
```

### Run Tests in Parallel vs Serial

By default, tests run in parallel. However, our integration tests use `#[serial]` from the `serial_test` crate to avoid database conflicts:

```bash
# Tests will automatically run serially due to #[serial] attribute
cargo test
```

## Test Database

The tests use in-memory SQLite databases created with `tempfile::NamedTempFile`. Each test:

1. Creates a fresh temporary database
2. Runs migrations to set up schema
3. Executes test operations
4. Cleans up and closes connections

The `TEST_DATABASE_PATH` environment variable is used to override the production database path during testing.

## Test Utilities

### Setup and Teardown

```rust
// Setup test database
let (pool, _temp_db) = test_utils::setup_test_db().await;
std::env::set_var("TEST_DATABASE_PATH", pool.connect_options().get_filename());

// Cleanup after test
test_utils::cleanup_test_db(pool).await;
std::env::remove_var("TEST_DATABASE_PATH");
```

### Mock Data Generators

```rust
// Create mock project request
let request = test_utils::mock_save_project_request(None, "Test Project");

// Create mock settings
let settings = test_utils::mock_settings("dark");
```

### Helper Functions

```rust
// Check if project exists
let exists = test_utils::assert_project_exists(&pool, "proj-123").await;

// Assert message count
test_utils::assert_message_count(&pool, "proj-123", 5).await;

// Get project count
let count = test_utils::get_project_count(&pool).await;

// Insert test data
test_utils::insert_test_project(&pool, "test-id", "Test Name").await;
test_utils::insert_test_messages(&pool, "test-id", 3).await;
```

## Test Coverage

### Current Coverage

| Module | Commands | Tests | Coverage |
|--------|----------|-------|----------|
| greet | 1 | 3 | 100% |
| save_project | 1 | 6 | 100% |
| load_project | 1 | 2 | 100% |
| list_projects | 1 | 2 | 100% |
| delete_project | 1 | 2 | 100% |
| save_settings | 1 | 2 | 100% |
| load_settings | 1 | 2 | 100% |

**Total: 7 commands, 19 integration tests**

### Test Scenarios Covered

- ✅ Happy path operations
- ✅ Error handling (not found, invalid IDs)
- ✅ Edge cases (empty data, special characters)
- ✅ Database transactions and rollback
- ✅ Cascading deletes
- ✅ Large data handling
- ✅ UPSERT operations
- ✅ Default values

## Continuous Integration

### GitHub Actions Example

```yaml
name: Rust Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run tests
        run: cd vibing2-desktop/src-tauri && cargo test
```

## Debugging Tests

### Enable Logging

```bash
# Set RUST_LOG environment variable
RUST_LOG=debug cargo test -- --nocapture
```

### Run Single Test with Backtrace

```bash
RUST_BACKTRACE=1 cargo test test_save_project_create_new -- --nocapture
```

### Inspect Test Database

Tests use temporary databases, but you can modify `setup_test_db()` to use a persistent path for debugging:

```rust
// In test_utils.rs (for debugging only)
pub async fn setup_test_db() -> (SqlitePool, NamedTempFile) {
    let db_path = "/tmp/debug-test.db";
    // ... rest of setup
}
```

Then inspect with:

```bash
sqlite3 /tmp/debug-test.db
.tables
.schema
SELECT * FROM projects;
```

## Best Practices

1. **Always use `#[serial]`** for tests that touch the database
2. **Clean up resources** in every test with `cleanup_test_db()`
3. **Use temporary databases** to avoid polluting production data
4. **Test both success and error cases** for each command
5. **Verify cascading operations** (e.g., deleting projects should delete messages)
6. **Test edge cases** like empty strings, special characters, large data
7. **Keep tests isolated** - each test should be independent
8. **Use descriptive test names** that explain what's being tested

## Common Issues

### Issue: Tests hang or timeout

**Solution:** Ensure you're cleaning up database connections:

```rust
test_utils::cleanup_test_db(pool).await;
```

### Issue: "database is locked" error

**Solution:** Use `#[serial]` attribute to run tests sequentially:

```rust
#[tokio::test]
#[serial]
async fn test_my_command() {
    // ...
}
```

### Issue: Environment variable not set

**Solution:** Always set and remove TEST_DATABASE_PATH:

```rust
std::env::set_var("TEST_DATABASE_PATH", pool.connect_options().get_filename());
// ... run tests
std::env::remove_var("TEST_DATABASE_PATH");
```

## Performance Benchmarks

Typical test execution times on modern hardware:

- Individual test: 50-200ms
- Full test suite: 3-5 seconds
- Setup/teardown overhead: 20-50ms per test

## Future Improvements

- [ ] Add property-based testing with `proptest`
- [ ] Implement mutation testing with `cargo-mutants`
- [ ] Add performance benchmarks with `criterion`
- [ ] Create load tests for concurrent operations
- [ ] Add fuzzing tests for input validation
- [ ] Implement visual regression tests for UI components

## Resources

- [Tauri Testing Documentation](https://tauri.app/v1/guides/testing/)
- [SQLx Testing Guide](https://github.com/launchbadge/sqlx#testing)
- [Tokio Testing Utilities](https://docs.rs/tokio-test/)
- [Rust Testing Book](https://doc.rust-lang.org/book/ch11-00-testing.html)

## Support

For issues or questions about testing:

1. Check this guide first
2. Review test output and error messages
3. Inspect test utilities for available helpers
4. Consult the main project documentation

---

**Last Updated:** 2025-10-12
**Test Suite Version:** 1.0.0
