// Agents API endpoints
use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::server::ServerState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub capabilities: Vec<String>,
    pub model: String,
    pub icon: String,
}

/// List all available agents
pub async fn list_agents(
    State(_state): State<ServerState>,
) -> impl IntoResponse {
    // Return predefined agents list
    let agents = vec![
        Agent {
            id: "frontend-architect".to_string(),
            name: "Frontend Architect".to_string(),
            description: "Expert in React, Vue, Angular, and modern frontend architecture".to_string(),
            category: "Frontend".to_string(),
            capabilities: vec![
                "Component architecture".to_string(),
                "State management".to_string(),
                "Performance optimization".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "🏗️".to_string(),
        },
        Agent {
            id: "backend-architect".to_string(),
            name: "Backend Architect".to_string(),
            description: "Specializes in scalable backend systems and API design".to_string(),
            category: "Backend".to_string(),
            capabilities: vec![
                "API design".to_string(),
                "Microservices".to_string(),
                "Database architecture".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "⚙️".to_string(),
        },
        Agent {
            id: "database-architect".to_string(),
            name: "Database Architect".to_string(),
            description: "Expert in database design, optimization, and migration".to_string(),
            category: "Database".to_string(),
            capabilities: vec![
                "Schema design".to_string(),
                "Query optimization".to_string(),
                "Data modeling".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "🗄️".to_string(),
        },
        Agent {
            id: "ui-designer".to_string(),
            name: "UI/UX Designer".to_string(),
            description: "Creates beautiful, intuitive user interfaces".to_string(),
            category: "Design".to_string(),
            capabilities: vec![
                "UI design".to_string(),
                "User experience".to_string(),
                "Design systems".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "🎨".to_string(),
        },
        Agent {
            id: "devops-engineer".to_string(),
            name: "DevOps Engineer".to_string(),
            description: "Infrastructure automation and CI/CD specialist".to_string(),
            category: "DevOps".to_string(),
            capabilities: vec![
                "CI/CD pipelines".to_string(),
                "Container orchestration".to_string(),
                "Infrastructure as code".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "🚀".to_string(),
        },
    ];

    Json(serde_json::json!({
        "success": true,
        "agents": agents,
        "total": agents.len()
    }))
}

/// Get a specific agent by ID
pub async fn get_agent(
    State(_state): State<ServerState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // Mock implementation - return agent if found
    let agents = vec![
        ("frontend-architect", Agent {
            id: "frontend-architect".to_string(),
            name: "Frontend Architect".to_string(),
            description: "Expert in React, Vue, Angular, and modern frontend architecture".to_string(),
            category: "Frontend".to_string(),
            capabilities: vec![
                "Component architecture".to_string(),
                "State management".to_string(),
                "Performance optimization".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "🏗️".to_string(),
        }),
        ("backend-architect", Agent {
            id: "backend-architect".to_string(),
            name: "Backend Architect".to_string(),
            description: "Specializes in scalable backend systems and API design".to_string(),
            category: "Backend".to_string(),
            capabilities: vec![
                "API design".to_string(),
                "Microservices".to_string(),
                "Database architecture".to_string(),
            ],
            model: "claude-3-opus".to_string(),
            icon: "⚙️".to_string(),
        }),
    ];

    for (agent_id, agent) in agents {
        if agent_id == id {
            return (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "agent": agent
                })),
            ).into_response();
        }
    }

    (
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({
            "success": false,
            "message": "Agent not found"
        })),
    ).into_response()
}