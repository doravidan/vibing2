# Tauri Static Export - Quick Start Guide

This guide will help you quickly build and test the Next.js application with Tauri desktop integration.

## Prerequisites

- Node.js 18+ installed
- pnpm installed
- Rust and Tauri CLI installed (for running the desktop app)

## Quick Build

### Option 1: Using the Build Script (Recommended)

```bash
# From project root
./scripts/build-desktop.sh
```

This script handles everything:
- Cleans previous builds
- Sets environment variables
- Builds static export
- Copies assets to Tauri
- Verifies the build

### Option 2: Using npm scripts

```bash
# Clean and build
npm run prebuild:desktop
npm run build:desktop
```

### Option 3: Manual Steps

```bash
# 1. Clean
rm -rf out vibing2-desktop/public/* .next

# 2. Build with desktop mode
BUILD_MODE=desktop pnpm run build

# 3. Copy assets
node vibing2-desktop/scripts/copy-assets.js
```

## Verify the Build

After building, verify these files exist:

```bash
# Check Next.js output
ls -la out/
# Should contain: index.html, _next/, and other page HTML files

# Check Tauri public directory
ls -la vibing2-desktop/public/
# Should be identical to out/
```

## Run in Tauri

```bash
# Navigate to Tauri directory
cd vibing2-desktop

# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

## What Was Configured

### 1. Next.js Configuration (`next.config.mjs`)

- `output: 'export'` - Enables static HTML export
- `images.unoptimized: true` - Disables Next.js image optimization
- `trailingSlash: true` - Adds trailing slashes to routes

### 2. Build Scripts (`package.json`)

- `prebuild:desktop` - Cleans directories
- `build:desktop` - Builds and copies assets

### 3. Asset Copy Script (`vibing2-desktop/scripts/copy-assets.js`)

- Copies from `out/` to `vibing2-desktop/public/`
- Preserves directory structure
- Verifies critical files

### 4. API Adapter (`lib/api-adapter.ts`)

- Detects environment (web vs desktop)
- Routes API calls to Tauri IPC or fetch
- Provides unified API interface

## Environment Variables

### Desktop Build (`.env.desktop`)

```env
BUILD_MODE=desktop
NEXT_PUBLIC_APP_MODE=desktop
NEXT_PUBLIC_IS_DESKTOP=true
NEXT_PUBLIC_ENABLE_WEBCONTAINER=false
NEXT_PUBLIC_ENABLE_DAYTONA=false
```

## Project Structure

```
vibing2/
├── out/                        # Next.js static export (generated)
│   ├── index.html
│   ├── create.html
│   ├── dashboard.html
│   ├── _next/static/           # Static bundles
│   └── ...
│
├── vibing2-desktop/
│   ├── public/                 # Tauri serves from here (generated)
│   │   ├── index.html
│   │   ├── _next/
│   │   └── ...
│   │
│   ├── scripts/
│   │   └── copy-assets.js      # Asset copy script
│   │
│   └── src-tauri/              # Rust backend
│       └── main.rs
│
├── scripts/
│   └── build-desktop.sh        # Build automation
│
├── lib/
│   └── api-adapter.ts          # API routing adapter
│
├── next.config.mjs             # Next.js config with static export
├── .env.desktop                # Desktop environment variables
└── package.json                # Build scripts
```

## Common Issues

### Build fails with "Dynamic routes not supported"

**Solution**: Ensure all routes are static. Check for dynamic routes like `[id]`.

### Images not loading

**Solution**:
1. Use `unoptimized: true` in next.config.mjs (already configured)
2. Store images in `/public` directory
3. Or use external CDN links

### API calls fail in desktop

**Solution**:
1. Use the API adapter (`lib/api-adapter.ts`)
2. Implement Tauri IPC commands
3. Check `window.__TAURI__` to detect environment

### CSS not applied

**Solution**:
1. Verify `_next/static/` is copied
2. Check browser console for 404 errors
3. Ensure trailingSlash is configured

## Next Steps

1. **Test the static export in browser**
   ```bash
   cd out
   python3 -m http.server 8080
   # Visit http://localhost:8080
   ```

2. **Implement Tauri IPC Commands**
   - See `TAURI_STATIC_EXPORT_GUIDE.md` for details
   - Replace API routes with Rust handlers
   - Update client code to use API adapter

3. **Add Local Database**
   - Set up SQLite in Tauri backend
   - Migrate Prisma schema
   - Implement CRUD operations

4. **Test on All Platforms**
   - macOS
   - Windows
   - Linux

## Resources

- [Complete Guide](./TAURI_STATIC_EXPORT_GUIDE.md) - Detailed documentation
- [API Adapter](./lib/api-adapter.ts) - API routing implementation
- [Tauri Docs](https://tauri.app/v1/guides/) - Official Tauri documentation
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) - Official Next.js docs

## Getting Help

If you encounter issues:

1. Check the [Complete Guide](./TAURI_STATIC_EXPORT_GUIDE.md) for detailed troubleshooting
2. Verify all files exist after build
3. Check browser/Tauri console for errors
4. Ensure environment variables are set correctly

## Build Performance

Typical build times:
- Clean build: 60-120 seconds
- Incremental build: 15-30 seconds
- Asset copy: 2-5 seconds

## Development Workflow

### Web Development (Normal)

```bash
npm run dev
# http://localhost:3000
```

### Desktop Development

```bash
# Terminal 1: Build for desktop
./scripts/build-desktop.sh

# Terminal 2: Run Tauri
cd vibing2-desktop
npm run tauri dev
```

### Production Desktop Build

```bash
# Build static export
./scripts/build-desktop.sh

# Create desktop app
cd vibing2-desktop
npm run tauri build

# Output in: vibing2-desktop/src-tauri/target/release/
```

## Success Indicators

After building, you should see:

- `out/` directory with HTML files
- `vibing2-desktop/public/` with copied assets
- No 404 errors when serving locally
- All pages load correctly in Tauri

---

**Ready to build?** Run `./scripts/build-desktop.sh` to get started!
