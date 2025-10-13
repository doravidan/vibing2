use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::sync::Arc;
use tokio::sync::OnceCell;

/// Global database pool
static DB_POOL: OnceCell<Arc<SqlitePool>> = OnceCell::const_new();

/// Get the database pool
/// For testing, this will create a new pool each time if TEST_DATABASE_PATH is set
pub async fn get_pool() -> Result<Arc<SqlitePool>, sqlx::Error> {
    // If in test mode with TEST_DATABASE_PATH set, create a new pool directly
    if let Ok(test_db_path) = std::env::var("TEST_DATABASE_PATH") {
        let db_url = format!("sqlite:{}", test_db_path);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await?;
        return Ok(Arc::new(pool));
    }

    // Otherwise use the cached pool
    DB_POOL
        .get_or_try_init(|| async {
            let db_path = get_db_path();
            let db_url = format!("sqlite:{}", db_path.display());
            println!("Database path: {}", db_url);

            // Create directory if it doesn't exist
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).expect("Failed to create database directory");
            }

            // Create connection pool
            let pool = SqlitePoolOptions::new()
                .max_connections(5)
                .connect(&db_url)
                .await?;

            Ok(Arc::new(pool))
        })
        .await
        .map(|pool| pool.clone())
}

/// Get database path (can be overridden for testing)
pub fn get_db_path() -> std::path::PathBuf {
    // Check if we're in test mode
    if let Ok(test_db) = std::env::var("TEST_DATABASE_PATH") {
        return std::path::PathBuf::from(test_db);
    }

    // Production path
    dirs::data_local_dir()
        .expect("Failed to get local data directory")
        .join("com.vibing2.desktop")
        .join("vibing2.db")
}

/// Create a test database pool (for testing only)
pub async fn create_test_pool(db_path: &str) -> Result<SqlitePool, sqlx::Error> {
    let db_url = format!("sqlite:{}", db_path);

    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // Run migrations on test database
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Initialize the database and run migrations
pub async fn init_database() -> Result<(), sqlx::Error> {
    let pool = get_pool().await?;
    run_migrations(&pool).await?;
    println!("✅ Database initialized successfully");
    Ok(())
}

/// Run database migrations
async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            email_verified TEXT,
            password TEXT NOT NULL,
            image TEXT,
            plan TEXT DEFAULT 'FREE' NOT NULL,
            token_balance INTEGER DEFAULT 10000 NOT NULL,
            context_used REAL DEFAULT 0 NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create projects table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            project_type TEXT NOT NULL,
            active_agents TEXT DEFAULT '[]' NOT NULL,
            current_code TEXT,
            visibility TEXT DEFAULT 'PRIVATE' NOT NULL,
            likes INTEGER DEFAULT 0 NOT NULL,
            forks INTEGER DEFAULT 0 NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create project_files table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS project_files (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            path TEXT NOT NULL,
            content TEXT NOT NULL,
            language TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, path)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create messages table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create settings table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY NOT NULL,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create auth_credentials table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS auth_credentials (
            id INTEGER PRIMARY KEY DEFAULT 1,
            api_key TEXT NOT NULL,
            email TEXT,
            subscription_tier TEXT,
            last_validated TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create default user if not exists
    let user_count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;

    if user_count == 0 {
        sqlx::query(
            r#"
            INSERT INTO users (id, name, email, password, plan, token_balance)
            VALUES ('local-user', 'Local User', 'local@vibing2.app', 'local', 'FREE', 10000)
            "#,
        )
        .execute(pool)
        .await?;

        println!("✅ Created default local user");
    }

    println!("✅ Database migrations completed");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_create_test_pool() {
        let temp_db = NamedTempFile::new().unwrap();
        let pool = create_test_pool(temp_db.path().to_str().unwrap())
            .await
            .unwrap();

        // Verify tables were created
        let result: i32 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(result, 1);
    }

    #[tokio::test]
    async fn test_migrations_create_default_user() {
        let temp_db = NamedTempFile::new().unwrap();
        let pool = create_test_pool(temp_db.path().to_str().unwrap())
            .await
            .unwrap();

        // Verify default user exists
        let count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE id = 'local-user'")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(count, 1);
    }
}
