// Streaming API endpoints for agent interactions
use axum::{
    extract::State,
    http::{StatusCode, HeaderMap, header},
    response::{IntoResponse, Response, Sse, sse::Event},
    Json,
};
use futures::stream::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::time::Duration;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;
use crate::server::ServerState;

#[derive(Debug, Deserialize)]
pub struct StreamRequest {
    pub prompt: String,
    pub agent_id: Option<String>,
    pub files: Option<Vec<FileContent>>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct StreamResponse {
    pub id: String,
    pub content: String,
    pub role: String,
    pub done: bool,
}

/// Handle streaming agent responses
pub async fn handle_stream(
    State(state): State<ServerState>,
    Json(payload): Json<StreamRequest>,
) -> impl IntoResponse {
    // Create SSE stream
    let stream = create_agent_stream(payload).await;

    Sse::new(stream)
        .keep_alive(
            axum::response::sse::KeepAlive::new()
                .interval(Duration::from_secs(30))
                .text("keep-alive"),
        )
}

/// Create the agent response stream
async fn create_agent_stream(
    request: StreamRequest,
) -> impl Stream<Item = Result<Event, Infallible>> {
    // For demo purposes, stream a mock response
    // In production, this would connect to Claude API
    let messages = vec![
        "I'll help you with that request.",
        "Let me analyze your requirements...",
        "Here's what I'll create for you:",
        "\n```javascript",
        "// Sample code implementation",
        "function helloWorld() {",
        "  console.log('Hello from Vibing2!');",
        "}",
        "```\n",
        "This implementation provides a basic structure.",
        "Would you like me to add more features?",
    ];

    // Create interval stream for demo
    let mut interval_stream = IntervalStream::new(interval(Duration::from_millis(100)));
    let mut message_index = 0;
    let total_messages = messages.len();

    async_stream::stream! {
        while let Some(_) = interval_stream.next().await {
            if message_index < total_messages {
                let response = StreamResponse {
                    id: uuid::Uuid::new_v4().to_string(),
                    content: messages[message_index].to_string(),
                    role: "assistant".to_string(),
                    done: message_index == total_messages - 1,
                };

                let data = serde_json::to_string(&response).unwrap_or_default();
                yield Ok(Event::default().data(data));

                message_index += 1;
            } else {
                break;
            }
        }

        // Send final done event
        let final_response = StreamResponse {
            id: uuid::Uuid::new_v4().to_string(),
            content: "".to_string(),
            role: "assistant".to_string(),
            done: true,
        };

        let data = serde_json::to_string(&final_response).unwrap_or_default();
        yield Ok(Event::default().data(data));
    }
}

/// Alternative WebSocket handler for bidirectional streaming
pub async fn handle_websocket(
    ws: axum::extract::ws::WebSocketUpgrade,
    State(state): State<ServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(
    mut socket: axum::extract::ws::WebSocket,
    state: ServerState,
) {
    // Handle WebSocket messages
    while let Some(msg) = socket.recv().await {
        match msg {
            Ok(axum::extract::ws::Message::Text(text)) => {
                // Parse message and handle accordingly
                if let Ok(request) = serde_json::from_str::<StreamRequest>(&text) {
                    // Send response back
                    let response = StreamResponse {
                        id: uuid::Uuid::new_v4().to_string(),
                        content: format!("Received: {}", request.prompt),
                        role: "assistant".to_string(),
                        done: false,
                    };

                    if let Ok(response_text) = serde_json::to_string(&response) {
                        let _ = socket.send(axum::extract::ws::Message::Text(response_text)).await;
                    }
                }
            }
            Ok(axum::extract::ws::Message::Close(_)) => {
                break;
            }
            _ => {}
        }
    }
}