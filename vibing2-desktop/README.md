# Vibing2 Desktop

**Self-Contained AI Development Platform for macOS**

## 🚀 Features

- ✅ **100% Local** - No internet required (except for Anthropic API)
- ✅ **Self-Contained** - Embedded SQLite database, no Docker needed
- ✅ **Native macOS** - Menu bar integration, keyboard shortcuts
- ✅ **One-Click Install** - Download .dmg, drag to Applications
- ✅ **Offline-First** - Save projects locally, sync optional
- ✅ **Privacy-Focused** - All data stays on your machine

## 📋 Requirements

- **Operating System:** macOS 11 (Big Sur) or later
- **Memory:** 4GB RAM minimum, 8GB recommended
- **Storage:** 500MB for app, 2GB for projects
- **Network:** Internet connection for AI API calls only

## 🏗️ Development Setup

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+

### Installation

```bash
# 1. Install dependencies
cd vibing2-desktop
pnpm install

# 2. Run in development mode
pnpm run dev
```

### Build for Production

```bash
# Build Next.js app and create .dmg installer
pnpm run build

# Output: src-tauri/target/release/bundle/macos/Vibing2.app
```

## 🏛️ Architecture

```
vibing2-desktop/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── database.rs     # SQLite setup
│   │   └── commands.rs     # Tauri IPC commands
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # App configuration
├── public/                 # Frontend assets (Next.js output)
├── scripts/
│   └── copy-assets.js      # Build helper
└── package.json
```

### Technology Stack

- **Framework:** Tauri 2.0 (Rust + WebView)
- **Frontend:** Next.js 15 (static export)
- **Database:** SQLite (embedded)
- **IPC:** Tauri Commands (Rust ↔ JavaScript)

## 📦 Database Schema

```sql
users           - User accounts (local only)
projects        - User projects
project_files   - Multi-file project structure
messages        - Conversation history
settings        - App configuration
```

## 🔧 Available Commands

### Tauri Commands (IPC)

```typescript
// Frontend → Backend communication
import { invoke } from '@tauri-apps/api/core';

// Save project
await invoke('save_project', {
  request: { name, projectType, messages, currentCode }
});

// Load project
const project = await invoke('load_project', { projectId });

// List all projects
const projects = await invoke('list_projects');

// Delete project
await invoke('delete_project', { projectId });

// Settings
await invoke('save_settings', { settings });
const settings = await invoke('load_settings');
```

## 🎯 Roadmap

### Phase 1: Core Setup ✅ (Current)
- [x] Tauri project structure
- [x] SQLite database with migrations
- [x] Basic IPC commands
- [ ] Next.js static export integration
- [ ] Test basic app functionality

### Phase 2: Feature Parity
- [ ] Convert all API routes to Tauri commands
- [ ] Local file management
- [ ] Settings UI
- [ ] Authentication (local-only)

### Phase 3: macOS Integration
- [ ] Native menu bar
- [ ] Keyboard shortcuts
- [ ] System notifications
- [ ] Dock integration

### Phase 4: Distribution
- [ ] Code signing
- [ ] .dmg installer
- [ ] Auto-update system
- [ ] Download page

## 🐛 Troubleshooting

### Build Errors

```bash
# Clean build cache
cd src-tauri
cargo clean

# Reinstall Rust dependencies
cargo update
```

### Database Issues

```bash
# Database location:
# macOS: ~/Library/Application Support/com.vibing2.desktop/vibing2.db

# Reset database (deletes all data!)
rm -rf ~/Library/Application\ Support/com.vibing2.desktop/
```

## 📖 Documentation

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Main Project Plan](../MACOS_LOCAL_APP_PLAN.md)

## 🤝 Contributing

See main project [CONTRIBUTING.md](../CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details

---

**Built with ❤️ for developers who want offline, privacy-focused AI tools**
