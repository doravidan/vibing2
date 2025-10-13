/// Test utilities for integration tests
use serde_json::json;
use sqlx::SqlitePool;
use tempfile::NamedTempFile;

/// Setup test database and return pool with path
pub async fn setup_test_db() -> (SqlitePool, NamedTempFile, String) {
    let temp_db = NamedTempFile::new().expect("Failed to create temp database file");
    let db_path = temp_db.path().to_str().expect("Invalid temp path").to_string();

    let pool = vibing2_desktop::database::create_test_pool(&db_path)
        .await
        .expect("Failed to create test pool");

    (pool, temp_db, db_path)
}

/// Cleanup test database
pub async fn cleanup_test_db(pool: SqlitePool) {
    pool.close().await;
}

/// Create a mock project request
pub fn mock_save_project_request(
    project_id: Option<String>,
    name: &str,
) -> serde_json::Value {
    json!({
        "project_id": project_id,
        "name": name,
        "project_type": "web-app",
        "active_agents": "[]",
        "messages": [
            {
                "id": format!("msg-{}", uuid::Uuid::new_v4()),
                "role": "user",
                "content": "Create a todo app"
            },
            {
                "id": format!("msg-{}", uuid::Uuid::new_v4()),
                "role": "assistant",
                "content": "I'll create a todo app for you."
            }
        ],
        "current_code": "console.log('Hello World');"
    })
}

/// Create a mock settings object
pub fn mock_settings(theme: &str) -> serde_json::Value {
    json!({
        "anthropic_api_key": "test-api-key",
        "theme": theme,
        "auto_save": true,
        "default_project_path": "/tmp/test-projects"
    })
}

/// Assert project exists in database
pub async fn assert_project_exists(pool: &SqlitePool, project_id: &str) -> bool {
    let result: Option<(String,)> = sqlx::query_as("SELECT id FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_optional(pool)
        .await
        .expect("Failed to query project");

    result.is_some()
}

/// Assert message count for project
pub async fn assert_message_count(pool: &SqlitePool, project_id: &str, expected: i32) {
    let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM messages WHERE project_id = ?")
        .bind(project_id)
        .fetch_one(pool)
        .await
        .expect("Failed to count messages");

    assert_eq!(count, expected, "Expected {} messages, found {}", expected, count);
}

/// Get project count
pub async fn get_project_count(pool: &SqlitePool) -> i32 {
    sqlx::query_scalar("SELECT COUNT(*) FROM projects")
        .fetch_one(pool)
        .await
        .expect("Failed to count projects")
}

/// Insert test project directly
pub async fn insert_test_project(
    pool: &SqlitePool,
    id: &str,
    name: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO projects (id, name, project_type, active_agents, user_id, created_at, updated_at)
        VALUES (?, ?, 'test-type', '[]', 'local-user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(id)
    .bind(name)
    .execute(pool)
    .await?;

    Ok(())
}

/// Insert test messages
pub async fn insert_test_messages(
    pool: &SqlitePool,
    project_id: &str,
    count: i32,
) -> Result<(), sqlx::Error> {
    for i in 0..count {
        let msg_id = format!("msg-{}-{}", project_id, i);
        sqlx::query(
            r#"
            INSERT INTO messages (id, role, content, project_id, created_at)
            VALUES (?, 'user', ?, ?, CURRENT_TIMESTAMP)
            "#,
        )
        .bind(&msg_id)
        .bind(format!("Test message {}", i))
        .bind(project_id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Get setting value
pub async fn get_setting_value(pool: &SqlitePool, key: &str) -> Option<String> {
    sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .expect("Failed to fetch setting")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_setup_test_db() {
        let (pool, _temp_db, _db_path) = setup_test_db().await;

        // Verify default user exists
        let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE id = 'local-user'")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(count, 1);
        cleanup_test_db(pool).await;
    }

    #[tokio::test]
    async fn test_insert_test_project() {
        let (pool, _temp_db, _db_path) = setup_test_db().await;

        insert_test_project(&pool, "test-proj-1", "Test Project").await.unwrap();

        let exists = assert_project_exists(&pool, "test-proj-1").await;
        assert!(exists);

        cleanup_test_db(pool).await;
    }

    #[tokio::test]
    async fn test_insert_test_messages() {
        let (pool, _temp_db, _db_path) = setup_test_db().await;

        insert_test_project(&pool, "test-proj-1", "Test Project").await.unwrap();
        insert_test_messages(&pool, "test-proj-1", 3).await.unwrap();

        assert_message_count(&pool, "test-proj-1", 3).await;

        cleanup_test_db(pool).await;
    }
}
