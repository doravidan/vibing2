# Claude Code Authentication Integration for Desktop App

## Overview

Implement authentication that allows Vibing2 desktop app users to leverage their existing Claude Code subscription instead of requiring separate authentication.

## Implementation Strategy

### Option 1: Keychain Integration (Recommended)
Access the same credentials that Claude Code stores in macOS Keychain.

**How Claude Code Stores Credentials:**
- Service: `com.anthropic.claude-code`
- Account: User's email or session ID
- Storage: macOS Keychain (encrypted)
- Contains: API keys, session tokens, subscription info

**Implementation:**
1. Add Rust keychain library to Tauri backend
2. Create IPC command to read Claude Code credentials
3. Validate subscription status via Anthropic API
4. Store session locally in SQLite

**Advantages:**
- ✅ Seamless UX - no separate login needed
- ✅ Secure - uses system keychain
- ✅ Automatic subscription validation
- ✅ Works offline after initial validation

**Challenges:**
- Requires proper keychain access permissions
- Need to match Claude Code's exact keychain keys

### Option 2: API Key Input
Allow users to manually enter their Anthropic API key from Claude Code settings.

**Implementation:**
1. Create API key settings page in desktop app
2. Validate key against Anthropic API
3. Store encrypted in local SQLite
4. Use for all AI requests

**Advantages:**
- ✅ Simple implementation
- ✅ Clear user control
- ✅ No keychain complexity

**Challenges:**
- Additional step for users
- Need to handle key rotation
- No automatic subscription validation

### Option 3: OAuth Deep Link
Create a custom OAuth flow that opens Claude.ai for authorization.

**Implementation:**
1. Register custom URL scheme (`vibing2://`)
2. Open Claude.ai OAuth page in browser
3. Receive callback with auth token
4. Store session in SQLite

**Advantages:**
- ✅ Standard OAuth flow
- ✅ Full subscription validation
- ✅ Secure token exchange

**Challenges:**
- Complex implementation
- Requires Anthropic OAuth endpoint access
- Need dynamic client registration (DCR)

## Recommended Implementation: Hybrid Approach

Combine Option 1 and Option 2 for best UX:

### Phase 1: Keychain Auto-Detection
1. On first launch, check macOS Keychain for Claude Code credentials
2. If found, validate and use automatically
3. Show "✅ Connected to Claude Code" message

### Phase 2: Manual API Key Fallback
1. If keychain not found, show API key input
2. Guide user: "Enter your API key from Claude Code settings"
3. Provide link to Claude Code settings
4. Validate and store encrypted

### Phase 3: Subscription Validation
1. Periodically validate subscription status
2. Cache validation for 24 hours
3. Show usage stats from Anthropic API
4. Alert if subscription expires

## Technical Implementation

### 1. Add Keychain Support to Tauri

```toml
# vibing2-desktop/src-tauri/Cargo.toml
[dependencies]
keyring = "2.3"
serde_json = "1.0"
```

### 2. Create Keychain Reader Command

```rust
// vibing2-desktop/src-tauri/src/auth.rs
use keyring::Entry;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ClaudeCredentials {
    pub api_key: String,
    pub email: String,
    pub subscription_tier: String,
}

pub fn read_claude_code_credentials() -> Result<ClaudeCredentials, String> {
    // Try to read from keychain where Claude Code stores credentials
    let entry = Entry::new("com.anthropic.claude-code", "default")
        .map_err(|e| format!("Keychain error: {}", e))?;

    let password = entry.get_password()
        .map_err(|e| format!("Failed to read credentials: {}", e))?;

    // Parse JSON credentials
    serde_json::from_str(&password)
        .map_err(|e| format!("Invalid credential format: {}", e))
}

#[tauri::command]
pub async fn check_claude_code_auth() -> Result<ClaudeCredentials, String> {
    read_claude_code_credentials()
}
```

### 3. Create API Key Validation

```rust
// vibing2-desktop/src-tauri/src/auth.rs
use reqwest;

pub async fn validate_api_key(api_key: &str) -> Result<bool, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://api.anthropic.com/v1/auth/validate")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn validate_anthropic_key(api_key: String) -> Result<bool, String> {
    validate_api_key(&api_key).await
}
```

### 4. Store Credentials Securely

```rust
// vibing2-desktop/src-tauri/src/auth.rs
use sqlx::SqlitePool;

pub async fn store_credentials(
    pool: &SqlitePool,
    api_key: &str,
    email: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR REPLACE INTO auth_credentials (id, api_key, email, created_at)
         VALUES (1, ?, ?, datetime('now'))"
    )
    .bind(api_key)
    .bind(email)
    .execute(pool)
    .await?;

    Ok(())
}
```

### 5. Update Database Schema

```sql
-- vibing2-desktop/src-tauri/migrations/003_add_auth.sql
CREATE TABLE IF NOT EXISTS auth_credentials (
    id INTEGER PRIMARY KEY,
    api_key TEXT NOT NULL,
    email TEXT,
    subscription_tier TEXT,
    last_validated DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_email ON auth_credentials(email);
```

### 6. Frontend Login Component

```typescript
// vibing2-desktop/src/components/ClaudeCodeAuth.tsx
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

export function ClaudeCodeAuth() {
  const [status, setStatus] = useState<'checking' | 'found' | 'manual'>('checking');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  async function checkExistingAuth() {
    try {
      const creds = await invoke('check_claude_code_auth');
      setStatus('found');
      console.log('✅ Found Claude Code credentials');
    } catch (error) {
      setStatus('manual');
      console.log('ℹ️ No Claude Code credentials found, manual entry needed');
    }
  }

  async function validateAndSave() {
    setLoading(true);
    try {
      const isValid = await invoke('validate_anthropic_key', { apiKey });
      if (isValid) {
        await invoke('save_api_key', { apiKey });
        setStatus('found');
      } else {
        alert('Invalid API key');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Failed to validate API key');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') {
    return <div>Checking for Claude Code credentials...</div>;
  }

  if (status === 'found') {
    return (
      <div className="bg-green-50 p-4 rounded">
        <p>✅ Connected to Claude Code</p>
        <p className="text-sm text-gray-600">Using your Claude Code subscription</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Connect to Claude Code</h2>
      <p className="mb-4 text-gray-600">
        Enter your Anthropic API key from Claude Code settings
      </p>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-ant-..."
        className="w-full p-2 border rounded mb-4"
      />

      <button
        onClick={validateAndSave}
        disabled={loading || !apiKey}
        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Validating...' : 'Connect'}
      </button>

      <p className="mt-4 text-sm text-gray-500">
        <a href="https://claude.com/settings/api" target="_blank" className="text-purple-600">
          Get your API key from Claude Code settings →
        </a>
      </p>
    </div>
  );
}
```

## User Experience Flow

### First Launch (Keychain Found)
```
1. Desktop app starts
2. Checks macOS Keychain for Claude Code credentials
3. ✅ Found! Shows "Connected to Claude Code"
4. User can immediately start using the app
```

### First Launch (No Keychain)
```
1. Desktop app starts
2. Checks macOS Keychain - not found
3. Shows API key input screen
4. User enters API key from Claude Code settings
5. App validates with Anthropic API
6. ✅ Connected! Saves encrypted in local SQLite
7. User can start using the app
```

### Subsequent Launches
```
1. Desktop app starts
2. Reads credentials from local SQLite
3. Validates in background (cached 24h)
4. User sees "Connected to Claude Code" immediately
```

## Security Considerations

1. **Keychain Access**
   - Request minimal permissions
   - Only read Claude Code entries
   - Show clear permission dialogs

2. **Local Storage**
   - Encrypt API keys in SQLite using AES-256
   - Never log credentials
   - Clear on logout

3. **Network Security**
   - All API calls use HTTPS
   - Validate SSL certificates
   - Implement request signing

4. **Token Refresh**
   - Cache validation for 24 hours
   - Automatic refresh on expiry
   - Handle rate limiting

## Testing Plan

1. **Keychain Integration**
   - Test with Claude Code installed
   - Test without Claude Code
   - Test with invalid keychain data

2. **Manual API Key**
   - Test valid key
   - Test invalid key
   - Test key rotation

3. **Subscription Validation**
   - Test active subscription
   - Test expired subscription
   - Test rate limits

## Rollout Plan

**Week 1:** Implement keychain reading + manual API key input
**Week 2:** Add subscription validation + usage tracking
**Week 3:** Polish UX + error handling
**Week 4:** Testing + documentation

## Next Steps

1. Add `keyring` crate to Cargo.toml
2. Implement auth.rs module with keychain reading
3. Create database migration for auth table
4. Build ClaudeCodeAuth React component
5. Integrate into desktop app startup flow
6. Test end-to-end authentication

## Related Files

- [vibing2-desktop/src-tauri/src/auth.rs](vibing2-desktop/src-tauri/src/auth.rs) - Authentication module (to create)
- [vibing2-desktop/src-tauri/Cargo.toml](vibing2-desktop/src-tauri/Cargo.toml) - Add keyring dependency
- [vibing2-desktop/src-tauri/src/database.rs](vibing2-desktop/src-tauri/src/database.rs) - Add auth table
- [vibing2-desktop/src/components/ClaudeCodeAuth.tsx](vibing2-desktop/src/components/ClaudeCodeAuth.tsx) - Auth UI (to create)
