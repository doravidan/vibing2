// Server configuration module
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    pub max_connections: usize,
    pub timeout: Duration,
    pub max_body_size: usize,
    pub enable_compression: bool,
    pub enable_logging: bool,
}

impl ServerConfig {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            host: "127.0.0.1".to_string(),
            max_connections: 100,
            timeout: Duration::from_secs(30),
            max_body_size: 10 * 1024 * 1024, // 10MB
            enable_compression: true,
            enable_logging: true,
        }
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn url(&self) -> String {
        format!("http://{}:{}", self.host, self.port)
    }
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self::new(3456)
    }
}