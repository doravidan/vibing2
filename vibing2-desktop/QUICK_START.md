# Vibing2 Desktop App - Quick Start Guide

## Two Modes: Standalone React App or Next.js Integration

### Mode 1: Standalone React App (New - Recommended for Auth UI)

This mode uses Vite + React with the new Authentication UI component.

```bash
cd vibing2-desktop

# Install dependencies
pnpm install

# Run in development
pnpm run dev
```

The native macOS window will open with:
- Authentication modal (checks Keychain + manual entry)
- Beautiful UI with Tailwind CSS
- Toast notifications
- Dark mode support

### Mode 2: Next.js Integration (Original)

Load the full Vibing2 Next.js app in the desktop wrapper.

#### Step 1: Start the Web Server

```bash
cd /Users/I347316/dev/vibing2
DISABLE_AUTH=true pnpm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

#### Step 2: Start the Desktop App

```bash
cd /Users/I347316/dev/vibing2/vibing2-desktop
pnpm run dev:tauri
```

Wait for:
```
✅ Database migrations completed
✅ Database initialized successfully
```

## What You Get

- Native macOS application with custom V2 icon
- Authentication UI with Keychain integration
- All 154 AI agents ready to use
- Local SQLite database for project storage
- System tray integration
- Auto-update support
- Full Anthropic API streaming support

## New Project Structure (with React UI)

```
vibing2-desktop/
├── src/                           # React frontend (NEW)
│   ├── components/
│   │   └── AuthenticationModal.tsx   # Auth UI component
│   ├── types.ts                   # TypeScript types
│   ├── main.tsx                   # React entry point
│   ├── styles.css                 # Global Tailwind styles
│   └── index.html                 # HTML template
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── auth.rs                # Authentication (Keychain)
│   │   ├── database.rs            # SQLite operations
│   │   ├── commands.rs            # Tauri IPC commands
│   │   ├── tray.rs                # System tray
│   │   ├── updater.rs             # Auto-updates
│   │   └── main.rs                # Entry point
│   └── tauri.conf.json            # Configuration
├── vite.config.ts                 # Vite config (NEW)
├── tailwind.config.js             # Tailwind config (NEW)
└── package.json                   # Dependencies
```

## Database Location

`~/Library/Application Support/com.vibing2.desktop/vibing2.db`

## Available Commands

### Project Management
- Save project
- Load project
- List all projects
- Delete project

### Authentication
- Check authentication status
- Save API key (with validation)
- Get stored credentials

### Settings
- Save user settings
- Load user settings

## Build for Production

```bash
pnpm run build
```

Output: `src-tauri/target/release/bundle/macos/Vibing2.app`

## Troubleshooting

**Blank window?**
- Ensure web server is running on localhost:3000
- Check DISABLE_AUTH=true is set

**Compilation errors?**
- Run `cargo clean` and rebuild
- Check DATABASE_URL is not set

**API errors?**
- Verify ANTHROPIC_API_KEY in .env.development.local
- Check internet connection

## Documentation

See [NATIVE_MACOS_DESKTOP_IMPLEMENTATION_COMPLETE.md](../NATIVE_MACOS_DESKTOP_IMPLEMENTATION_COMPLETE.md) for full details.

## Status

✅ **FULLY OPERATIONAL** - Ready to use!
