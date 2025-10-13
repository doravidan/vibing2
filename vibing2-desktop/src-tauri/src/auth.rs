use keyring::Entry;
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClaudeCredentials {
    pub api_key: String,
    pub email: Option<String>,
    pub subscription_tier: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub source: String, // "keychain", "manual", or "none"
    pub email: Option<String>,
}

/// Try to read Claude Code credentials from macOS Keychain
pub fn read_claude_code_keychain() -> Result<ClaudeCredentials, String> {
    // Try multiple possible keychain entries that Claude Code might use
    let possible_services = vec![
        "com.anthropic.claude-code",
        "claude-code",
        "anthropic-claude",
    ];

    let possible_accounts = vec![
        "default",
        "api_key",
        "credentials",
    ];

    for service in &possible_services {
        for account in &possible_accounts {
            if let Ok(entry) = Entry::new(service, account) {
                if let Ok(password) = entry.get_password() {
                    // Try to parse as JSON first
                    if let Ok(creds) = serde_json::from_str::<ClaudeCredentials>(&password) {
                        println!("✅ Found Claude Code credentials in keychain: {} / {}", service, account);
                        return Ok(creds);
                    }

                    // If not JSON, treat the whole thing as an API key
                    if password.starts_with("sk-ant-") {
                        println!("✅ Found Claude API key in keychain: {} / {}", service, account);
                        return Ok(ClaudeCredentials {
                            api_key: password,
                            email: None,
                            subscription_tier: None,
                        });
                    }
                }
            }
        }
    }

    Err("No Claude Code credentials found in keychain".to_string())
}

/// Validate API key with Anthropic API
pub async fn validate_api_key(api_key: &str) -> Result<bool, String> {
    let client = reqwest::Client::new();

    // Use Anthropic's messages API to validate the key
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "test"}]
        }))
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let status = response.status();

    // 200 = valid key, 401 = invalid key, other = error
    if status.is_success() {
        Ok(true)
    } else if status.as_u16() == 401 {
        Ok(false)
    } else {
        Err(format!("Unexpected API response: {}", status))
    }
}

/// Load credentials from local database
pub async fn load_credentials_from_db(pool: &SqlitePool) -> Result<ClaudeCredentials, String> {
    let result = sqlx::query("SELECT api_key, email, subscription_tier FROM auth_credentials WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    match result {
        Some(row) => Ok(ClaudeCredentials {
            api_key: row.get("api_key"),
            email: row.get("email"),
            subscription_tier: row.get("subscription_tier"),
        }),
        None => Err("No credentials found in database".to_string()),
    }
}

/// Store credentials in local database
pub async fn store_credentials_in_db(
    pool: &SqlitePool,
    api_key: &str,
    email: Option<&str>,
    subscription_tier: Option<&str>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO auth_credentials (id, api_key, email, subscription_tier, last_validated, updated_at)
         VALUES (1, ?1, ?2, ?3, datetime('now'), datetime('now'))"
    )
    .bind(api_key)
    .bind(email)
    .bind(subscription_tier)
    .execute(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    Ok(())
}

/// Check authentication status - tries keychain first, then database
pub async fn check_auth_status(pool: &SqlitePool) -> Result<AuthStatus, String> {
    // Try keychain first
    if let Ok(creds) = read_claude_code_keychain() {
        // Validate and store in database for future use
        if let Ok(true) = validate_api_key(&creds.api_key).await {
            let _ = store_credentials_in_db(
                pool,
                &creds.api_key,
                creds.email.as_deref(),
                creds.subscription_tier.as_deref(),
            )
            .await;

            return Ok(AuthStatus {
                authenticated: true,
                source: "keychain".to_string(),
                email: creds.email,
            });
        }
    }

    // Try database
    if let Ok(creds) = load_credentials_from_db(pool).await {
        return Ok(AuthStatus {
            authenticated: true,
            source: "database".to_string(),
            email: creds.email,
        });
    }

    Ok(AuthStatus {
        authenticated: false,
        source: "none".to_string(),
        email: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_parsing() {
        // Test JSON format
        let json_creds = r#"{"api_key":"sk-ant-test123","email":"user@example.com"}"#;
        let parsed: ClaudeCredentials = serde_json::from_str(json_creds).unwrap();
        assert_eq!(parsed.api_key, "sk-ant-test123");
        assert_eq!(parsed.email, Some("user@example.com".to_string()));
    }

    #[tokio::test]
    async fn test_invalid_api_key() {
        let result = validate_api_key("invalid-key").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
