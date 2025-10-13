# Distribution Checklist

Comprehensive checklist for releasing Vibing2 Desktop to production.

---

## Pre-Release Checklist

### Version Management

- [ ] **Update Version Numbers**
  - [ ] `package.json` - Update version field
  - [ ] `src-tauri/Cargo.toml` - Update version field
  - [ ] `src-tauri/tauri.conf.json` - Update version field
  - [ ] Ensure all three files have matching version numbers

- [ ] **Version Numbering Convention**
  - Format: `MAJOR.MINOR.PATCH` (Semantic Versioning)
  - MAJOR: Breaking changes
  - MINOR: New features, backwards compatible
  - PATCH: Bug fixes, backwards compatible
  - Example: `1.2.3`

### Code Quality

- [ ] **Code Review**
  - [ ] All changes reviewed by team member
  - [ ] No commented-out debug code
  - [ ] No console.log statements in production code
  - [ ] No hardcoded test credentials

- [ ] **Linting and Formatting**
  ```bash
  # Run linters
  cd vibing2-desktop
  pnpm run lint

  # Format code
  pnpm run format

  # Check Rust code
  cd src-tauri
  cargo fmt --check
  cargo clippy -- -D warnings
  ```

- [ ] **Security Audit**
  ```bash
  # Check for vulnerabilities
  pnpm audit
  cargo audit

  # Review dependencies
  pnpm outdated
  cargo outdated
  ```

### Testing Requirements

- [ ] **Unit Tests**
  ```bash
  # Run Rust tests
  cd src-tauri
  cargo test

  # Run JavaScript tests
  cd ..
  pnpm test
  ```

- [ ] **Integration Tests**
  - [ ] Database migrations successful
  - [ ] All IPC commands working
  - [ ] API integration functional
  - [ ] File operations working

- [ ] **Manual Testing**
  - [ ] Fresh installation on clean system
  - [ ] Upgrade from previous version
  - [ ] All major features working
  - [ ] Performance acceptable
  - [ ] No memory leaks during extended use

- [ ] **Platform Testing**
  - [ ] macOS 11 (Big Sur)
  - [ ] macOS 12 (Monterey)
  - [ ] macOS 13 (Ventura)
  - [ ] macOS 14 (Sonoma)
  - [ ] macOS 15 (Sequoia)
  - [ ] Apple Silicon (M1/M2/M3)
  - [ ] Intel processors

### Documentation

- [ ] **Update Changelog**
  - [ ] Add new version section
  - [ ] List all new features
  - [ ] Document breaking changes
  - [ ] Include bug fixes
  - [ ] Mention deprecations

- [ ] **Release Notes**
  - [ ] Write user-facing release notes
  - [ ] Highlight key features
  - [ ] Include upgrade instructions
  - [ ] Add screenshots/GIFs if applicable

- [ ] **Documentation Updates**
  - [ ] README.md updated
  - [ ] API documentation current
  - [ ] User guide reflects new features
  - [ ] Troubleshooting section updated

---

## Build Process

### Environment Preparation

- [ ] **Clean Build Environment**
  ```bash
  # Clean all caches
  cd vibing2-desktop
  rm -rf node_modules
  rm -rf src-tauri/target
  rm pnpm-lock.yaml

  # Fresh install
  pnpm install
  ```

- [ ] **Verify Dependencies**
  ```bash
  # Check Node.js version
  node --version  # Should be 18.x+

  # Check Rust version
  rustc --version  # Should be 1.70+

  # Check Tauri CLI
  pnpm tauri info
  ```

### Build Execution

- [ ] **Build Next.js Frontend**
  ```bash
  cd /path/to/vibing2
  pnpm run build

  # Verify output
  ls -la out/
  ```

- [ ] **Build for Apple Silicon**
  ```bash
  cd vibing2-desktop
  rustup target add aarch64-apple-darwin
  pnpm run build -- --target aarch64-apple-darwin

  # Verify output
  ls -la src-tauri/target/release/bundle/dmg/
  ```

- [ ] **Build for Intel**
  ```bash
  rustup target add x86_64-apple-darwin
  pnpm run build -- --target x86_64-apple-darwin

  # Verify output
  ls -la src-tauri/target/release/bundle/dmg/
  ```

- [ ] **Build Universal Binary** (Optional)
  ```bash
  pnpm run build -- --target universal-apple-darwin
  ```

### Build Verification

- [ ] **Check Binary Size**
  ```bash
  ls -lh src-tauri/target/release/vibing2-desktop
  # Should be reasonable size (< 100MB)
  ```

- [ ] **Test Built Application**
  ```bash
  open src-tauri/target/release/bundle/macos/Vibing2.app
  ```

- [ ] **Verify App Bundle Structure**
  ```bash
  ls -la src-tauri/target/release/bundle/macos/Vibing2.app/Contents/
  # Should contain: Info.plist, MacOS/, Resources/
  ```

---

## Code Signing & Notarization

### Code Signing

- [ ] **Verify Certificates**
  ```bash
  security find-identity -v -p codesigning
  # Should show "Developer ID Application" certificate
  ```

- [ ] **Sign Application**
  ```bash
  codesign --force --deep --verbose=4 \
    --sign "Developer ID Application: Your Name (TEAM_ID)" \
    --options runtime \
    Vibing2.app
  ```

- [ ] **Verify Signature**
  ```bash
  codesign -dv --verbose=4 Vibing2.app
  spctl -a -vv Vibing2.app
  ```

- [ ] **Sign DMG Files**
  ```bash
  codesign --sign "Developer ID Application: Your Name" \
    --force \
    Vibing2_1.0.0_aarch64.dmg

  codesign --sign "Developer ID Application: Your Name" \
    --force \
    Vibing2_1.0.0_x64.dmg
  ```

### Notarization

- [ ] **Submit for Notarization (Apple Silicon)**
  ```bash
  xcrun notarytool submit Vibing2_1.0.0_aarch64.dmg \
    --keychain-profile "vibing2-notarization" \
    --wait
  ```

- [ ] **Submit for Notarization (Intel)**
  ```bash
  xcrun notarytool submit Vibing2_1.0.0_x64.dmg \
    --keychain-profile "vibing2-notarization" \
    --wait
  ```

- [ ] **Staple Notarization (Apple Silicon)**
  ```bash
  xcrun stapler staple Vibing2_1.0.0_aarch64.dmg
  xcrun stapler validate Vibing2_1.0.0_aarch64.dmg
  ```

- [ ] **Staple Notarization (Intel)**
  ```bash
  xcrun stapler staple Vibing2_1.0.0_x64.dmg
  xcrun stapler validate Vibing2_1.0.0_x64.dmg
  ```

- [ ] **Verify Gatekeeper Approval**
  ```bash
  spctl -a -vv -t install Vibing2_1.0.0_aarch64.dmg
  spctl -a -vv -t install Vibing2_1.0.0_x64.dmg
  ```

---

## Quality Assurance

### Installation Testing

- [ ] **Test on Clean macOS System**
  - [ ] Fresh macOS installation or VM
  - [ ] No development tools installed
  - [ ] Standard user account (not admin)

- [ ] **Installation Process**
  - [ ] Double-click DMG opens correctly
  - [ ] Drag-to-Applications works
  - [ ] App launches without Gatekeeper warning
  - [ ] Database initializes properly
  - [ ] First-run experience smooth

- [ ] **Upgrade Testing**
  - [ ] Install previous version
  - [ ] Create test data
  - [ ] Install new version
  - [ ] Verify data migrated correctly
  - [ ] No data loss

### Functional Testing

- [ ] **Core Features**
  - [ ] User authentication works
  - [ ] Project creation successful
  - [ ] Code generation functional
  - [ ] File management working
  - [ ] Preview rendering correctly
  - [ ] Export/import functioning

- [ ] **API Integration**
  - [ ] Anthropic API key setup
  - [ ] API calls successful
  - [ ] Error handling appropriate
  - [ ] Rate limiting working

- [ ] **Database Operations**
  - [ ] Create operations
  - [ ] Read operations
  - [ ] Update operations
  - [ ] Delete operations
  - [ ] Query performance acceptable

- [ ] **UI/UX**
  - [ ] No visual glitches
  - [ ] Responsive design working
  - [ ] Dark mode functioning
  - [ ] Keyboard shortcuts active
  - [ ] Menu bar items correct

### Performance Testing

- [ ] **Startup Performance**
  - [ ] Cold start < 3 seconds
  - [ ] Warm start < 1 second

- [ ] **Runtime Performance**
  - [ ] CPU usage reasonable
  - [ ] Memory usage stable
  - [ ] No memory leaks over time

- [ ] **Database Performance**
  - [ ] Query response times acceptable
  - [ ] No database locks
  - [ ] Migrations complete quickly

### Error Handling

- [ ] **Network Failures**
  - [ ] Graceful offline mode
  - [ ] Appropriate error messages
  - [ ] Retry logic working

- [ ] **Database Errors**
  - [ ] Corruption handling
  - [ ] Migration failures handled
  - [ ] Data validation working

- [ ] **User Input Validation**
  - [ ] Invalid input rejected
  - [ ] XSS prevention working
  - [ ] SQL injection prevented

---

## Release Preparation

### Generate Checksums

- [ ] **Create SHA-256 Checksums**
  ```bash
  cd src-tauri/target/release/bundle/dmg

  # Generate checksums
  shasum -a 256 Vibing2_1.0.0_aarch64.dmg > checksums.txt
  shasum -a 256 Vibing2_1.0.0_x64.dmg >> checksums.txt

  # Verify checksums
  cat checksums.txt
  ```

### Package Assets

- [ ] **Organize Release Files**
  ```bash
  mkdir -p releases/v1.0.0
  cp src-tauri/target/release/bundle/dmg/*.dmg releases/v1.0.0/
  cp checksums.txt releases/v1.0.0/
  cp CHANGELOG.md releases/v1.0.0/
  cp RELEASE_NOTES.md releases/v1.0.0/
  ```

- [ ] **Create Compressed Archives**
  ```bash
  cd releases
  tar -czf vibing2-desktop-v1.0.0.tar.gz v1.0.0/
  zip -r vibing2-desktop-v1.0.0.zip v1.0.0/
  ```

### Marketing Materials

- [ ] **Screenshots**
  - [ ] Main interface
  - [ ] Key features
  - [ ] Before/after comparisons
  - [ ] Different themes/modes

- [ ] **Demo Video**
  - [ ] Installation process
  - [ ] Key features walkthrough
  - [ ] Performance highlights

- [ ] **Social Media Assets**
  - [ ] Twitter announcement tweet
  - [ ] LinkedIn post
  - [ ] GitHub release announcement
  - [ ] Blog post (if applicable)

---

## Distribution

### Upload to Distribution Channels

- [ ] **GitHub Release**
  ```bash
  # Create release
  gh release create v1.0.0 \
    --title "Vibing2 Desktop v1.0.0" \
    --notes-file RELEASE_NOTES.md \
    releases/v1.0.0/*.dmg \
    releases/v1.0.0/checksums.txt

  # Verify release
  gh release view v1.0.0
  ```

- [ ] **Website Download Page**
  - [ ] Upload DMG files to CDN/server
  - [ ] Update download links
  - [ ] Update version numbers
  - [ ] Add release notes
  - [ ] Test download links

- [ ] **Update Server** (for auto-updates)
  - [ ] Upload update manifest
  - [ ] Update version endpoint
  - [ ] Test auto-update detection

### Documentation Updates

- [ ] **Update Website**
  - [ ] Homepage version number
  - [ ] Download page updated
  - [ ] Changelog published
  - [ ] Documentation versioned

- [ ] **Repository Updates**
  - [ ] README.md version badge
  - [ ] Installation instructions
  - [ ] Changelog committed
  - [ ] Git tag created

### Communication

- [ ] **Announcement Channels**
  - [ ] GitHub Discussions post
  - [ ] Twitter/X announcement
  - [ ] LinkedIn update
  - [ ] Discord/Slack notification
  - [ ] Email newsletter (if applicable)

- [ ] **Support Preparation**
  - [ ] Update support documentation
  - [ ] Prepare FAQ responses
  - [ ] Alert support team
  - [ ] Monitor feedback channels

---

## Post-Release

### Monitoring

- [ ] **Track Downloads**
  - [ ] GitHub release downloads
  - [ ] Website analytics
  - [ ] Geographic distribution

- [ ] **Monitor Error Reports**
  - [ ] Check crash reports
  - [ ] Review user feedback
  - [ ] Monitor support tickets

- [ ] **Performance Metrics**
  - [ ] App launch times
  - [ ] API response times
  - [ ] Database performance

### User Feedback

- [ ] **Collect Feedback**
  - [ ] Monitor GitHub issues
  - [ ] Review social media mentions
  - [ ] Track support requests
  - [ ] Analyze user surveys

- [ ] **Address Critical Issues**
  - [ ] Triage reported bugs
  - [ ] Plan hotfix releases
  - [ ] Communicate with users

### Planning

- [ ] **Document Lessons Learned**
  - [ ] What went well
  - [ ] What could improve
  - [ ] Process optimizations

- [ ] **Plan Next Release**
  - [ ] Review feature requests
  - [ ] Prioritize bug fixes
  - [ ] Set timeline
  - [ ] Update roadmap

---

## Release Notes Template

```markdown
# Vibing2 Desktop v1.0.0

Released: [Date]

## What's New

### Major Features
- [Feature 1]: Brief description
- [Feature 2]: Brief description

### Improvements
- [Improvement 1]
- [Improvement 2]

### Bug Fixes
- Fixed: [Bug description]
- Fixed: [Bug description]

## Breaking Changes

- [Breaking change 1]
  - Migration steps: [instructions]

## Upgrade Instructions

1. Download the latest DMG for your architecture
2. Drag Vibing2 to Applications (overwrite existing)
3. Launch the app
4. Database will migrate automatically

## System Requirements

- macOS 11 (Big Sur) or later
- 4GB RAM minimum, 8GB recommended
- 500MB disk space

## Download

- [Apple Silicon (M1/M2/M3)](link)
- [Intel (x86_64)](link)

## Checksums

```
[SHA-256 checksums]
```

## Known Issues

- [Known issue 1]
- [Known issue 2]

## Contributors

Thanks to everyone who contributed to this release!

[List of contributors]

---

For support, visit: https://github.com/vibing2/vibing2/discussions
```

---

## Emergency Procedures

### Critical Bug Discovery

1. **Assess Severity**
   - Can users continue working?
   - Is data at risk?
   - Is security compromised?

2. **Immediate Actions**
   - [ ] Notify users via all channels
   - [ ] Remove download links if necessary
   - [ ] Prepare hotfix release
   - [ ] Communicate timeline

3. **Hotfix Process**
   - [ ] Create hotfix branch
   - [ ] Implement fix
   - [ ] Fast-track testing
   - [ ] Release as patch version
   - [ ] Update all channels

### Rollback Plan

- [ ] **Previous Version Available**
  - Keep previous DMG files accessible
  - Provide downgrade instructions
  - Document data migration issues

- [ ] **Rollback Communication**
  - Clear instructions for users
  - Explanation of issues
  - Timeline for resolution

---

## Version History

| Version | Release Date | Notes |
|---------|-------------|-------|
| 1.0.0   | 2025-XX-XX  | Initial release |

---

## Checklist Sign-Off

- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **QA Lead**: _____________________ Date: _______
- [ ] **Product Manager**: ______________ Date: _______
- [ ] **Release Manager**: ______________ Date: _______

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Maintainer:** Vibing2 Team
