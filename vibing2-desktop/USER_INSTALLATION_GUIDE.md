# User Installation Guide

Welcome to Vibing2 Desktop! This guide will help you install and set up the application on your macOS computer.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Download Instructions](#download-instructions)
- [Installation Steps](#installation-steps)
- [First-Time Setup](#first-time-setup)
- [Getting Started](#getting-started)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)
- [FAQ](#faq)
- [Support](#support)

---

## System Requirements

### Minimum Requirements

- **Operating System**: macOS 11 (Big Sur) or later
- **Processor**: Apple Silicon (M1/M2/M3) or Intel Core i5
- **Memory**: 4GB RAM
- **Storage**: 500MB available space
- **Internet**: Required for AI API calls only

### Recommended Requirements

- **Operating System**: macOS 13 (Ventura) or later
- **Processor**: Apple Silicon (M1 or newer) or Intel Core i7
- **Memory**: 8GB RAM or more
- **Storage**: 2GB available space (for projects)
- **Internet**: Stable connection for optimal experience

### Checking Your System

To check which processor your Mac has:

1. Click the Apple menu () in the top-left corner
2. Select "About This Mac"
3. Look for "Chip" or "Processor" line
   - **Apple Silicon**: Shows "Apple M1", "Apple M2", etc.
   - **Intel**: Shows "Intel Core i5", "Intel Core i7", etc.

To check your macOS version:

1. Click the Apple menu () in the top-left corner
2. Select "About This Mac"
3. Version number is displayed prominently

---

## Download Instructions

### Step 1: Visit the Download Page

Visit the official download page:
- **Website**: https://vibing2.com/download
- **GitHub Releases**: https://github.com/vibing2/vibing2/releases

### Step 2: Choose Your Version

Download the correct version for your Mac:

#### For Apple Silicon (M1/M2/M3)
- File name: `Vibing2_1.0.0_aarch64.dmg`
- Size: Approximately 40-50MB
- **Most newer Macs (2020 and later)**

#### For Intel Processors
- File name: `Vibing2_1.0.0_x64.dmg`
- Size: Approximately 45-55MB
- **Older Macs (2019 and earlier)**

### Step 3: Download the DMG File

1. Click the download link for your processor type
2. Your browser will download the `.dmg` file
3. Wait for the download to complete
4. File will appear in your Downloads folder

### Verifying Your Download (Optional but Recommended)

To ensure the file downloaded correctly:

1. Open Terminal (Applications > Utilities > Terminal)
2. Navigate to Downloads:
   ```bash
   cd ~/Downloads
   ```
3. Calculate checksum:
   ```bash
   shasum -a 256 Vibing2_1.0.0_aarch64.dmg
   ```
4. Compare the output with the checksum on the download page

---

## Installation Steps

### Step 1: Open the DMG File

1. Locate the downloaded `.dmg` file in your Downloads folder
2. Double-click the file to open it
3. A new window will appear showing the Vibing2 app icon

**What you'll see:**
- Vibing2 app icon on the left
- Applications folder shortcut on the right
- Background image with installation instructions

### Step 2: Drag to Applications

1. Click and hold the Vibing2 icon
2. Drag it to the Applications folder icon
3. Release to copy the app

**Note**: This copies the app to your Applications folder, making it accessible from Launchpad and Spotlight.

### Step 3: Eject the DMG

1. In Finder's sidebar, locate the "Vibing2" disk image
2. Click the eject button next to it
3. You can now delete the `.dmg` file from Downloads

### Step 4: First Launch

1. Open Finder and navigate to Applications
2. Find "Vibing2" in the list
3. Double-click to launch

**Important**: On first launch, you may see a security warning. Continue to the next section.

---

## First-Time Setup

### Security Warning

When you first launch Vibing2, macOS may show a security warning:

**"Vibing2" cannot be opened because it is from an unidentified developer**

This is normal for downloaded apps. To resolve:

#### Option 1: Through System Settings (Recommended)

1. The warning dialog appears
2. Click "OK" to dismiss
3. Open System Settings (or System Preferences)
4. Go to "Privacy & Security"
5. Scroll down to the Security section
6. You'll see: "Vibing2 was blocked from use because it is not from an identified developer"
7. Click "Open Anyway"
8. Confirm by clicking "Open"

#### Option 2: Using Right-Click

1. Close the warning dialog
2. In Applications folder, right-click (or Control-click) on Vibing2
3. Select "Open" from the menu
4. Click "Open" in the confirmation dialog

**Note**: You only need to do this once. Future launches will work normally.

### Initial Configuration

After Vibing2 opens for the first time:

#### 1. Welcome Screen

You'll see the Vibing2 welcome screen with:
- Quick tour of features
- Links to documentation
- Option to skip tutorial

**Action**: Click "Get Started" or "Skip" to continue

#### 2. API Key Setup

To use AI features, you need an Anthropic API key:

1. Visit https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

Back in Vibing2:

1. Click "Settings" or the gear icon
2. Select "API Configuration"
3. Paste your API key in the field
4. Click "Save"

**Important**: Your API key is stored securely on your Mac and never sent anywhere except Anthropic's API.

#### 3. Privacy Settings

Configure your privacy preferences:

- **Analytics**: Help improve Vibing2 by sharing anonymous usage data
  - Default: Enabled
  - Can be disabled in Settings

- **Crash Reports**: Send crash reports to help fix bugs
  - Default: Enabled
  - Can be disabled in Settings

- **Local Storage**: All your projects are stored locally on your Mac
  - Location: `~/Library/Application Support/com.vibing2.desktop/`

#### 4. Theme Selection

Choose your preferred color theme:

- **System**: Matches macOS appearance
- **Light**: Always use light theme
- **Dark**: Always use dark theme

**Recommendation**: Use "System" for automatic switching based on macOS settings.

---

## Getting Started

### Creating Your First Project

1. **Launch Vibing2**
   - From Applications folder
   - From Launchpad
   - Using Spotlight (Cmd+Space, type "Vibing2")

2. **Start a New Project**
   - Click "New Project" button
   - Or press `Cmd+N`

3. **Choose Project Type**
   - Web Application
   - React Component
   - API Endpoint
   - Full Stack App
   - Custom (blank slate)

4. **Name Your Project**
   - Enter a descriptive name
   - Choose save location (optional)
   - Click "Create"

5. **Describe What You Want**
   - Type your request in natural language
   - Example: "Create a todo app with React and local storage"
   - Press Enter or click "Generate"

6. **Watch AI Work**
   - Vibing2 will analyze your request
   - Generate code and file structure
   - Show live preview if applicable

7. **Interact and Refine**
   - Review generated code
   - Ask for changes
   - Test in preview
   - Export when satisfied

### Understanding the Interface

#### Main Window Layout

**Left Panel**: File Structure
- Shows all project files
- Click to view/edit files
- Right-click for options
- Drag to reorganize

**Center Panel**: Code Editor
- Syntax highlighting
- Auto-completion
- Multi-file tabs
- Search and replace

**Right Panel**: Preview/Output
- Live preview of web apps
- Console output
- Error messages
- Interactive testing

**Bottom Bar**: Chat Interface
- Send messages to AI
- View conversation history
- Quick action buttons
- Status indicators

#### Menu Bar

**File Menu**
- New Project (Cmd+N)
- Open Project (Cmd+O)
- Save Project (Cmd+S)
- Export Project
- Close Project

**Edit Menu**
- Undo (Cmd+Z)
- Redo (Cmd+Shift+Z)
- Cut/Copy/Paste
- Find (Cmd+F)
- Replace (Cmd+Option+F)

**View Menu**
- Toggle Panels
- Zoom In/Out
- Full Screen (Cmd+Ctrl+F)
- Toggle Developer Tools

**Project Menu**
- Run Preview
- Build Project
- Test Project
- Deploy Options

**Help Menu**
- Documentation
- Keyboard Shortcuts
- Report Issue
- Check for Updates

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Project | Cmd+N |
| Open Project | Cmd+O |
| Save Project | Cmd+S |
| Close Project | Cmd+W |
| Find in Files | Cmd+Shift+F |
| Command Palette | Cmd+P |
| Toggle Terminal | Cmd+` |
| Run/Preview | Cmd+R |
| Stop Preview | Cmd+. |
| Toggle Sidebar | Cmd+B |
| Quick AI Query | Cmd+K |

---

## Troubleshooting

### App Won't Open

#### Problem: "Vibing2 is damaged and can't be opened"

**Solution**:
1. Open Terminal (Applications > Utilities > Terminal)
2. Run this command:
   ```bash
   xattr -d com.apple.quarantine /Applications/Vibing2.app
   ```
3. Press Enter and provide password if requested
4. Try opening Vibing2 again

#### Problem: App opens then immediately closes

**Solution**:
1. Check Console for error messages:
   - Open Console app (Applications > Utilities)
   - Search for "Vibing2"
   - Look for crash reports

2. Reset app data (CAUTION: Deletes all projects):
   ```bash
   rm -rf ~/Library/Application\ Support/com.vibing2.desktop/
   ```

3. If issue persists, reinstall:
   - Delete Vibing2 from Applications
   - Empty Trash
   - Download fresh copy
   - Reinstall

### Performance Issues

#### Problem: App is slow or unresponsive

**Solutions**:

1. **Check System Resources**:
   - Open Activity Monitor (Applications > Utilities)
   - Look for Vibing2 process
   - Check CPU and Memory usage

2. **Reduce Active Projects**:
   - Close unused project tabs
   - Save and close large projects
   - Archive old projects

3. **Clear Cache**:
   ```bash
   rm -rf ~/Library/Caches/com.vibing2.desktop/
   ```

4. **Restart the App**:
   - Quit completely (Cmd+Q)
   - Wait 5 seconds
   - Relaunch

#### Problem: Preview not loading

**Solutions**:

1. **Refresh Preview**:
   - Click refresh button in preview panel
   - Or press Cmd+R

2. **Check Console**:
   - Open Developer Tools (Right-click preview > Inspect)
   - Look for JavaScript errors in Console tab

3. **Rebuild Project**:
   - Go to Project menu
   - Select "Clean Build"
   - Then "Rebuild"

### API Issues

#### Problem: "API Key Invalid" error

**Solutions**:

1. **Verify API Key**:
   - Go to Settings > API Configuration
   - Check key has no extra spaces
   - Ensure key is from Anthropic Console

2. **Check API Key Status**:
   - Visit https://console.anthropic.com
   - Verify key is active
   - Check usage limits

3. **Regenerate Key**:
   - Create new key in Anthropic Console
   - Update in Vibing2 Settings
   - Save and restart app

#### Problem: "Network Error" or "Connection Failed"

**Solutions**:

1. **Check Internet Connection**:
   - Ensure you're connected to internet
   - Try accessing a website in browser

2. **Check Firewall**:
   - System Settings > Network > Firewall
   - Ensure Vibing2 is allowed

3. **Use VPN/Proxy**:
   - If using VPN, try disconnecting
   - If behind corporate proxy, check proxy settings

### Database Issues

#### Problem: Projects not loading

**Solution**:
1. Check database file exists:
   ```bash
   ls -la ~/Library/Application\ Support/com.vibing2.desktop/vibing2.db
   ```

2. If corrupted, backup and reset:
   ```bash
   cd ~/Library/Application\ Support/com.vibing2.desktop/
   cp vibing2.db vibing2.db.backup
   rm vibing2.db
   ```

3. Relaunch Vibing2 (new database will be created)

#### Problem: "Database locked" error

**Solutions**:

1. **Close other instances**:
   - Ensure only one Vibing2 window is open
   - Check Activity Monitor for multiple processes

2. **Restart app**:
   - Quit Vibing2 completely
   - Wait 5 seconds
   - Relaunch

### Update Issues

#### Problem: "Update Failed" notification

**Solutions**:

1. **Manual Update**:
   - Download latest version from website
   - Install over existing version
   - Your data will be preserved

2. **Check Disk Space**:
   - Ensure at least 1GB free space
   - Free up space if needed

3. **Disable Auto-Update**:
   - Settings > Updates
   - Uncheck "Automatically check for updates"
   - Update manually when needed

---

## Uninstallation

### Complete Removal

To completely remove Vibing2 from your Mac:

#### Step 1: Quit the Application

1. Open Vibing2
2. Go to Vibing2 menu > Quit Vibing2
3. Or press Cmd+Q

#### Step 2: Delete the Application

1. Open Finder
2. Go to Applications folder
3. Find Vibing2
4. Drag to Trash
5. Or right-click > Move to Trash

#### Step 3: Remove Support Files

Open Terminal and run:

```bash
# Remove application data
rm -rf ~/Library/Application\ Support/com.vibing2.desktop/

# Remove preferences
rm -rf ~/Library/Preferences/com.vibing2.desktop.plist

# Remove caches
rm -rf ~/Library/Caches/com.vibing2.desktop/

# Remove logs
rm -rf ~/Library/Logs/com.vibing2.desktop/
```

#### Step 4: Empty Trash

1. Right-click Trash icon in Dock
2. Select "Empty Trash"
3. Confirm deletion

### Keeping Your Projects

If you want to keep your projects before uninstalling:

1. Export all projects:
   - Open each project in Vibing2
   - File > Export Project
   - Save to a safe location

2. Or backup the database:
   ```bash
   cp ~/Library/Application\ Support/com.vibing2.desktop/vibing2.db ~/Desktop/vibing2-backup.db
   ```

3. Store exported projects in:
   ```
   ~/Documents/Vibing2-Backup/
   ```

---

## FAQ

### General Questions

**Q: Is Vibing2 free?**
A: Vibing2 Desktop is free to download and use. You need your own Anthropic API key, which has separate pricing.

**Q: Does Vibing2 work offline?**
A: The app works offline for viewing and editing projects, but AI features require an internet connection to reach Anthropic's API.

**Q: Where are my projects stored?**
A: All projects are stored locally in `~/Library/Application Support/com.vibing2.desktop/vibing2.db`. No data is sent to external servers except AI API calls.

**Q: Can I use Vibing2 on multiple Macs?**
A: Yes, but projects are stored locally. Use Export/Import to transfer projects between machines.

### Privacy and Security

**Q: Is my data secure?**
A: Yes. All data is stored locally on your Mac. Only your prompts are sent to Anthropic's API (encrypted over HTTPS).

**Q: Does Vibing2 collect telemetry?**
A: Only if enabled. Anonymous usage statistics help improve the app. Can be disabled in Settings.

**Q: Is my API key safe?**
A: Your API key is stored in macOS Keychain, the same secure storage used by your passwords.

### Technical Questions

**Q: Which AI model does Vibing2 use?**
A: Vibing2 uses Claude (Anthropic) models. Specific model version depends on your API settings.

**Q: Can I use GPT/OpenAI instead?**
A: Currently, only Anthropic's Claude is supported. Other providers may be added in future versions.

**Q: Does Vibing2 support Python/Java/other languages?**
A: Vibing2 focuses on web development (HTML, CSS, JavaScript, React, etc.) but can generate code in many languages.

**Q: Can I edit the generated code?**
A: Yes! All code is fully editable. Vibing2 is a tool to accelerate development, not replace manual coding.

### Troubleshooting

**Q: Why is the app so large?**
A: Vibing2 includes a full web browser engine (WebView) and SQLite database. This enables offline functionality.

**Q: Why does it use so much RAM?**
A: Modern web applications require significant memory. Close unused projects to reduce memory usage.

**Q: Can I run multiple instances?**
A: Only one instance can run at a time due to database locking. Use multiple projects within one instance.

---

## Support

### Getting Help

**Documentation**
- Full documentation: https://docs.vibing2.com
- Video tutorials: https://vibing2.com/tutorials
- Sample projects: https://github.com/vibing2/examples

**Community Support**
- GitHub Discussions: https://github.com/vibing2/vibing2/discussions
- Discord: https://discord.gg/vibing2
- Twitter: @Vibing2App

**Bug Reports**
- GitHub Issues: https://github.com/vibing2/vibing2/issues
- Include:
  - macOS version
  - Vibing2 version
  - Steps to reproduce
  - Screenshots if applicable

**Feature Requests**
- GitHub Discussions: https://github.com/vibing2/vibing2/discussions
- Describe:
  - Use case
  - Expected behavior
  - Alternative solutions considered

### Contact

- **Email**: support@vibing2.com
- **Response Time**: Within 48 hours
- **Priority Support**: Available for Enterprise users

---

## System Information

To provide helpful bug reports, include this information:

### Vibing2 Version

In the app:
1. Go to Vibing2 menu
2. Select "About Vibing2"
3. Note version number

### macOS Version

```bash
sw_vers
```

### System Architecture

```bash
uname -m
```

Output:
- `arm64` = Apple Silicon
- `x86_64` = Intel

### Available Resources

```bash
# Check RAM
sysctl hw.memsize

# Check disk space
df -h
```

---

## Additional Resources

### Learning Resources

**Beginner Guides**
- [Getting Started with AI Development](https://vibing2.com/guides/getting-started)
- [Understanding AI Prompts](https://vibing2.com/guides/prompts)
- [Best Practices](https://vibing2.com/guides/best-practices)

**Advanced Topics**
- [Custom Agents](https://vibing2.com/guides/custom-agents)
- [API Integration](https://vibing2.com/guides/api-integration)
- [Performance Optimization](https://vibing2.com/guides/performance)

**Video Tutorials**
- [Installation Walkthrough](https://youtube.com/watch?v=example1)
- [Creating Your First Project](https://youtube.com/watch?v=example2)
- [Advanced Features](https://youtube.com/watch?v=example3)

### Related Tools

**Required**
- [Anthropic Console](https://console.anthropic.com) - API key management

**Optional**
- [GitHub Desktop](https://desktop.github.com) - Version control
- [VS Code](https://code.visualstudio.com) - Advanced code editing
- [Docker Desktop](https://docker.com) - Containerization

---

## Changelog

### Version 1.0.0 (Current)

- Initial public release
- Core AI generation features
- Local project management
- SQLite database integration
- macOS native interface
- Multi-file support
- Live preview
- Export functionality

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Maintainer:** Vibing2 Team

---

Thank you for choosing Vibing2 Desktop! We're excited to see what you'll build.
