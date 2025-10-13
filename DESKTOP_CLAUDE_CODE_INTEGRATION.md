# Vibing2 Desktop - Claude Code Integration

## Overview

The Vibing2 Desktop app is designed to integrate seamlessly with your existing **Claude Code subscription**, eliminating the need for separate authentication or account management.

## How It Works

### 1. **No Authentication Required**
- Desktop app bypasses web authentication entirely
- [middleware.ts:14-21](middleware.ts#L14-L21) detects Tauri desktop app via User-Agent
- Direct access to all features without login screens

### 2. **Claude Code API Integration**
The desktop app uses your Claude Code subscription for AI features:

```typescript
// Desktop app automatically uses your Claude Code credentials
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY, // From Claude Code
    'anthropic-version': '2023-06-01',
  },
  // ... AI requests
});
```

### 3. **Local Data Storage**
- **SQLite database**: `~/Library/Application Support/com.vibing2.desktop/vibing2.db`
- All projects, files, and settings stored locally
- No cloud sync required (optional feature for future)

## Architecture

```
┌─────────────────────────────────────────┐
│  Vibing2 Desktop (Tauri)                │
│  ┌───────────────────────────────────┐  │
│  │  Web UI (Next.js)                 │  │
│  │  - No auth required               │  │
│  │  - Full feature access            │  │
│  └───────────────────────────────────┘  │
│              ↕                           │
│  ┌───────────────────────────────────┐  │
│  │  Rust Backend                     │  │
│  │  - SQLite for local storage       │  │
│  │  - 7 IPC commands                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                 ↕
    ┌─────────────────────────┐
    │ Claude Code Subscription │
    │ (Your API Key)           │
    └─────────────────────────┘
```

## Benefits

### For Users
✅ **No separate login** - Works with your Claude Code subscription
✅ **100% local** - All data on your machine
✅ **Native performance** - Rust + WebView
✅ **Offline capable** - View and edit projects without internet
✅ **Privacy-first** - No telemetry or tracking

### For Development
✅ **Simplified UX** - No authentication flow
✅ **Better performance** - Direct API access without web auth overhead
✅ **Easy testing** - No mock auth in development
✅ **Cleaner code** - Fewer conditional checks

## Configuration

### Environment Variables

The desktop app requires your Claude Code API key in `.env`:

```bash
# .env (at project root)
ANTHROPIC_API_KEY=your_claude_code_api_key_here
```

The desktop app will automatically use this when making AI requests.

### Middleware Detection

The [middleware.ts](middleware.ts) automatically detects Tauri:

```typescript
// Detect Tauri desktop app by checking User-Agent header
const userAgent = req.headers.get('user-agent') || '';
const isTauriApp = userAgent.includes('Tauri') ||
                   req.headers.get('x-tauri-app') === 'true';

// Skip authentication for Tauri desktop app
if (isTauriApp) {
  return NextResponse.next();
}
```

## Running the Desktop App

### Development Mode
```bash
# Terminal 1: Start main web app
pnpm run dev

# Terminal 2: Start desktop app
cd vibing2-desktop
pnpm run dev
```

The desktop app will:
1. Load the web UI from `http://localhost:3000`
2. Use local SQLite for data
3. Use your Claude Code API key for AI features
4. Skip all authentication

### Production Build
```bash
cd vibing2-desktop
pnpm run build

# The built app is at:
# src-tauri/target/release/vibing2-desktop
```

## Future Enhancements

### Phase 2: Enhanced Integration
- [ ] Auto-detect Claude Code API key from system
- [ ] Claude Code usage dashboard
- [ ] Offline AI (cached responses)
- [ ] Multi-account support

### Phase 3: Desktop Features
- [ ] Menu bar integration
- [ ] Global keyboard shortcuts
- [ ] System notifications
- [ ] Quick capture from anywhere

### Phase 4: Distribution
- [ ] Code signing
- [ ] DMG installer
- [ ] Auto-update mechanism
- [ ] App Store distribution

## Comparison: Web vs Desktop

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| Authentication | Required (email/password) | None (uses Claude Code) |
| Data Storage | PostgreSQL (cloud) | SQLite (local) |
| API Access | Via web backend | Direct to Anthropic |
| Offline Mode | No | Yes (view/edit) |
| Updates | Auto (reload) | Manual/auto-update |
| Performance | Network dependent | Native speed |
| Privacy | Data in cloud | Data on device |

## Security Considerations

### API Key Storage
- Desktop app reads `ANTHROPIC_API_KEY` from environment
- Never stored in SQLite database
- Never transmitted to any server except Anthropic

### Local Database
- SQLite file at `~/Library/Application Support/com.vibing2.desktop/vibing2.db`
- Readable only by current user (macOS file permissions)
- No encryption (future enhancement for sensitive projects)

### Network Requests
- Only to `api.anthropic.com` for AI features
- No telemetry or analytics
- No auto-update checks (unless explicitly enabled)

## Development Workflow

### Adding New Features

1. **Add API endpoint** (if needed)
2. **Test in web app** with authentication
3. **Test in desktop app** without authentication
4. **Ensure both paths work**

### Debugging

```bash
# Desktop app with debug logs
cd vibing2-desktop
RUST_LOG=debug pnpm run dev

# Check desktop app User-Agent
# In browser DevTools (desktop app): navigator.userAgent
# Should contain: "Tauri/2.x.x"
```

## Troubleshooting

### Desktop App Shows Login Screen

**Problem**: Desktop app redirects to `/auth/signin`

**Solution**: Check that middleware is detecting Tauri:
1. Open DevTools in desktop app: `Cmd+Option+I`
2. Check User-Agent: `console.log(navigator.userAgent)`
3. Should contain "Tauri"
4. If not, middleware needs adjustment

### API Key Not Working

**Problem**: AI requests fail with 401

**Solution**:
1. Check `.env` file has `ANTHROPIC_API_KEY`
2. Restart both servers after adding key
3. Verify key is valid Claude Code API key

### Database Errors

**Problem**: SQLite errors on startup

**Solution**:
```bash
# Reset database
rm ~/Library/Application\ Support/com.vibing2.desktop/vibing2.db

# Restart desktop app - it will recreate
cd vibing2-desktop
pnpm run dev
```

## Summary

The Vibing2 Desktop app provides a **native, local-first experience** that integrates with your Claude Code subscription. By bypassing web authentication and using local storage, it offers:

- **Faster startup** (no auth flow)
- **Better privacy** (local data)
- **Offline capable** (cached projects)
- **Seamless integration** (uses your existing subscription)

Perfect for developers who want a native desktop experience while maintaining the flexibility of the web app!
