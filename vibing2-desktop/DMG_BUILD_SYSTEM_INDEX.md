# Vibing2 DMG Build System - Documentation Index

Quick navigation guide to all build system documentation and resources.

---

## 🚀 Quick Start (Start Here!)

**New to the build system?** Start with these in order:

1. **[BUILD_QUICK_START.md](BUILD_QUICK_START.md)** - 5-minute setup guide
   - Prerequisites check
   - First DMG build
   - Essential commands
   - Common issues

2. **[DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md)** - Complete documentation
   - Comprehensive 45+ page guide
   - Detailed setup instructions
   - All features explained
   - Advanced usage

3. **[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)** - CI/CD configuration
   - GitHub Actions secrets
   - Certificate export
   - Step-by-step setup

---

## 📚 Documentation Library

### Core Documentation

| Document | Purpose | Pages | Priority |
|----------|---------|-------|----------|
| [BUILD_QUICK_START.md](BUILD_QUICK_START.md) | Quick reference guide | 4 | 🔴 Essential |
| [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) | Complete documentation | 45+ | 🔴 Essential |
| [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) | CI/CD setup guide | 9 | 🟡 Important |
| [DMG_BUILD_SYSTEM_COMPLETE.md](DMG_BUILD_SYSTEM_COMPLETE.md) | Implementation summary | 17 | 🟢 Reference |

### Design & Templates

| File | Purpose | Type | Usage |
|------|---------|------|-------|
| [dmg-background-design.md](dmg-background-design.md) | DMG background specs | Design Guide | 🟡 Important |
| [LICENSE.txt](LICENSE.txt) | Software license | Legal | 🔴 Essential |
| [release-notes-template.md](release-notes-template.md) | Release notes format | Template | 🟡 Important |
| [download-page-template.html](download-page-template.html) | Download page | HTML Template | 🟡 Important |

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `.env.production.example` | Production environment template | `vibing2-desktop/` |
| `.env.development.example` | Development environment template | `vibing2-desktop/` |
| `tauri.conf.json` | Tauri configuration (enhanced) | `vibing2-desktop/src-tauri/` |
| `entitlements.plist` | macOS entitlements | `vibing2-desktop/src-tauri/` |

---

## 🛠️ Build Scripts

All scripts are in `vibing2-desktop/scripts/`:

| Script | Command | Purpose | Duration |
|--------|---------|---------|----------|
| `build-dmg.sh` | `pnpm run build:dmg` | Build DMG installer | 10-20 min |
| `sign-and-notarize.sh` | `pnpm run sign` | Sign and notarize | 15-20 min |
| `version-bump.sh` | `pnpm run version:patch` | Update version | ~5 sec |
| `generate-update-manifest.sh` | Manual | Create update manifest | ~1 sec |

---

## 🔄 Workflows & Automation

### GitHub Actions

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| Release Desktop | `.github/workflows/release-desktop.yml` | Tag push, Manual | Automated releases |

**Workflow Documentation**: See [DMG_BUILD_SYSTEM_README.md#github-actions-cicd](DMG_BUILD_SYSTEM_README.md#github-actions-cicd)

---

## 📖 Usage Guides

### By Task

#### "I want to build locally"
→ [BUILD_QUICK_START.md](BUILD_QUICK_START.md) - Section: "Build Your First DMG"

#### "I want to sign and notarize"
→ [BUILD_QUICK_START.md](BUILD_QUICK_START.md) - Section: "Setup Code Signing"
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Code Signing & Notarization"

#### "I want to automate releases"
→ [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) - Complete guide
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "GitHub Actions CI/CD"

#### "I want to create a release"
→ [BUILD_QUICK_START.md](BUILD_QUICK_START.md) - Section: "Release Workflow"

#### "I want to customize the DMG"
→ [dmg-background-design.md](dmg-background-design.md) - Complete design spec

#### "I want to setup download page"
→ [download-page-template.html](download-page-template.html) - Ready-to-use template

### By Role

#### Developer (First-Time Setup)
1. [BUILD_QUICK_START.md](BUILD_QUICK_START.md)
2. [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Setup"
3. Test local build

#### Release Manager
1. [BUILD_QUICK_START.md](BUILD_QUICK_START.md) - Section: "Release Workflow"
2. [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Version Management"
3. [release-notes-template.md](release-notes-template.md)

#### DevOps Engineer
1. [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)
2. [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "GitHub Actions"
3. Test CI/CD pipeline

#### Designer
1. [dmg-background-design.md](dmg-background-design.md)
2. [download-page-template.html](download-page-template.html)
3. Design assets

---

## 🔧 Troubleshooting

### Quick Fixes

**Build fails?**
→ [BUILD_QUICK_START.md](BUILD_QUICK_START.md) - Section: "Common Issues"

**Signing fails?**
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Code Signing Issues"

**Notarization fails?**
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Notarization Issues"

**GitHub Actions fails?**
→ [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) - Section: "Verification"

### Complete Troubleshooting Guide
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Troubleshooting"

---

## 📋 Checklists

### Pre-Build Checklist

```
[ ] Node.js installed (v20+)
[ ] pnpm installed (9.7.0+)
[ ] Rust/Cargo installed
[ ] Tauri CLI installed
[ ] Dependencies installed (pnpm install)
```

### Code Signing Checklist

```
[ ] Apple Developer membership active
[ ] Developer ID Application certificate installed
[ ] Certificate identity noted
[ ] Team ID obtained
[ ] App-specific password generated
[ ] .env.production configured
[ ] Test signing completed
```

### Release Checklist

```
[ ] Version bumped
[ ] CHANGELOG.md updated
[ ] Local build tested
[ ] Signing tested
[ ] GitHub secrets configured
[ ] CI/CD tested
[ ] Download page updated
[ ] Release notes prepared
```

### GitHub Actions Checklist

```
[ ] APPLE_CERTIFICATE secret added
[ ] CERTIFICATE_PASSWORD secret added
[ ] KEYCHAIN_PASSWORD secret added
[ ] APPLE_DEVELOPER_IDENTITY secret added
[ ] APPLE_ID secret added
[ ] APPLE_TEAM_ID secret added
[ ] APPLE_APP_PASSWORD secret added
[ ] Workflow tested with manual dispatch
```

Complete checklists in: [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) - Section: "Complete Checklist"

---

## 🎯 Common Workflows

### Development Workflow

```bash
# 1. Start development
cd vibing2-desktop
pnpm run dev

# 2. Make changes
# ... edit code ...

# 3. Test build locally
pnpm run build:dmg

# 4. Test DMG
open dist/Vibing2-macos.dmg
```

### Release Workflow

```bash
# 1. Bump version
pnpm run version:patch

# 2. Update changelog
nano ../CHANGELOG.md

# 3. Build and sign
pnpm run release

# 4. Push to GitHub
git push origin main
git push origin v1.0.1

# 5. Wait for CI/CD (~30 min)
# 6. Publish release on GitHub
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch
git checkout -b hotfix/1.0.1

# 2. Make fix
# ... fix bug ...

# 3. Bump patch version
pnpm run version:patch

# 4. Build and test
pnpm run build:dmg

# 5. Merge and tag
git checkout main
git merge hotfix/1.0.1
git push origin main
git push origin v1.0.1
```

---

## 📦 Distribution Assets

### For Releases

| Asset | Source | Usage |
|-------|--------|-------|
| DMG Installer | Build output | Direct download |
| Checksums | Build output | Integrity verification |
| Release Notes | Template + Edit | GitHub release description |
| Update Manifest | Generated | Auto-updater |

### For Website

| Asset | File | Customize |
|-------|------|-----------|
| Download Page | [download-page-template.html](download-page-template.html) | Branding, URLs |
| DMG Background | [dmg-background-design.md](dmg-background-design.md) | Design and export |
| License | [LICENSE.txt](LICENSE.txt) | Legal terms |

---

## 🔐 Security

### Credentials Management

**Local Development**:
- Store in `.env.production` (gitignored)
- Use password manager for backup
- Follow [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Security"

**CI/CD**:
- Use GitHub Secrets (encrypted)
- Follow [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)
- Never commit credentials

**Best Practices**:
- Use app-specific passwords
- Rotate credentials regularly
- Limit certificate access
- Document procedures

### Security Documentation
→ [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) - Section: "Best Practices > Security"

---

## 🆘 Getting Help

### Documentation First

1. Check [BUILD_QUICK_START.md](BUILD_QUICK_START.md) for quick answers
2. Search [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md) for details
3. Review [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for CI/CD issues

### Still Stuck?

1. **Search Issues**: https://github.com/vibing2/vibing2/issues
2. **Ask in Discord**: #development channel
3. **Create Issue**: With detailed error logs

### External Resources

- **Tauri Docs**: https://tauri.app/v2/
- **Apple Developer**: https://developer.apple.com/support/code-signing/
- **GitHub Actions**: https://docs.github.com/en/actions

---

## 📊 Quick Reference

### Commands

```bash
# Build
pnpm run build:dmg          # Build DMG
pnpm run sign               # Sign and notarize
pnpm run release            # Build + Sign

# Version
pnpm run version:patch      # 1.0.0 → 1.0.1
pnpm run version:minor      # 1.0.0 → 1.1.0
pnpm run version:major      # 1.0.0 → 2.0.0

# Development
pnpm run dev                # Start dev server
pnpm run release:test       # Build and open dist
```

### Files

```
vibing2-desktop/
├── scripts/                # All build scripts
├── src-tauri/             # Tauri configuration
├── dist/                  # Build output (gitignored)
├── .env.production        # Your credentials (gitignored)
└── *.md                   # Documentation
```

### Timings

- Local build: 10-20 min (first), 2-5 min (subsequent)
- Signing: 15-20 min (mostly waiting for Apple)
- CI/CD pipeline: 30-40 min total

---

## 🎓 Learning Path

### Beginner

1. Read [BUILD_QUICK_START.md](BUILD_QUICK_START.md)
2. Build your first DMG
3. Understand the output

### Intermediate

1. Read [DMG_BUILD_SYSTEM_README.md](DMG_BUILD_SYSTEM_README.md)
2. Setup code signing
3. Customize DMG design

### Advanced

1. Setup GitHub Actions
2. Configure auto-updates
3. Optimize build process
4. Create custom workflows

---

## 📝 Document Maintenance

### When to Update

**After each release**:
- Update version numbers in examples
- Add new troubleshooting items
- Update performance metrics

**When features change**:
- Update relevant documentation
- Add new sections if needed
- Update checklists

**Regular reviews** (quarterly):
- Check for outdated information
- Update external links
- Improve clarity based on feedback

### Contributing

Found an error or improvement?
1. Note the file and section
2. Suggest the change
3. Submit PR or issue

---

## 🎉 Success!

You now have everything needed to:
- ✅ Build professional DMG installers
- ✅ Sign and notarize for distribution
- ✅ Automate releases through CI/CD
- ✅ Distribute to users professionally

**Start here**: [BUILD_QUICK_START.md](BUILD_QUICK_START.md)

**Questions?** Check the docs above or ask for help!

---

**Last Updated**: 2025-10-13
**System Version**: 1.0.0
