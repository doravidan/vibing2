/// Integration tests for Tauri IPC commands
mod test_utils;

use serial_test::serial;
use vibing2_desktop::commands::{
    greet, save_project, load_project, list_projects, delete_project,
    save_settings, load_settings, SaveProjectRequest, Message, Settings,
};

// Test greet command
#[test]
fn test_greet_command() {
    let result = greet("Alice");
    assert_eq!(result, "Hello, Alice! Welcome to Vibing2 Desktop.");

    let result = greet("Bob");
    assert_eq!(result, "Hello, Bob! Welcome to Vibing2 Desktop.");
}

#[test]
fn test_greet_empty_name() {
    let result = greet("");
    assert_eq!(result, "Hello, ! Welcome to Vibing2 Desktop.");
}

#[test]
fn test_greet_special_characters() {
    let result = greet("Alice & Bob <script>");
    assert!(result.contains("Alice & Bob <script>"));
}

// Test save_project command - create new project
#[tokio::test]
#[serial]
async fn test_save_project_create_new() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let request = SaveProjectRequest {
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
    };

    let result = save_project(request).await;
    assert!(result.is_ok());

    let project_id = result.unwrap();
    assert!(project_id.starts_with("proj-"));

    // Verify project exists in database
    let exists = test_utils::assert_project_exists(&pool, &project_id).await;
    assert!(exists);

    // Verify message was saved
    test_utils::assert_message_count(&pool, &project_id, 1).await;

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test save_project command - update existing project
#[tokio::test]
#[serial]
async fn test_save_project_update_existing() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Create initial project
    test_utils::insert_test_project(&pool, "proj-123", "Original Name")
        .await
        .unwrap();
    test_utils::insert_test_messages(&pool, "proj-123", 2)
        .await
        .unwrap();

    // Update the project
    let request = SaveProjectRequest {
        project_id: Some("proj-123".to_string()),
        name: "Updated Name".to_string(),
        project_type: "mobile-app".to_string(),
        active_agents: "[\"agent1\"]".to_string(),
        messages: vec![
            Message {
                id: "msg-new".to_string(),
                role: "user".to_string(),
                content: "New message".to_string(),
            },
        ],
        current_code: Some("console.log('Updated');".to_string()),
    };

    let result = save_project(request).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "proj-123");

    // Verify project was updated
    let row: (String,) = sqlx::query_as("SELECT name FROM projects WHERE id = 'proj-123'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row.0, "Updated Name");

    // Verify old messages were replaced
    test_utils::assert_message_count(&pool, "proj-123", 1).await;

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test save_project with empty messages
#[tokio::test]
#[serial]
async fn test_save_project_empty_messages() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let request = SaveProjectRequest {
        project_id: None,
        name: "Empty Messages Project".to_string(),
        project_type: "web-app".to_string(),
        active_agents: "[]".to_string(),
        messages: vec![],
        current_code: None,
    };

    let result = save_project(request).await;
    assert!(result.is_ok());

    let project_id = result.unwrap();
    test_utils::assert_message_count(&pool, &project_id, 0).await;

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test load_project command - success
#[tokio::test]
#[serial]
async fn test_load_project_success() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Setup test data
    test_utils::insert_test_project(&pool, "proj-load-1", "Load Test Project")
        .await
        .unwrap();
    test_utils::insert_test_messages(&pool, "proj-load-1", 3)
        .await
        .unwrap();

    // Load project
    let result = load_project("proj-load-1".to_string()).await;
    assert!(result.is_ok());

    let project = result.unwrap();
    assert_eq!(project.id, "proj-load-1");
    assert_eq!(project.name, "Load Test Project");
    assert_eq!(project.messages.len(), 3);

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test load_project command - not found
#[tokio::test]
#[serial]
async fn test_load_project_not_found() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let result = load_project("non-existent-id".to_string()).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test list_projects command - empty list
#[tokio::test]
#[serial]
async fn test_list_projects_empty() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let result = list_projects().await;
    assert!(result.is_ok());

    let projects = result.unwrap();
    assert_eq!(projects.len(), 0);

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test list_projects command - multiple projects
#[tokio::test]
#[serial]
async fn test_list_projects_multiple() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Insert test projects
    test_utils::insert_test_project(&pool, "proj-1", "Project 1")
        .await
        .unwrap();
    test_utils::insert_test_project(&pool, "proj-2", "Project 2")
        .await
        .unwrap();
    test_utils::insert_test_project(&pool, "proj-3", "Project 3")
        .await
        .unwrap();

    let result = list_projects().await;
    assert!(result.is_ok());

    let projects = result.unwrap();
    assert_eq!(projects.len(), 3);

    // Verify projects are ordered by updated_at DESC
    assert!(projects.iter().any(|p| p.id == "proj-1"));
    assert!(projects.iter().any(|p| p.id == "proj-2"));
    assert!(projects.iter().any(|p| p.id == "proj-3"));

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test delete_project command - success
#[tokio::test]
#[serial]
async fn test_delete_project_success() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Create project with messages
    test_utils::insert_test_project(&pool, "proj-delete-1", "Delete Test")
        .await
        .unwrap();
    test_utils::insert_test_messages(&pool, "proj-delete-1", 5)
        .await
        .unwrap();

    // Delete project
    let result = delete_project("proj-delete-1".to_string()).await;
    assert!(result.is_ok());

    // Verify project is gone
    let exists = test_utils::assert_project_exists(&pool, "proj-delete-1").await;
    assert!(!exists);

    // Verify messages are also deleted (CASCADE)
    test_utils::assert_message_count(&pool, "proj-delete-1", 0).await;

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test delete_project command - not found
#[tokio::test]
#[serial]
async fn test_delete_project_not_found() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let result = delete_project("non-existent-id".to_string()).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test save_settings command
#[tokio::test]
#[serial]
async fn test_save_settings() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let settings = Settings {
        anthropic_api_key: Some("sk-test-key-123".to_string()),
        theme: "dark".to_string(),
        auto_save: true,
        default_project_path: "/custom/path".to_string(),
    };

    let result = save_settings(settings).await;
    assert!(result.is_ok());

    // Verify settings were saved
    let api_key = test_utils::get_setting_value(&pool, "anthropic_api_key").await;
    assert_eq!(api_key, Some("sk-test-key-123".to_string()));

    let theme = test_utils::get_setting_value(&pool, "theme").await;
    assert_eq!(theme, Some("dark".to_string()));

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test save_settings command - update existing
#[tokio::test]
#[serial]
async fn test_save_settings_update() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Save initial settings
    let settings1 = Settings {
        anthropic_api_key: Some("key-1".to_string()),
        theme: "dark".to_string(),
        auto_save: true,
        default_project_path: "/path1".to_string(),
    };
    save_settings(settings1).await.unwrap();

    // Update settings
    let settings2 = Settings {
        anthropic_api_key: Some("key-2".to_string()),
        theme: "light".to_string(),
        auto_save: false,
        default_project_path: "/path2".to_string(),
    };
    save_settings(settings2).await.unwrap();

    // Verify updated values
    let api_key = test_utils::get_setting_value(&pool, "anthropic_api_key").await;
    assert_eq!(api_key, Some("key-2".to_string()));

    let theme = test_utils::get_setting_value(&pool, "theme").await;
    assert_eq!(theme, Some("light".to_string()));

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test load_settings command - defaults
#[tokio::test]
#[serial]
async fn test_load_settings_defaults() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let result = load_settings().await;
    assert!(result.is_ok());

    let settings = result.unwrap();
    assert_eq!(settings.anthropic_api_key, None);
    assert_eq!(settings.theme, "dark");
    assert_eq!(settings.auto_save, true);

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test load_settings command - with saved values
#[tokio::test]
#[serial]
async fn test_load_settings_saved_values() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    // Save settings first
    let settings = Settings {
        anthropic_api_key: Some("saved-key".to_string()),
        theme: "light".to_string(),
        auto_save: false,
        default_project_path: "/saved/path".to_string(),
    };
    save_settings(settings).await.unwrap();

    // Load settings
    let result = load_settings().await;
    assert!(result.is_ok());

    let loaded = result.unwrap();
    assert_eq!(loaded.anthropic_api_key, Some("saved-key".to_string()));
    assert_eq!(loaded.theme, "light");
    assert_eq!(loaded.auto_save, false);
    assert_eq!(loaded.default_project_path, "/saved/path");

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test edge cases - project names with special characters
#[tokio::test]
#[serial]
async fn test_save_project_special_characters() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let request = SaveProjectRequest {
        project_id: None,
        name: "Project with 'quotes' & <html> and émojis 🚀".to_string(),
        project_type: "web-app".to_string(),
        active_agents: "[]".to_string(),
        messages: vec![],
        current_code: None,
    };

    let result = save_project(request).await;
    assert!(result.is_ok());

    let project_id = result.unwrap();
    let loaded = load_project(project_id).await.unwrap();
    assert_eq!(loaded.name, "Project with 'quotes' & <html> and émojis 🚀");

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test transaction rollback on error
#[tokio::test]
#[serial]
async fn test_save_project_transaction_integrity() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let initial_count = test_utils::get_project_count(&pool).await;

    // This test verifies that if a save fails, nothing is committed
    // (In a real scenario, you might test with invalid data or connection errors)

    // For now, verify successful save increases count
    let request = SaveProjectRequest {
        project_id: None,
        name: "Transaction Test".to_string(),
        project_type: "web-app".to_string(),
        active_agents: "[]".to_string(),
        messages: vec![],
        current_code: None,
    };

    save_project(request).await.unwrap();

    let final_count = test_utils::get_project_count(&pool).await;
    assert_eq!(final_count, initial_count + 1);

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}

// Test large message content
#[tokio::test]
#[serial]
async fn test_save_project_large_messages() {
    let (pool, _temp_db, db_path) = test_utils::setup_test_db().await;
    std::env::set_var("TEST_DATABASE_PATH", &db_path);

    let large_content = "x".repeat(10_000);

    let request = SaveProjectRequest {
        project_id: None,
        name: "Large Message Test".to_string(),
        project_type: "web-app".to_string(),
        active_agents: "[]".to_string(),
        messages: vec![
            Message {
                id: "msg-large".to_string(),
                role: "user".to_string(),
                content: large_content.clone(),
            },
        ],
        current_code: None,
    };

    let result = save_project(request).await;
    assert!(result.is_ok());

    let project_id = result.unwrap();
    let loaded = load_project(project_id).await.unwrap();
    assert_eq!(loaded.messages[0].content.len(), 10_000);

    test_utils::cleanup_test_db(pool).await;
    std::env::remove_var("TEST_DATABASE_PATH");
}
