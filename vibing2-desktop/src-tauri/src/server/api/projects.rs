// Projects API endpoints
use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::server::ServerState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub prompt: String,
    pub files: Vec<ProjectFile>,
    pub created_at: String,
    pub updated_at: String,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectFile {
    pub path: String,
    pub content: String,
    pub language: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub prompt: String,
    pub files: Vec<ProjectFile>,
}

#[derive(Debug, Deserialize)]
pub struct LoadProjectRequest {
    pub id: String,
}

/// List all projects for the current user
pub async fn list_projects(
    State(state): State<ServerState>,
) -> impl IntoResponse {
    // For now, return mock data - in production, check auth and query DB
    let projects = vec![
        Project {
            id: "1".to_string(),
            name: "Sample Project".to_string(),
            description: Some("A sample project".to_string()),
            prompt: "Create a web app".to_string(),
            files: vec![],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            user_id: "user_1".to_string(),
        },
    ];

    Json(serde_json::json!({
        "success": true,
        "projects": projects
    }))
}

/// Save a new project or update existing
pub async fn save_project(
    State(state): State<ServerState>,
    Json(payload): Json<SaveProjectRequest>,
) -> impl IntoResponse {
    // Generate project ID
    let project_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Save to database
    match sqlx::query!(
        "INSERT INTO projects (id, name, description, prompt, files_json, created_at, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        project_id,
        payload.name,
        payload.description,
        payload.prompt,
        serde_json::to_string(&payload.files).unwrap_or_else(|_| "[]".to_string()),
        now,
        now,
        "user_1" // Should get from auth
    )
    .execute(&state.db_pool)
    .await
    {
        Ok(_) => {
            let project = Project {
                id: project_id,
                name: payload.name,
                description: payload.description,
                prompt: payload.prompt,
                files: payload.files,
                created_at: now.clone(),
                updated_at: now,
                user_id: "user_1".to_string(),
            };

            (
                StatusCode::CREATED,
                Json(serde_json::json!({
                    "success": true,
                    "project": project
                })),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to save project: {}", e)
            })),
        ),
    }
}

/// Load a specific project
pub async fn load_project(
    State(state): State<ServerState>,
    Json(payload): Json<LoadProjectRequest>,
) -> impl IntoResponse {
    match sqlx::query!(
        "SELECT id, name, description, prompt, files_json, created_at, updated_at, user_id
         FROM projects WHERE id = ?",
        payload.id
    )
    .fetch_one(&state.db_pool)
    .await
    {
        Ok(record) => {
            let files: Vec<ProjectFile> = serde_json::from_str(&record.files_json)
                .unwrap_or_else(|_| vec![]);

            let project = Project {
                id: record.id,
                name: record.name,
                description: record.description,
                prompt: record.prompt,
                files,
                created_at: record.created_at,
                updated_at: record.updated_at,
                user_id: record.user_id,
            };

            Json(serde_json::json!({
                "success": true,
                "project": project
            }))
        }
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Project not found"
            })),
        ).into_response(),
    }
}

/// Get a specific project
pub async fn get_project(
    State(state): State<ServerState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match sqlx::query!(
        "SELECT id, name, description, prompt, files_json, created_at, updated_at, user_id
         FROM projects WHERE id = ?",
        id
    )
    .fetch_one(&state.db_pool)
    .await
    {
        Ok(record) => {
            let files: Vec<ProjectFile> = serde_json::from_str(&record.files_json)
                .unwrap_or_else(|_| vec![]);

            let project = Project {
                id: record.id,
                name: record.name,
                description: record.description,
                prompt: record.prompt,
                files,
                created_at: record.created_at,
                updated_at: record.updated_at,
                user_id: record.user_id,
            };

            Json(serde_json::json!({
                "success": true,
                "project": project
            }))
        }
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Project not found"
            })),
        ).into_response(),
    }
}

/// Update an existing project
pub async fn update_project(
    State(state): State<ServerState>,
    Path(id): Path<String>,
    Json(payload): Json<SaveProjectRequest>,
) -> impl IntoResponse {
    let now = chrono::Utc::now().to_rfc3339();

    match sqlx::query!(
        "UPDATE projects SET name = ?, description = ?, prompt = ?, files_json = ?, updated_at = ?
         WHERE id = ?",
        payload.name,
        payload.description,
        payload.prompt,
        serde_json::to_string(&payload.files).unwrap_or_else(|_| "[]".to_string()),
        now,
        id
    )
    .execute(&state.db_pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                let project = Project {
                    id: id.clone(),
                    name: payload.name,
                    description: payload.description,
                    prompt: payload.prompt,
                    files: payload.files,
                    created_at: now.clone(), // Should keep original
                    updated_at: now,
                    user_id: "user_1".to_string(),
                };

                Json(serde_json::json!({
                    "success": true,
                    "project": project
                }))
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Project not found"
                    })),
                ).into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update project: {}", e)
            })),
        ).into_response(),
    }
}

/// Delete a project
pub async fn delete_project(
    State(state): State<ServerState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match sqlx::query!("DELETE FROM projects WHERE id = ?", id)
        .execute(&state.db_pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(serde_json::json!({
                    "success": true,
                    "message": "Project deleted successfully"
                }))
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Project not found"
                    })),
                ).into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete project: {}", e)
            })),
        ).into_response(),
    }
}