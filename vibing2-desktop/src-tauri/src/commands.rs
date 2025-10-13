use serde::{Deserialize, Serialize};
use sqlx::Row;
use chrono::Utc;
use rand::Rng;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub active_agents: String,
    pub current_code: Option<String>,
    pub visibility: String,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectWithMessages {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub active_agents: String,
    pub current_code: Option<String>,
    pub visibility: String,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<Message>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveProjectRequest {
    pub project_id: Option<String>,
    pub name: String,
    pub project_type: String,
    pub active_agents: String,
    pub messages: Vec<Message>,
    pub current_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub anthropic_api_key: Option<String>,
    pub theme: String,
    pub auto_save: bool,
    pub default_project_path: String,
}

/// Generate a CUID-like ID using timestamp
fn generate_id(prefix: &str) -> String {
    let timestamp = Utc::now().timestamp_millis();
    let mut rng = rand::thread_rng();
    let random_suffix: String = (0..6)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            "0123456789abcdefghijklmnopqrstuvwxyz".chars().nth(idx).unwrap()
        })
        .collect();
    format!("{}-{}{}", prefix, timestamp, random_suffix)
}

/// Simple greeting command for testing
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Vibing2 Desktop.", name)
}

/// Save a project to the local database
#[tauri::command]
pub async fn save_project(request: SaveProjectRequest) -> Result<String, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    // Start a transaction
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Determine if this is an insert or update
    let project_id = request.project_id.clone().unwrap_or_else(|| generate_id("proj"));
    let now = Utc::now().to_rfc3339();

    // Check if project exists
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM projects WHERE id = ?"
    )
    .bind(&project_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Failed to check existing project: {}", e))?;

    if existing.is_some() {
        // Update existing project
        sqlx::query(
            r#"
            UPDATE projects
            SET name = ?,
                project_type = ?,
                active_agents = ?,
                current_code = ?,
                updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(&request.name)
        .bind(&request.project_type)
        .bind(&request.active_agents)
        .bind(&request.current_code)
        .bind(&now)
        .bind(&project_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update project: {}", e))?;

        // Delete existing messages for this project
        sqlx::query("DELETE FROM messages WHERE project_id = ?")
            .bind(&project_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to delete old messages: {}", e))?;

        println!("📝 Updated project: {}", project_id);
    } else {
        // Insert new project
        sqlx::query(
            r#"
            INSERT INTO projects (id, name, project_type, active_agents, current_code, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'local-user', ?, ?)
            "#
        )
        .bind(&project_id)
        .bind(&request.name)
        .bind(&request.project_type)
        .bind(&request.active_agents)
        .bind(&request.current_code)
        .bind(&now)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert project: {}", e))?;

        println!("📝 Created new project: {}", project_id);
    }

    // Insert messages
    for message in &request.messages {
        sqlx::query(
            r#"
            INSERT INTO messages (id, role, content, project_id, created_at)
            VALUES (?, ?, ?, ?, ?)
            "#
        )
        .bind(&message.id)
        .bind(&message.role)
        .bind(&message.content)
        .bind(&project_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert message: {}", e))?;
    }

    // Commit transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    println!("✅ Project saved successfully: {}", project_id);
    Ok(project_id)
}

/// Load a project from the local database
#[tauri::command]
pub async fn load_project(project_id: String) -> Result<ProjectWithMessages, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    // Fetch project
    let row = sqlx::query(
        r#"
        SELECT id, name, description, project_type, active_agents, current_code,
               visibility, user_id, created_at, updated_at
        FROM projects
        WHERE id = ?
        "#
    )
    .bind(&project_id)
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|e| format!("Failed to fetch project: {}", e))?
    .ok_or_else(|| format!("Project not found: {}", project_id))?;

    let project = Project {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        project_type: row.get("project_type"),
        active_agents: row.get("active_agents"),
        current_code: row.get("current_code"),
        visibility: row.get("visibility"),
        user_id: row.get("user_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    // Fetch messages
    let message_rows = sqlx::query(
        r#"
        SELECT id, role, content
        FROM messages
        WHERE project_id = ?
        ORDER BY created_at ASC
        "#
    )
    .bind(&project_id)
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| format!("Failed to fetch messages: {}", e))?;

    let messages: Vec<Message> = message_rows
        .iter()
        .map(|row| Message {
            id: row.get("id"),
            role: row.get("role"),
            content: row.get("content"),
        })
        .collect();

    println!("📂 Loaded project: {} with {} messages", project_id, messages.len());

    Ok(ProjectWithMessages {
        id: project.id,
        name: project.name,
        description: project.description,
        project_type: project.project_type,
        active_agents: project.active_agents,
        current_code: project.current_code,
        visibility: project.visibility,
        user_id: project.user_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        messages,
    })
}

/// List all projects for the local user
#[tauri::command]
pub async fn list_projects() -> Result<Vec<Project>, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    let rows = sqlx::query(
        r#"
        SELECT id, name, description, project_type, active_agents, current_code,
               visibility, user_id, created_at, updated_at
        FROM projects
        WHERE user_id = 'local-user'
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| format!("Failed to fetch projects: {}", e))?;

    let projects: Vec<Project> = rows
        .iter()
        .map(|row| Project {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            project_type: row.get("project_type"),
            active_agents: row.get("active_agents"),
            current_code: row.get("current_code"),
            visibility: row.get("visibility"),
            user_id: row.get("user_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    println!("📋 Listed {} projects", projects.len());
    Ok(projects)
}

/// Delete a project from the local database
#[tauri::command]
pub async fn delete_project(project_id: String) -> Result<(), String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    // SQLite CASCADE will automatically delete messages and files
    let result = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&project_id)
        .execute(pool.as_ref())
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    if result.rows_affected() == 0 {
        return Err(format!("Project not found: {}", project_id));
    }

    println!("🗑️  Deleted project: {}", project_id);
    Ok(())
}

/// Save settings to local storage
#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    let now = Utc::now().to_rfc3339();

    // Upsert each setting
    let settings_map = vec![
        (
            "anthropic_api_key",
            settings.anthropic_api_key.unwrap_or_default(),
        ),
        ("theme", settings.theme),
        ("auto_save", settings.auto_save.to_string()),
        ("default_project_path", settings.default_project_path),
    ];

    for (key, value) in settings_map {
        sqlx::query(
            r#"
            INSERT INTO settings (id, key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
            "#
        )
        .bind(generate_id("setting"))
        .bind(key)
        .bind(&value)
        .bind(&now)
        .bind(&value)
        .bind(&now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| format!("Failed to save setting {}: {}", key, e))?;
    }

    println!("⚙️  Settings saved successfully");
    Ok(())
}

/// Load settings from local storage
#[tauri::command]
pub async fn load_settings() -> Result<Settings, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Failed to get database pool: {}", e))?;

    let rows = sqlx::query("SELECT key, value FROM settings")
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| format!("Failed to fetch settings: {}", e))?;

    let mut anthropic_api_key: Option<String> = None;
    let mut theme = String::from("dark");
    let mut auto_save = true;
    let mut default_project_path = String::from("~/Documents/Vibing2Projects");

    for row in rows {
        let key: String = row.get("key");
        let value: String = row.get("value");

        match key.as_str() {
            "anthropic_api_key" => {
                if !value.is_empty() {
                    anthropic_api_key = Some(value);
                }
            }
            "theme" => theme = value,
            "auto_save" => auto_save = value.parse().unwrap_or(true),
            "default_project_path" => default_project_path = value,
            _ => {}
        }
    }

    println!("⚙️  Settings loaded successfully");

    Ok(Settings {
        anthropic_api_key,
        theme,
        auto_save,
        default_project_path,
    })
}

// ============================================================================
// Authentication Commands
// ============================================================================

/// Check Claude Code authentication status
/// Tries keychain first, then database, returns authentication state
#[tauri::command]
pub async fn check_claude_auth() -> Result<crate::auth::AuthStatus, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    crate::auth::check_auth_status(pool.as_ref()).await
}

/// Save API key manually after validation
/// Validates with Anthropic API before storing
#[tauri::command]
pub async fn save_api_key(api_key: String, email: Option<String>) -> Result<(), String> {
    println!("🔐 Validating API key...");

    // Validate API key with Anthropic
    let is_valid = crate::auth::validate_api_key(&api_key)
        .await
        .map_err(|e| format!("Validation failed: {}", e))?;

    if !is_valid {
        return Err("Invalid API key - authentication failed with Anthropic API".to_string());
    }

    println!("✅ API key validated successfully");

    // Store in database
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    crate::auth::store_credentials_in_db(
        pool.as_ref(),
        &api_key,
        email.as_deref(),
        None, // subscription_tier - can be added later
    )
    .await?;

    println!("✅ API key saved to database");

    Ok(())
}

/// Get current credentials from database
/// Returns stored Claude credentials if available
#[tauri::command]
pub async fn get_credentials() -> Result<crate::auth::ClaudeCredentials, String> {
    let pool = crate::database::get_pool()
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    crate::auth::load_credentials_from_db(pool.as_ref()).await
}

// ============================================================================
// System Tray Commands
// ============================================================================

/// Update the system tray menu with current recent projects
/// Call this after creating, updating, or deleting projects
#[tauri::command]
pub async fn update_tray_menu(app: tauri::AppHandle) -> Result<(), String> {
    crate::tray::update_tray_menu(&app)
        .map_err(|e| format!("Failed to update tray menu: {}", e))
}

/// Set a badge on the system tray icon (macOS only)
/// Pass None or empty string to remove badge
#[tauri::command]
pub async fn set_tray_badge(app: tauri::AppHandle, badge: Option<String>) -> Result<(), String> {
    crate::tray::set_tray_badge(&app, badge.as_deref())
        .map_err(|e| format!("Failed to set tray badge: {}", e))
}
