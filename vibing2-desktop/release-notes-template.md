# Vibing2 v{{VERSION}} - Release Notes

**Release Date:** {{DATE}}
**Build:** {{BUILD_NUMBER}}

## Overview

Brief description of this release - what's the main focus or theme?

## Highlights

- Key feature or improvement 1
- Key feature or improvement 2
- Key feature or improvement 3

## What's New

### Features

- **New Feature Name**: Description of the new feature and how it benefits users
- **Another Feature**: Details about this feature

### Improvements

- **Performance**: Specific performance improvements
- **UI/UX**: User interface enhancements
- **Developer Experience**: Improvements for developers using the platform

### Agent Updates

- Updated X agents with improved capabilities
- Added Y new specialized agents
- Enhanced Z agent workflows

## Bug Fixes

- Fixed issue where [describe issue]
- Resolved problem with [describe problem]
- Corrected behavior when [describe scenario]

## Security

- Security update: [describe security fix without revealing vulnerability details]
- Updated dependencies with security patches

## Breaking Changes

If applicable, list any breaking changes:

- **[Feature/API]**: Description of what changed and migration guide
- **[Another Change]**: How to update existing workflows

## Deprecations

Features or APIs that are deprecated:

- **[Feature Name]**: Will be removed in version X.X.X. Use [alternative] instead.

## Known Issues

- [Issue description] - Workaround: [describe workaround]
- [Another issue] - Fix planned for version X.X.X

## Technical Details

### System Requirements

- macOS 11.0 (Big Sur) or later
- 4GB RAM (8GB recommended)
- 500MB free disk space
- Internet connection for AI features

### Dependencies

- Node.js: v{{NODE_VERSION}}
- Tauri: v{{TAURI_VERSION}}
- Rust: v{{RUST_VERSION}}

### API Changes

If applicable:

```typescript
// Old API
oldMethod(param1, param2)

// New API
newMethod({ param1, param2, options })
```

## Installation

### Download

Choose the appropriate version for your Mac:

- **Universal Binary (Recommended)**: Works on both Intel and Apple Silicon Macs
  - [Vibing2-universal-{{VERSION}}.dmg](https://github.com/vibing2/vibing2/releases/download/v{{VERSION}}/Vibing2-universal-{{VERSION}}.dmg)

- **Apple Silicon (M1/M2/M3)**: Optimized for Apple Silicon
  - [Vibing2-aarch64-{{VERSION}}.dmg](https://github.com/vibing2/vibing2/releases/download/v{{VERSION}}/Vibing2-aarch64-apple-darwin-{{VERSION}}.dmg)

- **Intel**: For Intel-based Macs
  - [Vibing2-x86_64-{{VERSION}}.dmg](https://github.com/vibing2/vibing2/releases/download/v{{VERSION}}/Vibing2-x86_64-apple-darwin-{{VERSION}}.dmg)

### Verification

Verify your download integrity:

```bash
# Universal Binary
shasum -a 256 Vibing2-universal-{{VERSION}}.dmg
# Should match: {{UNIVERSAL_SHA256}}

# Apple Silicon
shasum -a 256 Vibing2-aarch64-apple-darwin-{{VERSION}}.dmg
# Should match: {{AARCH64_SHA256}}

# Intel
shasum -a 256 Vibing2-x86_64-apple-darwin-{{VERSION}}.dmg
# Should match: {{X86_64_SHA256}}
```

### Installation Steps

1. Download the appropriate DMG file for your Mac
2. Open the DMG file
3. Drag Vibing2.app to your Applications folder
4. Launch Vibing2 from Applications
5. On first launch, you may need to right-click and select "Open" to bypass Gatekeeper

### Updating from Previous Version

- Your settings and projects are preserved during updates
- The app will automatically check for updates (can be disabled in Preferences)
- Manual update: Download and install as a fresh installation

## Configuration

### First-Time Setup

1. Launch Vibing2
2. Configure your AI provider API keys in Settings
3. Choose your preferred development environment
4. Start building!

### API Keys

Vibing2 supports multiple AI providers:

- **Anthropic Claude** (Recommended)
- **OpenAI GPT-4**
- **Google Gemini**
- **Local Models** (Ollama)

Get API keys:
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Google: https://makersuite.google.com/

### Settings Migration

Settings from v{{PREVIOUS_VERSION}} are automatically migrated. If you experience issues:

```bash
# Reset settings (macOS)
rm -rf ~/Library/Application\ Support/com.vibing2.desktop/
```

## Feedback and Support

### Reporting Issues

Found a bug? Please report it:

1. Check [existing issues](https://github.com/vibing2/vibing2/issues)
2. Create a new issue with:
   - Vibing2 version (Help > About)
   - macOS version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Feature Requests

Have an idea? We'd love to hear it:
- [Submit feature request](https://github.com/vibing2/vibing2/issues/new?labels=enhancement)
- Join our [Discord community](https://discord.gg/vibing2)

### Documentation

- **User Guide**: https://vibing2.com/docs
- **API Reference**: https://vibing2.com/docs/api
- **Video Tutorials**: https://vibing2.com/tutorials
- **FAQ**: https://vibing2.com/faq

### Community

- **Discord**: https://discord.gg/vibing2
- **Twitter**: https://twitter.com/vibing2
- **GitHub**: https://github.com/vibing2/vibing2

## Credits

### Contributors

Thank you to everyone who contributed to this release:

- @contributor1 - Feature X
- @contributor2 - Bug fix Y
- @contributor3 - Documentation improvements

See the full list of contributors at:
https://github.com/vibing2/vibing2/graphs/contributors

### Dependencies

This release includes updates to:

- Tauri v2.x - Cross-platform app framework
- Next.js 15 - React framework
- Anthropic SDK - AI integration
- And many other open source projects

See THIRD_PARTY_LICENSES.txt for complete attribution.

## Roadmap

### Coming Soon

- Feature A (v{{NEXT_VERSION}})
- Feature B (v{{NEXT_VERSION}})
- Feature C (planning)

See our [public roadmap](https://github.com/vibing2/vibing2/projects) for more details.

### Long-term Vision

- Multi-platform support (Windows, Linux)
- Cloud synchronization
- Collaborative features
- Plugin ecosystem

## License

Vibing2 is proprietary software. See LICENSE.txt for terms.

---

**Full Changelog**: https://github.com/vibing2/vibing2/compare/v{{PREVIOUS_VERSION}}...v{{VERSION}}

Built with ❤️ by the Vibing2 team
