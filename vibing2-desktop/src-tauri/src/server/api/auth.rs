// Authentication API endpoints
use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::server::ServerState;

#[derive(Debug, Deserialize)]
pub struct SignInRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct SignUpRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub user: Option<User>,
    pub token: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: String,
}

/// Handle user sign in
pub async fn signin(
    State(state): State<ServerState>,
    Json(payload): Json<SignInRequest>,
) -> impl IntoResponse {
    // Validate input
    if payload.email.is_empty() || payload.password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Email and password are required".to_string()),
            }),
        );
    }

    // Query the database for the user
    let user = match sqlx::query!(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
        payload.email
    )
    .fetch_one(&state.db_pool)
    .await
    {
        Ok(record) => {
            // Verify password (simplified - should use proper password hashing)
            // In production, use argon2 or bcrypt for password verification
            if record.password_hash != payload.password {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(AuthResponse {
                        success: false,
                        user: None,
                        token: None,
                        message: Some("Invalid credentials".to_string()),
                    }),
                );
            }

            User {
                id: record.id,
                name: record.name,
                email: record.email,
                created_at: record.created_at,
            }
        }
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Invalid credentials".to_string()),
                }),
            );
        }
    };

    // Generate a simple token (in production, use JWT)
    let token = format!("token_{}", uuid::Uuid::new_v4());

    // Store session in database
    let _ = sqlx::query!(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
        user.id,
        token
    )
    .execute(&state.db_pool)
    .await;

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            user: Some(user),
            token: Some(token),
            message: None,
        }),
    )
}

/// Handle user sign up
pub async fn signup(
    State(state): State<ServerState>,
    Json(payload): Json<SignUpRequest>,
) -> impl IntoResponse {
    // Validate input
    if payload.email.is_empty() || payload.password.is_empty() || payload.name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("All fields are required".to_string()),
            }),
        );
    }

    // Check if user already exists
    let exists = sqlx::query!("SELECT id FROM users WHERE email = ?", payload.email)
        .fetch_optional(&state.db_pool)
        .await;

    if exists.is_ok() && exists.unwrap().is_some() {
        return (
            StatusCode::CONFLICT,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("User already exists".to_string()),
            }),
        );
    }

    // Create new user (simplified - should use proper password hashing)
    let user_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    match sqlx::query!(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        user_id,
        payload.name,
        payload.email,
        payload.password, // Should be hashed in production
        now
    )
    .execute(&state.db_pool)
    .await
    {
        Ok(_) => {
            let user = User {
                id: user_id.clone(),
                name: payload.name,
                email: payload.email,
                created_at: now,
            };

            // Generate token
            let token = format!("token_{}", uuid::Uuid::new_v4());

            // Store session
            let _ = sqlx::query!(
                "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
                user_id,
                token
            )
            .execute(&state.db_pool)
            .await;

            (
                StatusCode::CREATED,
                Json(AuthResponse {
                    success: true,
                    user: Some(user),
                    token: Some(token),
                    message: None,
                }),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some(format!("Failed to create user: {}", e)),
            }),
        ),
    }
}

/// Handle user sign out
pub async fn signout(
    State(state): State<ServerState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Get token from headers
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            let token = auth_str.trim_start_matches("Bearer ");

            // Delete session
            let _ = sqlx::query!("DELETE FROM sessions WHERE token = ?", token)
                .execute(&state.db_pool)
                .await;
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": "Signed out successfully"
    }))
}

/// Get current session
pub async fn get_session(
    State(state): State<ServerState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Get token from headers
    let token = match headers.get("authorization") {
        Some(auth_header) => {
            match auth_header.to_str() {
                Ok(auth_str) => auth_str.trim_start_matches("Bearer "),
                Err(_) => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({
                            "success": false,
                            "message": "Invalid authorization header"
                        })),
                    );
                }
            }
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "No authorization header"
                })),
            );
        }
    };

    // Query session and user
    match sqlx::query!(
        "SELECT u.id, u.name, u.email, u.created_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > datetime('now')",
        token
    )
    .fetch_one(&state.db_pool)
    .await
    {
        Ok(record) => {
            let user = User {
                id: record.id,
                name: record.name,
                email: record.email,
                created_at: record.created_at,
            };

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "user": user
                })),
            )
        }
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "success": false,
                "message": "Invalid or expired session"
            })),
        ),
    }
}