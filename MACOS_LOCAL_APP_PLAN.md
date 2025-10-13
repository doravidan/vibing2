# macOS Local Application Plan
## Vibing2 Desktop - Self-Contained AI Development Platform

---

## 🎯 Executive Summary

Create a **self-contained macOS desktop application** that allows users to download and run the entire Vibing2 AI development platform locally without any external dependencies or cloud services.

### Key Features
- ✅ **100% Local** - No internet required (except for Anthropic API)
- ✅ **Self-Contained** - Embedded database, no Docker needed
- ✅ **Native macOS** - Menu bar integration, keyboard shortcuts
- ✅ **One-Click Install** - Download .dmg, drag to Applications
- ✅ **Offline-First** - Save projects locally, sync optional
- ✅ **Privacy-Focused** - All data stays on user's machine

---

## 🏗️ Architecture Overview

### Technology Stack

#### Desktop Framework: **Tauri v2** (Recommended)
**Why Tauri over Electron:**
- 🚀 **10x Smaller**: 3-5MB vs 50-80MB (Electron)
- ⚡ **Faster Startup**: Native WebView vs Chromium bundling
- 🔒 **More Secure**: Rust backend, isolated frontend
- 💚 **Native Performance**: Uses system WebView (WebKit on macOS)
- 🎨 **Native Look**: Proper macOS UI integration

**Alternative:** Electron (if you need Linux/Windows later)

#### Database: **SQLite** (embedded)
**Why SQLite:**
- ✅ Single-file database (no PostgreSQL server needed)
- ✅ 100% compatible with Prisma
- ✅ Zero configuration
- ✅ Portable (entire DB is one file)

#### Structure:
```
Vibing2.app/
├── Contents/
│   ├── MacOS/
│   │   └── vibing2-desktop    # Tauri/Electron binary
│   ├── Resources/
│   │   ├── app/               # Next.js app (bundled)
│   │   ├── database/          # SQLite database
│   │   ├── projects/          # User projects
│   │   └── config/            # App configuration
│   └── Info.plist
```

---

## 📋 Implementation Plan

### Phase 1: Core Setup (Week 1)
**Goal:** Basic desktop app shell with embedded Next.js

#### 1.1 Project Setup
```bash
vibing2-desktop/          # New sub-project
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs       # Main entry point
│   │   ├── commands.rs   # Tauri commands (IPC)
│   │   └── database.rs   # SQLite setup
│   ├── Cargo.toml
│   └── tauri.conf.json   # App config
├── src/                  # Frontend (Next.js export)
│   └── (symlinked from ../app)
├── scripts/
│   ├── build-desktop.sh  # Build script
│   └── bundle-dmg.sh     # Package .dmg
└── package.json          # Desktop-specific deps
```

**Tasks:**
- [ ] Initialize Tauri project: `pnpm create tauri-app`
- [ ] Configure Next.js for static export
- [ ] Set up SQLite with Prisma
- [ ] Create basic window with embedded Next.js

**Deliverable:** Empty app window opens with Next.js loading

---

#### 1.2 Database Migration (SQLite)

**Prisma Schema Changes:**
```prisma
// prisma/schema-desktop.prisma
datasource db {
  provider = "sqlite"  // Changed from postgresql
  url      = env("DATABASE_URL")
}

// Rest of schema stays the same!
// Prisma auto-converts PostgreSQL types to SQLite
```

**Auto-Setup on First Launch:**
```typescript
// src-tauri/src/database.rs
async fn init_database() -> Result<(), Error> {
  // Get app data directory
  let db_path = app_data_dir().join("vibing2.db");

  // Create database if doesn't exist
  if !db_path.exists() {
    run_migrations(&db_path).await?;
  }

  Ok(())
}
```

**Tasks:**
- [ ] Create SQLite-compatible Prisma schema
- [ ] Write migration script (PostgreSQL → SQLite)
- [ ] Auto-run migrations on first launch
- [ ] Create default admin user

**Deliverable:** SQLite database auto-created with schema

---

#### 1.3 Embedded Server

**Option A: Next.js Static Export** (Simpler)
```javascript
// next.config.mjs
export default {
  output: 'export',  // Static HTML export
  images: {
    unoptimized: true  // No Image Optimization API
  }
}
```

**Option B: Embedded Next.js Server** (Full features)
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn start_server() -> Result<String, String> {
  // Start Next.js server on random port
  let port = get_free_port();
  spawn_next_server(port).await?;
  Ok(format!("http://localhost:{}", port))
}
```

**Recommendation:** Start with Option A (static), upgrade to B if needed

**Tasks:**
- [ ] Configure Next.js static export
- [ ] Handle API routes (move to Tauri commands)
- [ ] Test all pages work statically
- [ ] Create build pipeline

**Deliverable:** Full app works offline

---

### Phase 2: Feature Parity (Week 2)
**Goal:** All web features work in desktop app

#### 2.1 API Routes → Tauri Commands

**Convert REST endpoints to IPC:**
```typescript
// Before (Web):
const response = await fetch('/api/projects/save', {
  method: 'POST',
  body: JSON.stringify(data)
});

// After (Desktop):
import { invoke } from '@tauri-apps/api/tauri';
const response = await invoke('save_project', { data });
```

**Rust Backend:**
```rust
// src-tauri/src/commands.rs
#[tauri::command]
async fn save_project(data: ProjectData) -> Result<Project, String> {
  // Use Prisma client
  let client = PrismaClient::_builder().build().await?;
  let project = client.project().create(/* ... */).exec().await?;
  Ok(project)
}
```

**Tasks:**
- [ ] Map all API routes to Tauri commands
- [ ] Implement authentication (local-only)
- [ ] Handle file operations (preview, export)
- [ ] Test all CRUD operations

**Deliverable:** Feature parity with web version

---

#### 2.2 Local File Management

**Project Structure:**
```
~/Library/Application Support/Vibing2/
├── database/
│   └── vibing2.db
├── projects/
│   ├── project-abc123/
│   │   ├── src/
│   │   │   ├── index.html
│   │   │   ├── styles.css
│   │   │   └── app.js
│   │   └── meta.json
│   └── project-xyz789/
└── config/
    └── settings.json
```

**Features:**
- Export project to folder
- Import existing projects
- Open in VS Code / Cursor
- ZIP export for sharing

**Tasks:**
- [ ] Implement project file watcher
- [ ] Create export/import dialogs
- [ ] Add "Open in Editor" button
- [ ] Auto-save to disk

**Deliverable:** Projects persist to disk

---

#### 2.3 Settings & Configuration

**Local Settings:**
```json
// ~/Library/Application Support/Vibing2/config/settings.json
{
  "anthropicApiKey": "sk-ant-...",
  "theme": "dark",
  "autoSave": true,
  "defaultProjectPath": "~/Documents/Vibing2Projects",
  "editorIntegration": {
    "defaultEditor": "vscode",
    "openOnExport": true
  }
}
```

**UI:**
- Settings window (⌘,)
- API key management
- Theme selector
- Editor preferences

**Tasks:**
- [ ] Create settings UI
- [ ] Secure API key storage (macOS Keychain)
- [ ] Theme switcher
- [ ] Validate settings on save

**Deliverable:** Full settings management

---

### Phase 3: macOS Integration (Week 3)
**Goal:** Native macOS experience

#### 3.1 Menu Bar Integration

**Features:**
```rust
// src-tauri/src/main.rs
let menu = MenuBuilder::new()
  .item(&MenuItem::new("New Project", "Cmd+N", |_| { /* ... */ }))
  .item(&MenuItem::new("Open Project", "Cmd+O", |_| { /* ... */ }))
  .item(&MenuItem::new("Save", "Cmd+S", |_| { /* ... */ }))
  .separator()
  .item(&MenuItem::new("Settings", "Cmd+,", |_| { /* ... */ }))
  .build();
```

**macOS Menu:**
- File: New, Open, Save, Export, Close
- Edit: Undo, Redo, Cut, Copy, Paste
- View: Zoom In/Out, Full Screen, Toggle Sidebar
- Window: Minimize, Zoom, Bring All to Front
- Help: Documentation, Report Bug, About

**Tasks:**
- [ ] Create full menu structure
- [ ] Implement keyboard shortcuts
- [ ] Add recent projects menu
- [ ] Handle system events (quit, close)

**Deliverable:** Standard macOS menu bar

---

#### 3.2 System Integration

**Features:**
- **Dock Icon:** Show progress, badge counts
- **Notifications:** Build complete, errors
- **Quick Look:** Preview projects in Finder
- **Spotlight:** Search projects from Spotlight
- **Drag & Drop:** Drop files to import

**Tasks:**
- [ ] Dock icon with badge
- [ ] System notifications
- [ ] File associations (.vibing)
- [ ] Drag & drop handler

**Deliverable:** Native macOS feel

---

#### 3.3 App Icon & Branding

**Requirements:**
```
Icon.iconset/
├── icon_16x16.png
├── icon_16x16@2x.png
├── icon_32x32.png
├── icon_32x32@2x.png
├── icon_128x128.png
├── icon_128x128@2x.png
├── icon_256x256.png
├── icon_256x256@2x.png
├── icon_512x512.png
└── icon_512x512@2x.png
```

**Tasks:**
- [ ] Design app icon
- [ ] Create iconset
- [ ] Set app name/version
- [ ] Add splash screen

**Deliverable:** Professional branding

---

### Phase 4: Distribution (Week 4)
**Goal:** Easy installation for end users

#### 4.1 Build Pipeline

**Automated Build Script:**
```bash
#!/bin/bash
# scripts/build-desktop.sh

# 1. Build Next.js app
cd ../
pnpm run build
pnpm run export

# 2. Copy to Tauri
cd vibing2-desktop
cp -r ../out/* src/

# 3. Build Tauri app
pnpm tauri build

# 4. Sign app (macOS)
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  src-tauri/target/release/bundle/macos/Vibing2.app

# 5. Create DMG
hdiutil create -volname "Vibing2" \
  -srcfolder src-tauri/target/release/bundle/macos \
  -ov -format UDZO Vibing2.dmg
```

**Tasks:**
- [ ] Create build script
- [ ] Set up code signing
- [ ] Generate DMG installer
- [ ] Test on clean macOS

**Deliverable:** Installable .dmg file

---

#### 4.2 Auto-Update System

**Using Tauri Updater:**
```json
// tauri.conf.json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.vibing2.com/desktop/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

**Update Server:**
```
releases.vibing2.com/
└── desktop/
    └── macos/
        ├── latest.json
        └── Vibing2-1.0.0.dmg
```

**Tasks:**
- [ ] Set up update server
- [ ] Implement version checking
- [ ] Test update flow
- [ ] Add release notes

**Deliverable:** Auto-update system

---

#### 4.3 Distribution Channels

**Options:**
1. **Direct Download** (Fastest)
   - Host .dmg on website
   - Users download and install
   - No approval needed

2. **Mac App Store** (Most reach)
   - Submit to Apple for review
   - Automatic updates via App Store
   - Requires Apple Developer Program ($99/year)

3. **Homebrew Cask** (Developer-friendly)
   ```bash
   brew install --cask vibing2
   ```

**Recommendation:** Start with #1, add #2 and #3 later

**Tasks:**
- [ ] Create landing page with download
- [ ] Write installation instructions
- [ ] Submit to App Store (optional)
- [ ] Create Homebrew formula

**Deliverable:** Multiple distribution channels

---

## 🔐 Security Considerations

### API Key Storage
```rust
// Use macOS Keychain for secure storage
use keyring::Entry;

async fn store_api_key(key: &str) -> Result<(), Error> {
  let entry = Entry::new("vibing2", "anthropic_api_key")?;
  entry.set_password(key)?;
  Ok(())
}
```

### Database Encryption
```rust
// Enable SQLite encryption
let db = SqliteConnectOptions::new()
  .filename("vibing2.db")
  .create_if_missing(true)
  .pragma("key", "user-provided-password");
```

### Sandbox Isolation
- Enable macOS App Sandbox
- Request only necessary permissions
- Validate all file operations

---

## 📊 Technical Specifications

### System Requirements
- **OS:** macOS 11 (Big Sur) or later
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB for app, 2GB for projects
- **Network:** Internet for AI requests only

### Performance Targets
- **Startup Time:** < 2 seconds
- **App Size:** < 10MB (Tauri) or < 80MB (Electron)
- **Memory Usage:** < 200MB idle, < 500MB active
- **Database:** Support 10,000+ projects

### File Formats
- **Project File:** `.vibing` (JSON)
- **Database:** `vibing2.db` (SQLite)
- **Export:** `.zip` (full project bundle)

---

## 🚀 Migration Path

### For Existing Web Users
```typescript
// Export projects from web
const exportBundle = {
  projects: [], // All user projects
  settings: {}, // User preferences
  version: '1.0.0'
};

// Import to desktop
await invoke('import_from_web', { bundle: exportBundle });
```

### Sync Strategy (Future)
- Optional cloud sync
- Conflict resolution
- Offline-first with sync queue

---

## 📦 Deliverables

### Phase 1
- ✅ Working desktop app shell
- ✅ SQLite database setup
- ✅ Embedded Next.js app

### Phase 2
- ✅ All web features working
- ✅ Local file management
- ✅ Settings UI

### Phase 3
- ✅ Native macOS integration
- ✅ Menu bar & shortcuts
- ✅ System notifications

### Phase 4
- ✅ .dmg installer
- ✅ Auto-update system
- ✅ Distribution ready

---

## 💰 Cost & Timeline

### Development Time
- **Phase 1:** 1 week (40 hours)
- **Phase 2:** 1 week (40 hours)
- **Phase 3:** 1 week (40 hours)
- **Phase 4:** 1 week (40 hours)
- **Total:** 4 weeks (160 hours)

### Infrastructure Costs
- **Code Signing:** $99/year (Apple Developer)
- **Update Server:** $5/month (Cloudflare)
- **CDN/Hosting:** $10/month (for .dmg downloads)
- **Total:** ~$180/year

### Benefits
- **Offline Usage:** No cloud costs for users
- **Privacy:** Data stays local
- **Performance:** Native speed
- **Distribution:** Reach non-technical users

---

## 🎯 Success Metrics

### Technical
- [ ] App size < 10MB
- [ ] Startup time < 2s
- [ ] Memory usage < 500MB
- [ ] All tests passing

### User Experience
- [ ] One-click installation
- [ ] Works without internet (except API)
- [ ] Native macOS feel
- [ ] Zero configuration needed

### Business
- [ ] 1,000+ downloads in first month
- [ ] 80%+ completion rate (install → first project)
- [ ] < 1% crash rate
- [ ] 4.5+ stars on App Store

---

## 🔄 Future Enhancements

### Version 1.1
- Windows support (same Tauri codebase)
- Linux support (same Tauri codebase)
- Cloud sync (optional)
- Team collaboration (local network)

### Version 1.2
- VS Code extension integration
- Git integration (auto-commit)
- Local AI models (Ollama support)
- Plugin system

### Version 2.0
- Multi-window support
- Split-screen projects
- Built-in code editor
- Terminal integration

---

## 📚 Resources

### Documentation
- [Tauri Docs](https://tauri.app/v2/guides/)
- [Prisma SQLite Guide](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
- [macOS App Distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)

### Reference Projects
- [Warp Terminal](https://www.warp.dev/) - Rust + Web UI
- [Cursor](https://cursor.sh/) - Electron-based IDE
- [Linear Desktop](https://linear.app/download) - Tauri-based app

### Tools
- **Tauri:** Desktop framework
- **Prisma:** Database ORM
- **SQLite:** Embedded database
- **Apple Developer:** Code signing & distribution

---

## ✅ Checklist for Review

### Architecture
- [ ] Tauri vs Electron decision confirmed
- [ ] SQLite schema validated
- [ ] File structure approved
- [ ] Security approach reviewed

### Features
- [ ] Feature parity with web version
- [ ] macOS integration requirements clear
- [ ] Distribution strategy approved
- [ ] Update mechanism acceptable

### Timeline
- [ ] 4-week timeline realistic
- [ ] Phase breakdown makes sense
- [ ] Resource allocation confirmed
- [ ] Dependencies identified

### Next Steps
- [ ] Get approval to proceed
- [ ] Set up development environment
- [ ] Create vibing2-desktop repo
- [ ] Begin Phase 1 implementation

---

**Ready to proceed? Please review and provide feedback on:**
1. Technology choices (Tauri vs Electron)
2. Timeline and scope
3. Feature priorities
4. Distribution strategy
5. Any concerns or questions

Once approved, I'll begin implementation of Phase 1! 🚀
