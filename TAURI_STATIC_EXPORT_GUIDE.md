# Tauri Static Export Configuration Guide

This guide explains how the Next.js application is configured for static export to integrate with the Tauri desktop app.

## Overview

The project uses Next.js static export (`output: 'export'`) to generate a fully static HTML/CSS/JS application that runs in Tauri without requiring a Node.js server.

## Configuration Files

### 1. next.config.mjs

The configuration conditionally enables static export when `BUILD_MODE=desktop`:

```javascript
{
  output: 'export',              // Enable static HTML export
  images: { unoptimized: true }, // Disable Next.js image optimization
  trailingSlash: true,           // Add trailing slashes to routes
  basePath: '',                  // No base path for Tauri
  assetPrefix: '',               // No asset prefix for local files
}
```

### 2. package.json Scripts

Three key scripts handle the desktop build:

- `prebuild:desktop`: Cleans the `out/` and `vibing2-desktop/public/` directories
- `build:desktop`: Builds the static export and copies assets
- The copy-assets script runs automatically after build

```bash
# Clean build
npm run prebuild:desktop

# Full desktop build
npm run build:desktop
```

### 3. copy-assets.js

This script copies the static export from `/out` to `/vibing2-desktop/public`:

- Verifies the source directory exists
- Cleans the destination directory
- Copies all files while preserving structure
- Logs progress and verifies critical files
- Provides detailed error messages

## Build Process

### Step 1: Clean Previous Builds

```bash
rm -rf out
rm -rf vibing2-desktop/public/*
```

### Step 2: Build Static Export

```bash
BUILD_MODE=desktop next build
```

This creates a complete static site in the `out/` directory with:
- HTML files for each page
- Static assets in `_next/static/`
- Public assets
- All JavaScript bundles

### Step 3: Copy to Tauri

```bash
node vibing2-desktop/scripts/copy-assets.js
```

Copies everything to `vibing2-desktop/public/` where Tauri serves it.

### Complete Build Command

```bash
npm run build:desktop
```

This runs all three steps in sequence.

## Directory Structure

```
vibing2/
├── out/                          # Next.js static export output
│   ├── index.html               # Home page
│   ├── create.html              # Create page
│   ├── dashboard.html           # Dashboard
│   ├── _next/                   # Next.js assets
│   │   └── static/              # Static JS/CSS bundles
│   └── ...other pages
│
└── vibing2-desktop/
    └── public/                   # Tauri serves from here
        ├── index.html           # Copied from out/
        ├── _next/               # Copied static assets
        └── ...all static files
```

## Page Routes

The following pages are exported as static HTML:

- `/` → `index.html` (Landing page)
- `/create` → `create.html` (App creation interface)
- `/dashboard` → `dashboard.html` (User dashboard)
- `/projects` → `projects.html` (Project list)
- `/discover` → `discover.html` (Discover page)
- `/settings` → `settings.html` (Settings page)
- `/auth/signin` → `auth/signin.html` (Sign in)
- `/auth/signup` → `auth/signup.html` (Sign up)

## API Route Migration

The web version uses Next.js API routes (`/app/api/**`), but the desktop version needs Tauri IPC commands instead.

### Current API Routes to Migrate

1. **Authentication**
   - `/api/auth/signup` → Tauri command: `authenticate_user`
   - `/api/auth/signin` → Tauri command: `sign_in_user`

2. **Projects**
   - `/api/projects/save` → Tauri command: `save_project`
   - `/api/projects/load` → Tauri command: `load_project`
   - `/api/projects/list` → Tauri command: `list_projects`

3. **AI Agent Streaming**
   - `/api/agent/stream` → Tauri command: `stream_ai_response`
   - `/api/agents/auto-select` → Tauri command: `select_agent`

4. **Collaboration**
   - `/api/collab/*` → Requires backend or P2P solution

### Migration Strategy

Create a client-side adapter that detects the environment:

```typescript
// lib/api-adapter.ts
export async function apiCall(endpoint: string, options: RequestInit) {
  if (window.__TAURI__) {
    // Running in Tauri - use IPC commands
    return tauriInvoke(endpoint, options);
  } else {
    // Running in browser - use fetch
    return fetch(endpoint, options);
  }
}
```

## Environment Variables

### Desktop-Specific (.env.desktop)

```env
BUILD_MODE=desktop
NEXT_PUBLIC_APP_MODE=desktop
NEXT_PUBLIC_IS_DESKTOP=true
NEXT_PUBLIC_ENABLE_WEBCONTAINER=false
NEXT_PUBLIC_ENABLE_DAYTONA=false
NEXT_PUBLIC_ENABLE_FILE_SYSTEM=true
```

## Static Export Limitations

### What Works

- Client-side React components
- Static pages and routing
- CSS/Tailwind styles
- Client-side state management (Zustand)
- Local storage and IndexedDB
- WebAssembly (if needed)

### What Doesn't Work

- Server-side rendering (SSR)
- API routes (need Tauri IPC)
- Middleware
- Edge runtime
- Dynamic server components
- Image optimization (must use `unoptimized: true`)
- Dynamic imports with server components

### Workarounds

1. **API Routes**: Use Tauri IPC commands
2. **Authentication**: Store JWT in local storage or Tauri secure storage
3. **Database**: Use Tauri's Rust backend with SQLite
4. **File System**: Use Tauri's file system APIs
5. **Environment Variables**: Use `NEXT_PUBLIC_*` prefix

## Testing the Build

### 1. Build the Static Export

```bash
npm run build:desktop
```

### 2. Verify Output Structure

```bash
ls -la out/
ls -la vibing2-desktop/public/
```

Expected output:
- `index.html` and other page HTML files
- `_next/static/` directory with JS bundles
- All public assets

### 3. Test in Browser (Optional)

```bash
cd out
python3 -m http.server 8080
```

Visit `http://localhost:8080` to test the static site.

### 4. Test in Tauri

```bash
cd vibing2-desktop
npm run tauri dev
```

## Troubleshooting

### Build Fails with "Page not found"

Ensure all dynamic routes have fallback or are converted to static routes.

### Images Not Loading

1. Use `next/image` with `unoptimized: true`
2. Or use standard `<img>` tags
3. Store images in `/public` directory

### API Calls Fail

1. Check if running in Tauri: `window.__TAURI__`
2. Implement Tauri IPC commands as replacement
3. Add error handling for network calls

### CSS Not Applied

1. Verify `_next/static/` directory is copied
2. Check browser console for 404 errors
3. Ensure `trailingSlash: true` in config

### Fonts Not Loading

1. Host fonts locally in `/public/fonts`
2. Or use Google Fonts CDN (requires internet)
3. Configure fonts in `next.config.mjs`

## Performance Optimization

### 1. Code Splitting

Next.js automatically splits code by page. Each page gets its own bundle.

### 2. Asset Optimization

- Minify JavaScript: Automatic in production build
- Compress images: Use tools like `sharp` or `imagemin`
- Tree shaking: Remove unused code

### 3. Lazy Loading

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false, // Disable SSR for client-only components
});
```

### 4. Bundle Analysis

```bash
npm install --save-dev @next/bundle-analyzer
```

Add to `next.config.mjs`:

```javascript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

Run analysis:

```bash
ANALYZE=true BUILD_MODE=desktop npm run build:desktop
```

## Next Steps

1. **Implement Tauri IPC Commands**
   - Create Rust handlers for each API endpoint
   - Add TypeScript bindings
   - Update client code to use IPC

2. **Add Local Database**
   - Set up SQLite in Tauri backend
   - Migrate Prisma schema
   - Implement CRUD operations

3. **Implement File System Access**
   - Use Tauri's FS APIs
   - Add file picker dialogs
   - Handle file uploads/downloads

4. **Add Offline Support**
   - Implement service worker
   - Cache static assets
   - Add sync queue for API calls

5. **Testing**
   - Write integration tests
   - Test on all platforms (Windows, macOS, Linux)
   - Performance benchmarks

## Resources

- [Next.js Static Export Docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Tauri IPC Guide](https://tauri.app/v1/guides/features/command)
- [Tauri File System API](https://tauri.app/v1/api/js/fs)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
