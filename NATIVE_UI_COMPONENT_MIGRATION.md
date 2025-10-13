# Native UI Component Migration Guide
## Vibing2 React to Native macOS UI Migration Plan

**Generated:** 2025-10-13
**Purpose:** Comprehensive guide for migrating React components to native SwiftUI/AppKit
**Scope:** All pages, components, and UI patterns in Vibing2

---

## Executive Summary

Vibing2 contains **9 pages** and **16 reusable components** with varying complexity levels. This guide provides a phased migration strategy from React 19/Next.js 15 to native macOS UI (SwiftUI + AppKit).

### Migration Statistics
- **Total Pages:** 9
- **Total Components:** 16
- **Easy Migrations:** 8 components (50%)
- **Medium Migrations:** 5 components (31%)
- **Hard Migrations:** 3 components (19%)
- **Recommended Hybrid:** 2 components (Preview, CodeViewer)

---

## Table of Contents

1. [Page Inventory](#page-inventory)
2. [Component Inventory](#component-inventory)
3. [Migration Difficulty Assessment](#migration-difficulty-assessment)
4. [Native Technology Stack](#native-technology-stack)
5. [Phased Migration Plan](#phased-migration-plan)
6. [Component-Specific Migration Guides](#component-specific-migration-guides)
7. [State Management Migration](#state-management-migration)
8. [Third-Party Dependencies](#third-party-dependencies)
9. [Hybrid WebView Strategy](#hybrid-webview-strategy)

---

## Page Inventory

### 1. Landing Page (`/`)
**File:** `/Users/I347316/dev/vibing2/app/page.tsx`

**Functionality:**
- Marketing landing page with glassmorphism effects
- Animated gradient backgrounds
- Feature cards grid
- Stats counters
- CTA buttons
- Navigation header
- Footer

**Complexity:** Medium
**Lines of Code:** 215
**Migration Difficulty:** Medium

**Key Features:**
- Server-side auth check and redirect
- Tailwind CSS glassmorphism effects
- CSS animations (pulse, gradient movement)
- Responsive grid layouts
- Link navigation

**Migration Strategy:**
- **SwiftUI** for layout and navigation
- **AppKit NSVisualEffectView** for glassmorphism
- **Core Animation** for gradient animations
- Convert Tailwind gradients to SwiftUI `LinearGradient`

---

### 2. Create Page (`/create`)
**File:** `/Users/I347316/dev/vibing2/app/create/CreatePageContent.tsx`

**Functionality:**
- Main AI project creation interface (MOST COMPLEX PAGE)
- Project type selection screen
- Split-panel layout (30% chat, 70% preview)
- Real-time SSE streaming
- File upload with drag-drop and paste
- Voice recording with Web Speech API
- Live preview with iframe
- Version history system
- Auto-save functionality
- Metrics dashboard (tokens, context, duration)
- Agent selection and auto-selection

**Complexity:** VERY HIGH
**Lines of Code:** 1,253
**Migration Difficulty:** Hard

**Key Features:**
- Complex state management (17 useState hooks)
- SSE streaming with custom parser
- WebContainer/Daytona sandbox integration
- Clipboard paste handling (images, files)
- Voice input (Web Speech API)
- Real-time metrics updates
- Version snapshots with restore
- Auto-save with debouncing
- Dynamic iframe preview
- File upload with base64 encoding

**Migration Strategy:**
- **Phased Approach:** Migrate incrementally
- **State Management:** Convert to SwiftUI @State/@StateObject
- **Networking:** URLSession with AsyncStream for SSE
- **Voice Input:** NSSpeechRecognizer (macOS 13+)
- **Preview:** Keep WKWebView for HTML rendering
- **File Handling:** NSPasteboard for clipboard, NSOpenPanel for files
- **Persistence:** UserDefaults + CoreData for projects

---

### 3. Dashboard Page (`/dashboard`)
**Files:**
- `/Users/I347316/dev/vibing2/app/dashboard/page.tsx` (Server)
- `/Users/I347316/dev/vibing2/app/dashboard/DashboardClient.tsx` (Client)

**Functionality:**
- User dashboard with project grid
- Server-side data fetching
- Stats cards (projects, tokens, plan)
- Project cards with actions (continue, delete)
- Navigation header with settings link

**Complexity:** Medium
**Lines of Code:** 292
**Migration Difficulty:** Medium

**Key Features:**
- Server-side auth and data loading
- Project CRUD operations
- Responsive grid layout
- Glassmorphism UI
- Project type categorization with emojis

**Migration Strategy:**
- **SwiftUI List/Grid** for project display
- **Async/await** for data fetching
- **NSAlert** for delete confirmations
- **NavigationStack** for routing
- Server data: REST API calls with Codable

---

### 4. Sign In Page (`/auth/signin`)
**File:** `/Users/I347316/dev/vibing2/app/auth/signin/page.tsx`

**Functionality:**
- Authentication form
- Credentials login
- Google OAuth integration
- Error handling
- Redirect after successful login

**Complexity:** Low
**Lines of Code:** 189
**Migration Difficulty:** Easy

**Key Features:**
- Form validation
- NextAuth integration
- Social login (Google)
- Loading states
- Error messages

**Migration Strategy:**
- **SwiftUI Form** for input fields
- **ASWebAuthenticationSession** for OAuth
- **Keychain** for credential storage
- **URLSession** for API authentication

---

### 5. Sign Up Page (`/auth/signup`)
**File:** `/Users/I347316/dev/vibing2/app/auth/signup/page.tsx`

**Functionality:**
- User registration form
- Account creation
- Google OAuth signup
- Auto sign-in after registration
- Password validation

**Complexity:** Low
**Lines of Code:** 186
**Migration Difficulty:** Easy

**Key Features:**
- Form with name, email, password
- Password strength validation
- NextAuth integration
- Auto sign-in after success

**Migration Strategy:**
- **SwiftUI Form** with validation
- **ASWebAuthenticationSession** for OAuth
- Same as Sign In migration

---

### 6. Settings Page (`/settings`)
**File:** `/Users/I347316/dev/vibing2/app/settings/page.tsx`

**Functionality:**
- Account information display
- Usage statistics
- Preferences toggles
- Read-only session data

**Complexity:** Low
**Lines of Code:** 152
**Migration Difficulty:** Easy

**Key Features:**
- User profile display
- Toggle switches for preferences
- Token balance display
- Static data presentation

**Migration Strategy:**
- **SwiftUI Form/List** for settings
- **Toggle** for preferences
- **UserDefaults** for persistence
- **@AppStorage** for SwiftUI bindings

---

### 7. Discover Page (`/discover`)
**File:** `/Users/I347316/dev/vibing2/app/discover/page.tsx`

**Functionality:** Not yet implemented (stub page)

**Migration:** TBD

---

### 8. Projects Page (`/projects`)
**File:** `/Users/I347316/dev/vibing2/app/projects/page.tsx`

**Functionality:** Not yet implemented (stub page)

**Migration:** TBD

---

### 9. Auth Callback Page (`/auth/callback`)
**File:** `/Users/I347316/dev/vibing2/app/auth/callback/page.tsx`

**Functionality:** OAuth callback handler

**Migration Strategy:**
- Handle via **ASWebAuthenticationSession** callback URL

---

## Component Inventory

### Overview Table

| Component | Complexity | Lines | Difficulty | Native Equivalent | Hybrid? |
|-----------|-----------|-------|------------|------------------|---------|
| FileTree | Medium | 102 | Medium | NSOutlineView | No |
| CodeViewer | Medium | 79 | Medium | NSTextView + Syntax | Yes |
| PreviewPanel | Low | 73 | Easy | WKWebView | Yes |
| PromptInput | Low | 48 | Easy | NSTextField | No |
| AgentSelector | Medium | 183 | Medium | NSPopover + NSTableView | No |
| ChatMessages | Medium | 141 | Medium | NSScrollView + Views | No |
| FileUpload | Medium | 230 | Medium | NSDraggingDestination | No |
| VoiceRecorder | Medium | 230 | Medium | NSSpeechRecognizer | No |
| MultiFileView | High | 132 | Hard | Split View + WKWebView | Yes |
| FileStructurePanel | Low | - | Easy | NSOutlineView | No |
| MessageDisplay | Low | - | Easy | NSView | No |
| VibingLoader | Low | - | Easy | NSProgressIndicator | No |
| PFCMetrics | Low | - | Easy | Custom NSView | No |
| CodeChanges | Low | - | Easy | NSTableView | No |
| PresenceIndicator | Low | - | Easy | Custom NSView | No |
| InviteModal | Low | - | Easy | NSAlert/Sheet | No |

---

## Migration Difficulty Assessment

### Easy Migrations (8 components)

**Characteristics:**
- Simple layouts
- Minimal interactivity
- Standard UI patterns
- No complex dependencies

**Components:**
1. **PromptInput** - Standard text input field
2. **PreviewPanel** - WebView wrapper
3. **FileStructurePanel** - Simple tree view
4. **MessageDisplay** - Text display
5. **VibingLoader** - Loading spinner
6. **PFCMetrics** - Data display
7. **CodeChanges** - List view
8. **PresenceIndicator** - Status dot

**Migration Time:** 1-2 hours each

---

### Medium Migrations (5 components)

**Characteristics:**
- Moderate complexity
- Some custom logic
- Multiple states
- Standard patterns with customization

**Components:**
1. **FileTree** - Hierarchical tree with expand/collapse
2. **CodeViewer** - Syntax highlighting required
3. **AgentSelector** - Searchable dropdown
4. **ChatMessages** - Message list with formatting
5. **FileUpload** - Drag-drop + file processing

**Migration Time:** 3-6 hours each

---

### Hard Migrations (3 components)

**Characteristics:**
- High complexity
- Multiple sub-systems
- Custom protocols
- Browser-specific APIs

**Components:**
1. **CreatePageContent** - Main app interface, 1250+ lines
2. **MultiFileView** - Multiple viewing modes
3. **VoiceRecorder** - Web Speech API integration

**Migration Time:** 8-16 hours each

---

## Native Technology Stack

### SwiftUI Components

| React Pattern | SwiftUI Equivalent |
|--------------|-------------------|
| `<div>` | `VStack`, `HStack`, `ZStack` |
| `<button>` | `Button` |
| `<input>` | `TextField`, `SecureField` |
| `<textarea>` | `TextEditor` |
| `<select>` | `Picker` |
| `<form>` | `Form` |
| `useState` | `@State` |
| `useEffect` | `onAppear`, `onChange` |
| `useContext` | `@EnvironmentObject` |
| CSS Grid | `LazyVGrid`, `LazyHGrid` |
| CSS Flexbox | `HStack`, `VStack` with `Spacer` |

### AppKit Components (for complex UI)

| React Component | AppKit Equivalent |
|----------------|------------------|
| File tree | `NSOutlineView` |
| Code editor | `NSTextView` + `NSLayoutManager` |
| Split panel | `NSSplitView` |
| Drag-drop | `NSDraggingDestination` |
| Glassmorphism | `NSVisualEffectView` |
| Tooltip | `NSToolTip` |
| Context menu | `NSMenu` |
| Modal | `NSAlert`, `NSSheet` |

### Native APIs

| Web API | macOS Equivalent |
|---------|-----------------|
| Web Speech API | `NSSpeechRecognizer` (macOS 13+) |
| Clipboard API | `NSPasteboard` |
| File API | `NSOpenPanel`, `NSSavePanel` |
| LocalStorage | `UserDefaults` |
| IndexedDB | `CoreData` |
| WebSocket | `URLSessionWebSocketTask` |
| SSE | `URLSession` with `AsyncStream` |
| Fetch API | `URLSession` |

---

## Phased Migration Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish native architecture and migrate simple components

**Tasks:**
1. Set up SwiftUI project structure
2. Create navigation system (TabView/NavigationStack)
3. Migrate authentication pages (Sign In, Sign Up)
4. Migrate Settings page
5. Implement state management (SwiftUI @State + Combine)
6. Set up networking layer (URLSession)

**Components:**
- PromptInput
- VibingLoader
- PFCMetrics
- MessageDisplay
- PresenceIndicator
- InviteModal

**Estimated Time:** 40 hours

---

### Phase 2: Dashboard & Navigation (Week 3)
**Goal:** User-facing pages and project management

**Tasks:**
1. Migrate Dashboard page
2. Implement project grid with cards
3. Create project CRUD operations
4. Build navigation header
5. Add glassmorphism effects

**Components:**
- FileStructurePanel
- CodeChanges

**Estimated Time:** 30 hours

---

### Phase 3: Complex Components (Week 4-5)
**Goal:** File management and code viewing

**Tasks:**
1. Migrate FileTree component
2. Implement CodeViewer with syntax highlighting
3. Build AgentSelector with search
4. Create FileUpload with drag-drop
5. Implement ChatMessages list

**Components:**
- FileTree
- CodeViewer
- AgentSelector
- FileUpload
- ChatMessages

**Estimated Time:** 60 hours

---

### Phase 4: Create Page - Part 1 (Week 6-7)
**Goal:** Basic create page without streaming

**Tasks:**
1. Set up create page layout (split view)
2. Implement project type selection
3. Build chat interface
4. Create preview panel (WKWebView)
5. Add metrics dashboard

**Estimated Time:** 50 hours

---

### Phase 5: Create Page - Part 2 (Week 8-9)
**Goal:** Advanced features and streaming

**Tasks:**
1. Implement SSE streaming
2. Add voice recording (NSSpeechRecognizer)
3. Build version history system
4. Implement auto-save
5. Add file paste handling
6. Integrate MultiFileView

**Components:**
- VoiceRecorder
- MultiFileView
- Full CreatePageContent

**Estimated Time:** 70 hours

---

### Phase 6: Polish & Optimization (Week 10)
**Goal:** Performance, UX, and bug fixes

**Tasks:**
1. Optimize rendering performance
2. Add animations and transitions
3. Implement keyboard shortcuts
4. Add accessibility features
5. Bug fixes and edge cases
6. User testing and feedback

**Estimated Time:** 40 hours

---

## Component-Specific Migration Guides

### 1. PromptInput Component

**React Implementation:**
```typescript
// Simple text input with submit button
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}
```

**SwiftUI Migration:**
```swift
struct PromptInput: View {
    @Binding var text: String
    let onSubmit: () -> Void
    let isLoading: Bool
    let placeholder: String

    var body: some View {
        HStack(spacing: 12) {
            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
                .disabled(isLoading)
                .onSubmit(onSubmit)

            Button(action: onSubmit) {
                Image(systemName: isLoading ? "hourglass" : "arrow.up.circle.fill")
                    .font(.title2)
            }
            .disabled(isLoading || text.isEmpty)
        }
        .padding()
    }
}
```

**Migration Notes:**
- Use `@Binding` for two-way data flow
- `TextField` with `.onSubmit` handles Enter key
- System symbols replace emojis
- Built-in disabled state styling

**Difficulty:** Easy
**Time:** 1 hour

---

### 2. FileTree Component

**React Implementation:**
```typescript
// Recursive tree with expand/collapse
interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path?: string;
  children?: FileTreeNode[];
}
```

**SwiftUI Migration:**
```swift
struct FileTreeView: View {
    let nodes: [FileNode]
    @Binding var selectedPath: String?

    var body: some View {
        List(nodes, children: \.children) { node in
            FileNodeRow(node: node, selectedPath: $selectedPath)
        }
        .listStyle(.sidebar)
    }
}

struct FileNodeRow: View {
    let node: FileNode
    @Binding var selectedPath: String?

    var body: some View {
        HStack {
            Image(systemName: node.isFolder ? "folder" : "doc")
            Text(node.name)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if !node.isFolder {
                selectedPath = node.path
            }
        }
    }
}
```

**AppKit Alternative (More Control):**
```swift
class FileTreeViewController: NSViewController {
    let outlineView = NSOutlineView()

    func outlineView(_ outlineView: NSOutlineView,
                     numberOfChildrenOfItem item: Any?) -> Int {
        // Implement NSOutlineViewDataSource
    }
}
```

**Migration Notes:**
- SwiftUI `List(children:)` automatically handles hierarchical data
- `NSOutlineView` offers more customization (drag-drop, inline editing)
- Consider AppKit for advanced features

**Difficulty:** Medium
**Time:** 4 hours

---

### 3. CodeViewer Component

**React Implementation:**
```typescript
// Code display with syntax highlighting
interface CodeViewerProps {
  path: string;
  content: string;
  language: string;
}
// Uses line numbers, copy button, plain text rendering
```

**SwiftUI + Syntax Highlighting:**
```swift
import SwiftUI
import Highlightr // Third-party library

struct CodeViewer: View {
    let path: String
    let content: String
    let language: String

    @State private var copied = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(path)
                    .font(.headline)
                Text(language.uppercased())
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(4)
                Spacer()
                Button(action: copyCode) {
                    Label(copied ? "Copied!" : "Copy",
                          systemImage: copied ? "checkmark" : "doc.on.doc")
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            // Code content with highlighting
            SyntaxHighlightedText(content, language: language)
        }
    }

    func copyCode() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
    }
}

struct SyntaxHighlightedText: NSViewRepresentable {
    let content: String
    let language: String

    func makeNSView(context: Context) -> NSScrollView {
        let highlightr = Highlightr()!
        highlightr.setTheme(to: "atom-one-dark")

        let textView = NSTextView()
        textView.isEditable = false
        textView.backgroundColor = .clear
        textView.attributedString = highlightr.highlight(content, as: language)

        let scrollView = NSScrollView()
        scrollView.documentView = textView
        return scrollView
    }

    func updateNSView(_ nsView: NSScrollView, context: Context) {}
}
```

**Third-Party Libraries:**
- **Highlightr** - Syntax highlighting (port of highlight.js)
- **Splash** - SwiftUI-native syntax highlighting

**Migration Notes:**
- SwiftUI `Text` doesn't support rich text well
- Use `NSViewRepresentable` to wrap `NSTextView`
- `Highlightr` provides 180+ languages
- Consider WKWebView for perfect parity with web

**Difficulty:** Medium
**Time:** 5 hours

**Recommendation:** Use WKWebView with Prism.js for 100% fidelity

---

### 4. PreviewPanel Component

**React Implementation:**
```typescript
// iframe with live HTML preview
<iframe srcDoc={previewCode} sandbox="allow-scripts" />
```

**SwiftUI + WKWebView:**
```swift
import SwiftUI
import WebKit

struct PreviewPanel: View {
    let htmlContent: String
    let previewURL: String?
    @State private var refreshKey = UUID()

    var body: some View {
        VStack(spacing: 0) {
            // Header with refresh button
            HStack {
                Text("Live Preview")
                    .font(.headline)
                Spacer()
                if !htmlContent.isEmpty {
                    Button(action: refresh) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            // WebView
            if let url = previewURL {
                WebView(url: url)
                    .id(refreshKey)
            } else if !htmlContent.isEmpty {
                WebView(html: htmlContent)
                    .id(refreshKey)
            } else {
                emptyState
            }
        }
    }

    var emptyState: some View {
        VStack {
            Image(systemName: "eye")
                .font(.system(size: 60))
                .opacity(0.2)
            Text("Preview will appear here")
                .font(.title3)
            Text("Start by describing your project")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    func refresh() {
        refreshKey = UUID()
    }
}

struct WebView: NSViewRepresentable {
    let html: String?
    let url: String?

    init(html: String) {
        self.html = html
        self.url = nil
    }

    init(url: String) {
        self.html = nil
        self.url = url
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsMagnification = false

        if let html = html {
            webView.loadHTMLString(html, baseURL: nil)
        } else if let urlString = url, let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        // Update if needed
    }
}
```

**Migration Notes:**
- WKWebView is the perfect match for iframe
- Use `.id()` modifier to force refresh
- `loadHTMLString` equivalent to `srcDoc`
- WKWebView handles sandboxing automatically

**Difficulty:** Easy
**Time:** 2 hours

**Recommendation:** Keep as WebView - native is unnecessary complexity

---

### 5. VoiceRecorder Component

**React Implementation:**
```typescript
// Web Speech API for voice input
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = (event) => {
  // Handle transcription
};
```

**SwiftUI + Speech Framework:**
```swift
import SwiftUI
import Speech

class SpeechRecognizer: ObservableObject {
    @Published var transcript = ""
    @Published var isRecording = false

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))!
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    func requestPermission(completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                completion(status == .authorized)
            }
        }
    }

    func startRecording() throws {
        // Cancel previous task
        recognitionTask?.cancel()
        recognitionTask = nil

        // Audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        recognitionRequest.shouldReportPartialResults = true

        // Audio input
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        // Recognition task
        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                self.transcript = result.bestTranscription.formattedString
            }

            if error != nil || result?.isFinal == true {
                self.stopRecording()
            }
        }

        isRecording = true
    }

    func stopRecording() {
        audioEngine.stop()
        recognitionRequest?.endAudio()
        audioEngine.inputNode.removeTap(onBus: 0)

        recognitionRequest = nil
        recognitionTask = nil
        isRecording = false
    }
}

struct VoiceRecorderButton: View {
    @StateObject private var recognizer = SpeechRecognizer()
    let onTranscription: (String) -> Void

    var body: some View {
        Button(action: toggleRecording) {
            Image(systemName: recognizer.isRecording ? "mic.fill" : "mic")
                .foregroundColor(recognizer.isRecording ? .red : .primary)
        }
        .overlay(
            recognizer.isRecording ?
                Circle()
                    .stroke(Color.red, lineWidth: 2)
                    .scaleEffect(1.2)
                    .opacity(0)
                    .animation(.easeOut(duration: 1).repeatForever(autoreverses: false), value: recognizer.isRecording)
                : nil
        )
        .onChange(of: recognizer.transcript) { newValue in
            if !newValue.isEmpty && !recognizer.isRecording {
                onTranscription(newValue)
                recognizer.transcript = ""
            }
        }
    }

    func toggleRecording() {
        if recognizer.isRecording {
            recognizer.stopRecording()
        } else {
            recognizer.requestPermission { granted in
                if granted {
                    try? recognizer.startRecording()
                }
            }
        }
    }
}
```

**Migration Notes:**
- `Speech` framework requires microphone permission
- Must add `NSSpeechRecognitionUsageDescription` to Info.plist
- `SFSpeechRecognizer` provides interim results like Web Speech API
- Audio engine setup is more complex than web
- Works offline with downloaded models

**Difficulty:** Medium-Hard
**Time:** 6 hours

**macOS Support:**
- macOS 10.15+ for Speech framework
- macOS 13+ for improved accuracy

---

### 6. FileUpload Component

**React Implementation:**
```typescript
// Drag-drop file upload with preview
- Drag & drop area
- File type validation
- Size limits
- Base64 encoding
- Image previews
```

**SwiftUI + AppKit:**
```swift
struct FileUploadView: View {
    @Binding var files: [UploadedFile]
    let maxFiles: Int = 5
    let maxSizeMB: Int = 10

    @State private var isDragging = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 16) {
            // Drop zone
            DropZone(isDragging: $isDragging, onDrop: handleDrop)

            // Error message
            if let error = error {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            // File list
            if !files.isEmpty {
                FileList(files: $files)
            }
        }
        .padding()
    }

    func handleDrop(providers: [NSItemProvider]) {
        for provider in providers {
            if provider.canLoadObject(ofClass: URL.self) {
                _ = provider.loadObject(ofClass: URL.self) { url, error in
                    guard let url = url else { return }
                    processFile(at: url)
                }
            }
        }
    }

    func processFile(at url: URL) {
        // Validate file size
        guard let fileSize = try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int else {
            error = "Could not read file"
            return
        }

        let maxBytes = maxSizeMB * 1024 * 1024
        guard fileSize < maxBytes else {
            error = "File exceeds \(maxSizeMB)MB limit"
            return
        }

        // Check max files
        guard files.count < maxFiles else {
            error = "Maximum \(maxFiles) files allowed"
            return
        }

        // Read file content
        guard let data = try? Data(contentsOf: url) else {
            error = "Failed to read file"
            return
        }

        let file = UploadedFile(
            id: UUID().uuidString,
            name: url.lastPathComponent,
            type: url.pathExtension,
            size: fileSize,
            data: data.base64EncodedString()
        )

        DispatchQueue.main.async {
            files.append(file)
            error = nil
        }
    }
}

struct DropZone: View {
    @Binding var isDragging: Bool
    let onDrop: ([NSItemProvider]) -> Void

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(
                    style: StrokeStyle(lineWidth: 2, dash: [8])
                )
                .foregroundColor(isDragging ? .blue : .gray)

            VStack(spacing: 12) {
                Image(systemName: "arrow.up.doc")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)

                Text("Drop files here or click to browse")
                    .font(.headline)

                Text("Images, text files, JSON, PDF (max 10MB)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .frame(height: 150)
        .onDrop(of: [.fileURL], isTargeted: $isDragging) { providers in
            onDrop(providers)
            return true
        }
        .onTapGesture {
            openFilePicker()
        }
    }

    func openFilePicker() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.image, .text, .json, .pdf]

        if panel.runModal() == .OK {
            let providers = panel.urls.map { NSItemProvider(contentsOf: $0)! }
            onDrop(providers)
        }
    }
}
```

**Migration Notes:**
- SwiftUI `.onDrop` handles drag-drop
- `NSOpenPanel` for file picker
- `Data.base64EncodedString()` for encoding
- `NSImage` for image previews
- Validate file types with `UTType`

**Difficulty:** Medium
**Time:** 5 hours

---

### 7. ChatMessages Component

**React Implementation:**
```typescript
// Message list with role-based styling
- User messages (right-aligned, gradient)
- Assistant messages (left-aligned, formatted)
- Loading state with spinner
- Tool actions display
- Code changes summary
- Performance metrics
```

**SwiftUI Migration:**
```swift
struct ChatMessagesView: View {
    let messages: [Message]
    let isLoading: Bool
    let progressStatus: String

    var body: some View {
        ScrollView {
            ScrollViewReader { proxy in
                LazyVStack(spacing: 16) {
                    ForEach(messages) { message in
                        MessageBubble(message: message)
                            .id(message.id)
                    }

                    if isLoading {
                        LoadingIndicator(status: progressStatus)
                    }
                }
                .padding()
                .onChange(of: messages.count) { _ in
                    // Auto-scroll to bottom
                    if let lastMessage = messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.role == .user {
                Spacer()
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
                Text(message.role == .user ? "You" : "AI Assistant")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(message.content)
                    .padding()
                    .background(
                        message.role == .user ?
                            LinearGradient(colors: [.purple, .pink], startPoint: .leading, endPoint: .trailing)
                            : Color.gray.opacity(0.2)
                    )
                    .foregroundColor(message.role == .user ? .white : .primary)
                    .cornerRadius(12)
            }
            .frame(maxWidth: 500, alignment: message.role == .user ? .trailing : .leading)

            if message.role == .assistant {
                Spacer()
            }
        }
    }
}
```

**Migration Notes:**
- `LazyVStack` for performance with many messages
- `ScrollViewReader` for auto-scroll
- `LinearGradient` for user message styling
- Consider `NSTextView` for rich text in assistant messages

**Difficulty:** Medium
**Time:** 4 hours

---

### 8. AgentSelector Component

**React Implementation:**
```typescript
// Searchable dropdown for agent selection
- Search input
- Filtered results
- Agent metadata (model, type, description)
- Keyboard navigation
```

**SwiftUI Migration:**
```swift
struct AgentSelector: View {
    @State private var searchText = ""
    @State private var agents: [Agent] = []
    @State private var showResults = false
    @Binding var selectedAgent: String?

    var filteredAgents: [Agent] {
        if searchText.isEmpty {
            return []
        }
        return agents.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.description.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Search field
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                TextField("Search specialized agents...", text: $searchText)
                    .textFieldStyle(.plain)
                    .onSubmit {
                        showResults = true
                    }

                if let selected = selectedAgent {
                    Text(selected)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.2))
                        .cornerRadius(8)

                    Button(action: { selectedAgent = nil }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)

            // Results dropdown
            if showResults && !filteredAgents.isEmpty {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(filteredAgents) { agent in
                            AgentRow(agent: agent)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedAgent = agent.name
                                    searchText = ""
                                    showResults = false
                                }
                        }
                    }
                }
                .frame(maxHeight: 300)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(8)
                .shadow(radius: 8)
            }
        }
        .onAppear {
            loadAgents()
        }
    }

    func loadAgents() {
        // Fetch from API
    }
}

struct AgentRow: View {
    let agent: Agent

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: agent.icon)
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(agent.name)
                        .font(.headline)

                    Text(agent.model.uppercased())
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(modelColor(agent.model))
                        .cornerRadius(4)
                }

                Text(agent.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding()
        .background(Color.clear)
        .hoverEffect()
    }

    func modelColor(_ model: String) -> Color {
        switch model {
        case "opus": return Color.purple.opacity(0.2)
        case "sonnet": return Color.blue.opacity(0.2)
        case "haiku": return Color.green.opacity(0.2)
        default: return Color.gray.opacity(0.2)
        }
    }
}
```

**AppKit Alternative (NSPopover):**
```swift
class AgentSelectorViewController: NSViewController {
    let searchField = NSSearchField()
    let tableView = NSTableView()

    // Implement with NSPopover for native feel
}
```

**Migration Notes:**
- SwiftUI search is straightforward
- `NSPopover` provides better native integration
- Use `NSMenu` for simpler dropdown

**Difficulty:** Medium
**Time:** 5 hours

---

### 9. MultiFileView Component (COMPLEX)

**React Implementation:**
```typescript
// Multi-mode file viewer
- File tree sidebar
- Code viewer with syntax highlighting
- Preview mode (iframe)
- Mode toggle (code/preview)
- Generates HTML from multiple files
```

**SwiftUI + AppKit Hybrid:**
```swift
struct MultiFileView: View {
    let files: [ProjectFile]
    @State private var viewMode: ViewMode = .preview
    @State private var selectedFile: ProjectFile?
    @State private var previewHTML: String = ""

    enum ViewMode {
        case preview, code
    }

    var body: some View {
        VStack(spacing: 0) {
            // Mode toggle
            Picker("View Mode", selection: $viewMode) {
                Label("Preview", systemImage: "eye").tag(ViewMode.preview)
                Label("Code", systemImage: "chevron.left.forwardslash.chevron.right").tag(ViewMode.code)
            }
            .pickerStyle(.segmented)
            .padding()

            // Content
            HSplitView {
                if viewMode == .code {
                    // File tree
                    FileTreeView(
                        files: files,
                        selectedFile: $selectedFile
                    )
                    .frame(minWidth: 200, idealWidth: 250)

                    // Code viewer
                    if let file = selectedFile {
                        CodeViewer(file: file)
                    } else {
                        Text("Select a file")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if viewMode == .preview {
                WebView(html: previewHTML)
            }
        }
        .onAppear {
            generatePreview()
        }
        .onChange(of: files) { _ in
            generatePreview()
        }
    }

    func generatePreview() {
        // Combine files into single HTML
        previewHTML = FileManager.generatePreviewHTML(from: files)
    }
}
```

**Migration Notes:**
- Use `HSplitView` for resizable panels
- Keep WKWebView for preview
- `NSTextView` with `NSLayoutManager` for code
- Consider `NSSplitViewController` for better control

**Difficulty:** Hard
**Time:** 10 hours

---

## State Management Migration

### React State Patterns → SwiftUI Equivalents

#### 1. useState → @State
```typescript
// React
const [count, setCount] = useState(0);

// SwiftUI
@State private var count = 0
```

#### 2. useEffect → .onAppear/.onChange
```typescript
// React
useEffect(() => {
  fetchData();
}, [dependency]);

// SwiftUI
.onAppear { fetchData() }
.onChange(of: dependency) { _ in fetchData() }
```

#### 3. useContext → @EnvironmentObject
```typescript
// React
const user = useContext(UserContext);

// SwiftUI
@EnvironmentObject var user: UserModel
```

#### 4. Zustand Store → ObservableObject
```typescript
// React (Zustand)
const useProjectStore = create((set) => ({
  messages: [],
  addMessage: (msg) => set(state => ({
    messages: [...state.messages, msg]
  }))
}));

// SwiftUI
class ProjectStore: ObservableObject {
    @Published var messages: [Message] = []

    func addMessage(_ message: Message) {
        messages.append(message)
    }
}
```

#### 5. useRef → @State (different behavior)
```typescript
// React - ref doesn't trigger re-render
const counterRef = useRef(0);

// SwiftUI - closest equivalent
@State private var counter = 0
// Or for non-UI state:
private var counter = 0 // immutable across renders
```

### CreatePageContent State Migration

**React (17 useState hooks):**
```typescript
const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
const [projectType, setProjectType] = useState<ProjectType | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [inputValue, setInputValue] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [previewCode, setPreviewCode] = useState('');
// ... 11 more
```

**SwiftUI (Refactored to ObservableObject):**
```swift
class CreatePageViewModel: ObservableObject {
    @Published var projectId: String?
    @Published var projectType: ProjectType?
    @Published var messages: [Message] = []
    @Published var inputValue = ""
    @Published var isLoading = false
    @Published var previewCode = ""
    @Published var previewURL: String?
    @Published var sandboxId: String?
    @Published var projectFiles: [ProjectFile] = []
    @Published var activeAgents: [String] = []
    @Published var error: String?
    @Published var progress = ""
    @Published var metrics: Metrics?
    @Published var lastPromptMetrics: Metrics?
    @Published var versionHistory: [VersionSnapshot] = []
    @Published var uploadedFiles: [UploadedFile] = []

    // Actions
    func selectProjectType(_ type: ProjectType) {
        projectType = type
        activeAgents = type.baseAgents
    }

    func submitPrompt() async {
        guard !inputValue.isEmpty, !isLoading else { return }

        isLoading = true
        progress = "Analyzing prompt..."

        do {
            let response = try await APIClient.streamGeneration(
                messages: messages,
                projectType: projectType,
                agents: activeAgents
            )

            // Handle SSE stream
            for await event in response {
                await handleStreamEvent(event)
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func handleStreamEvent(_ event: StreamEvent) {
        switch event {
        case .progress(let message):
            progress = message
        case .message(let content):
            // Update preview
            previewCode = content
        case .metrics(let m):
            metrics = m
        case .complete:
            saveProject()
        }
    }

    func saveProject() {
        // Auto-save logic
    }
}
```

**Benefits of ObservableObject:**
- Centralized state
- Type-safe
- Automatic UI updates
- Testable
- Clear separation of concerns

---

## Third-Party Dependencies

### React Dependencies → macOS Equivalents

| React Library | Purpose | macOS Alternative |
|--------------|---------|------------------|
| **Next.js** | Framework | SwiftUI App |
| **React** | UI Library | SwiftUI |
| **NextAuth** | Authentication | ASWebAuthenticationSession + Keychain |
| **Tailwind CSS** | Styling | SwiftUI Modifiers |
| **Lucide React** | Icons | SF Symbols |
| **Anthropic SDK** | AI API | URLSession + AsyncStream |
| **Socket.io** | WebSocket | URLSessionWebSocketTask |
| **Zustand** | State Management | ObservableObject + Combine |
| **Prism.js** | Syntax Highlighting | Highlightr / Splash |
| **Web Speech API** | Voice Input | Speech framework |

### Required Swift Packages

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/raspu/Highlightr", from: "2.1.0"), // Syntax highlighting
    .package(url: "https://github.com/JohnSundell/Splash", from: "0.16.0"), // Alternative highlighting
    .package(url: "https://github.com/Alamofire/Alamofire", from: "5.8.0"), // Networking (optional)
    .package(url: "https://github.com/groue/GRDB.swift", from: "6.24.0"), // Database (alternative to CoreData)
]
```

### Recommended Libraries

1. **Highlightr** - Syntax highlighting (essential for CodeViewer)
2. **Splash** - SwiftUI-native highlighting
3. **GRDB** - Better database than CoreData for complex queries
4. **KeychainAccess** - Simplified Keychain API
5. **Alamofire** - Advanced networking (optional, URLSession is sufficient)

---

## Hybrid WebView Strategy

Some components are better kept as WebViews for development speed and fidelity.

### Components to Keep as WebView

#### 1. **CodeViewer** (Recommended)
**Reason:** Perfect syntax highlighting fidelity

```swift
struct CodeViewerWebView: View {
    let code: String
    let language: String

    var html: String {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.css">
            <style>
                body { margin: 0; padding: 16px; background: #2d2d2d; }
                code { font-size: 14px; }
            </style>
        </head>
        <body>
            <pre><code class="language-\(language)">\(code.htmlEscaped)</code></pre>
            <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-\(language).min.js"></script>
        </body>
        </html>
        """
    }

    var body: some View {
        WebView(html: html)
    }
}
```

**Benefits:**
- 180+ languages supported
- Themes match web exactly
- Auto-updates with CDN
- No native library needed

#### 2. **PreviewPanel** (Required)
**Reason:** Must render HTML/CSS/JS exactly as in browser

Already using WKWebView - keep as-is.

#### 3. **MultiFileView Preview Mode** (Required)
**Reason:** Same as PreviewPanel

Keep WKWebView for preview mode.

### Components to Build Natively

All others should be native SwiftUI for:
- Better performance
- Native look and feel
- System integration (menus, shortcuts)
- Offline capability
- Type safety

---

## Architecture Recommendations

### 1. MVVM Architecture

```
Views/
  ├── Landing/
  │   └── LandingView.swift
  ├── Auth/
  │   ├── SignInView.swift
  │   └── SignUpView.swift
  ├── Dashboard/
  │   ├── DashboardView.swift
  │   └── ProjectCard.swift
  └── Create/
      ├── CreateView.swift
      ├── ChatPanel.swift
      ├── PreviewPanel.swift
      └── Components/
          ├── FileTree.swift
          ├── CodeViewer.swift
          └── VoiceRecorder.swift

ViewModels/
  ├── LandingViewModel.swift
  ├── AuthViewModel.swift
  ├── DashboardViewModel.swift
  └── CreateViewModel.swift

Models/
  ├── User.swift
  ├── Project.swift
  ├── Message.swift
  └── Agent.swift

Services/
  ├── APIClient.swift
  ├── AuthService.swift
  ├── ProjectService.swift
  └── StreamService.swift

Utilities/
  ├── Extensions.swift
  ├── Constants.swift
  └── Helpers.swift
```

### 2. Networking Layer

```swift
class APIClient {
    static let shared = APIClient()
    private let baseURL = "https://api.vibing2.com"

    func request<T: Codable>(_ endpoint: Endpoint) async throws -> T {
        let request = try endpoint.urlRequest(baseURL: baseURL)
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw APIError.invalidResponse
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    func streamSSE(_ endpoint: Endpoint) -> AsyncThrowingStream<SSEEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                let request = try endpoint.urlRequest(baseURL: baseURL)
                let (bytes, response) = try await URLSession.shared.bytes(for: request)

                for try await line in bytes.lines {
                    if line.hasPrefix("data: ") {
                        let data = String(line.dropFirst(6))
                        if let event = SSEEvent.parse(data) {
                            continuation.yield(event)
                        }
                    }
                }

                continuation.finish()
            }

            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }
}
```

### 3. Persistence Layer

```swift
class ProjectRepository {
    static let shared = ProjectRepository()
    private let container: NSPersistentContainer

    func fetchProjects() async throws -> [Project] {
        try await container.viewContext.perform {
            let request = ProjectEntity.fetchRequest()
            let entities = try request.execute()
            return entities.map { Project(entity: $0) }
        }
    }

    func saveProject(_ project: Project) async throws {
        try await container.viewContext.perform {
            let entity = ProjectEntity(context: container.viewContext)
            entity.id = project.id
            entity.name = project.name
            entity.messages = try JSONEncoder().encode(project.messages)

            try container.viewContext.save()
        }
    }
}
```

---

## Development Timeline

### Summary

| Phase | Duration | Components | Features |
|-------|----------|-----------|----------|
| Phase 1 | 2 weeks | 6 simple components | Auth, Settings, Foundation |
| Phase 2 | 1 week | 2 components | Dashboard, Navigation |
| Phase 3 | 2 weeks | 5 complex components | File management, Code viewing |
| Phase 4 | 2 weeks | Create page basics | Layout, Chat, Preview |
| Phase 5 | 2 weeks | Advanced features | Streaming, Voice, History |
| Phase 6 | 1 week | Polish | Performance, UX, Bugs |
| **Total** | **10 weeks** | **16 components + 9 pages** | **Full app** |

### Milestones

- **Week 2:** Authentication working
- **Week 4:** Dashboard complete
- **Week 6:** Complex components done
- **Week 8:** Basic create page functional
- **Week 10:** Full feature parity with web

---

## Testing Strategy

### Unit Tests
- ViewModel logic
- Data transformations
- API client
- Validation

### Integration Tests
- Navigation flows
- Data persistence
- API integration
- WebView communication

### UI Tests
- User workflows
- Keyboard navigation
- Accessibility
- Performance

### Manual Testing
- Voice recording
- File upload
- Streaming
- Preview rendering

---

## Risk Assessment

### High Risk
1. **SSE Streaming** - Complex to implement correctly
2. **Voice Input** - Requires permissions, may have quality issues
3. **Preview Rendering** - HTML/CSS compatibility
4. **State Synchronization** - Complex state in CreatePage

### Medium Risk
1. **Syntax Highlighting** - May not match web exactly
2. **File Upload** - Drag-drop edge cases
3. **Authentication** - OAuth flows

### Low Risk
1. **Simple Components** - Straightforward migrations
2. **Navigation** - SwiftUI NavigationStack is robust
3. **Styling** - SF Symbols + SwiftUI modifiers

### Mitigation Strategies
- Prototype high-risk features early
- Keep WebView fallbacks for complex rendering
- Comprehensive error handling
- User feedback loops

---

## Success Metrics

1. **Feature Parity:** 100% of web features work natively
2. **Performance:** Faster than web (target: 2x)
3. **Native Feel:** Uses system UI conventions
4. **Code Quality:** >80% test coverage
5. **User Satisfaction:** Positive feedback on native experience

---

## Conclusion

Migrating Vibing2 from React to native macOS UI is a **10-week project** requiring careful planning and execution. The phased approach ensures:

1. **Early wins** with simple components (auth, settings)
2. **Incremental progress** building complex features
3. **Hybrid strategy** keeping WebView where beneficial
4. **Full feature parity** by week 10

**Key Success Factors:**
- Use SwiftUI for most UI (modern, declarative)
- Use AppKit for advanced controls (NSOutlineView, NSSplitView)
- Keep WKWebView for HTML rendering (preview, code highlighting)
- Centralize state with ObservableObject
- Implement robust networking with AsyncStream
- Test continuously

**Next Steps:**
1. Review and approve this plan
2. Set up Xcode project structure
3. Begin Phase 1: Foundation
4. Iterate and adjust timeline as needed

This migration will result in a **faster, more native, and more maintainable** macOS application while preserving all functionality from the web version.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Author:** Claude (Sonnet 4.5)
**Status:** Ready for Implementation
