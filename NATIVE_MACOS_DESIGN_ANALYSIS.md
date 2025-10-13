# Native macOS Design System Analysis
**Vibing2 to AppKit/SwiftUI Migration Guide**

---

## Executive Summary

This document provides a comprehensive analysis of the Vibing2 web application design system for migration to native macOS. The application uses a modern glassmorphism design language with gradient accents, dark theme optimizations, and real-time collaboration features.

**Key Findings:**
- 17 core UI components identified
- Design system based on Tailwind CSS v4 with custom gradients and backdrop blur effects
- Dark-first color scheme with purple/pink/cyan gradient branding
- Responsive layout with 30/70 split-pane architecture
- Heavy use of glassmorphism requiring native macOS vibrancy effects

---

## Table of Contents

1. [Component Inventory](#component-inventory)
2. [Design Tokens](#design-tokens)
3. [Layout Patterns](#layout-patterns)
4. [Interaction Patterns](#interaction-patterns)
5. [Accessibility Features](#accessibility-features)
6. [Native macOS Translation](#native-macos-translation)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Component Inventory

### 1. Input Components

#### **Text Input (PromptInput)**
- **Current Implementation**: Tailwind-styled text input with glassmorphism
- **Visual Properties**:
  - Background: `bg-white/10` with `backdrop-blur-lg`
  - Border: `border-white/20` with `focus:ring-2 focus:ring-purple-500`
  - Text: White with `placeholder-white/40`
  - Padding: `px-4 py-3`
  - Border radius: `rounded-xl` (12px)
- **States**: Default, Focus, Disabled
- **macOS Equivalent**: `NSTextField` with custom styling
- **Implementation Notes**:
  - Use `NSVisualEffectView` with `.behindWindow` material for glassmorphism
  - Custom focus ring with purple tint
  - Font: System font (SF Pro)

#### **Voice Recorder Button**
- **Current Implementation**: Animated microphone button with pulse effect
- **Visual Properties**:
  - Idle: `bg-white/10` with microphone icon
  - Recording: `bg-red-500/20` with pulsing animation
  - Size: `p-3` (48x48px)
  - Border radius: `rounded-xl`
  - Animation: `animate-pulse` with red indicator dot
- **Features**:
  - Web Speech API integration (continuous listening)
  - Interim transcript display tooltip
  - Recording status overlay
- **macOS Equivalent**: Custom `NSButton` with `NSSpeechRecognizer`
- **Implementation Notes**:
  - Use native `NSSpeechRecognizer` for speech-to-text
  - `CABasicAnimation` for pulse effect
  - Custom tooltip with `NSPopover`

#### **File Upload Component**
- **Current Implementation**: Drag-and-drop zone with file preview
- **Visual Properties**:
  - Upload area: Dashed border `border-dashed border-gray-600`
  - Drag state: `border-purple-500 bg-purple-500/10`
  - File preview: Card layout with thumbnails
  - Supported types: Images, text, JSON, PDF (max 10MB)
- **Features**:
  - Drag & drop support
  - Multiple file selection
  - Image preview thumbnails
  - Base64 encoding for images
- **macOS Equivalent**: `NSView` with drag-and-drop delegate
- **Implementation Notes**:
  - Implement `NSDraggingDestination` protocol
  - Use `NSImage` for thumbnails
  - `QLThumbnailGenerator` for file previews

### 2. Button Components

#### **Primary Action Button**
- **Visual Properties**:
  - Background: `bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500`
  - Text: White, semibold
  - Padding: `px-6 py-3` (standard) or `px-8 py-4` (hero)
  - Border radius: `rounded-xl`
  - Shadow: `shadow-lg shadow-purple-500/50`
  - Hover: `hover:scale-105` with increased shadow
- **States**: Default, Hover, Active, Disabled
- **macOS Equivalent**: Custom `NSButton` with `CAGradientLayer`
- **Implementation Notes**:
  - Use `CAGradientLayer` for gradient background
  - `NSTrackingArea` for hover effects
  - Core Animation for scale transform

#### **Secondary Button**
- **Visual Properties**:
  - Background: `bg-white/10` with `backdrop-blur-lg`
  - Border: `border-white/20`
  - Text: `text-gray-300` → `hover:text-white`
  - Hover: `bg-white/20`
- **macOS Equivalent**: `NSButton` with vibrancy effect
- **Implementation Notes**:
  - `NSVisualEffectView` parent container
  - `.underWindowBackground` material

#### **Icon Button**
- **Visual Properties**:
  - Size: `w-10 h-10` or `p-3`
  - Background: `bg-white/10`
  - Border radius: `rounded-xl` or `rounded-full`
  - Icon size: 20x20px (w-5 h-5)
- **States**: Default, Hover, Active, Selected
- **macOS Equivalent**: `NSButton` with image template
- **Implementation Notes**:
  - Use SF Symbols for icons
  - Template rendering for color tinting

### 3. Navigation Components

#### **Header/Navigation Bar**
- **Visual Properties**:
  - Background: `backdrop-blur-xl bg-white/5`
  - Border: `border-b border-white/10`
  - Height: `py-4` (~56px)
  - Sticky: `sticky top-0`
- **Contents**:
  - Logo (40x40px gradient box with "V" or "Q")
  - App name with gradient text
  - User info
  - Action buttons (Settings, Sign Out)
- **macOS Equivalent**: Custom title bar or `NSToolbar`
- **Implementation Notes**:
  - Use `NSWindow.titlebarAppearsTransparent = true`
  - Custom title bar view with `NSVisualEffectView`
  - Integrate with native window controls

#### **Dashboard Sidebar** (Implied)
- **Visual Properties**:
  - Width: 240px to 280px
  - Background: `bg-white/5`
  - Border: `border-r border-white/10`
- **macOS Equivalent**: `NSSplitView` with sidebar
- **Implementation Notes**:
  - Use `NSSplitViewController`
  - `.sidebar` supplementary interface style

### 4. Display Components

#### **Project Card**
- **Visual Properties**:
  - Background: `bg-white/5` with `backdrop-blur-lg`
  - Border: `border-white/10`
  - Border radius: `rounded-2xl`
  - Padding: `p-6`
  - Hover: `bg-white/10 scale-105` with gradient glow
  - Gradient overlay: `from-{color}-500/20 to-{color}-500/20 blur-xl`
- **Contents**:
  - Project type emoji (48px)
  - Project name (truncated)
  - Visibility badge
  - Description (2-line clamp)
  - Metadata (message count, date)
  - Action buttons
- **macOS Equivalent**: Custom `NSView` with layer backing
- **Implementation Notes**:
  - Layer-backed view with Core Animation
  - `NSClickGestureRecognizer` for hover effects
  - `NSTextField` with line truncation

#### **Stats Card**
- **Visual Properties**:
  - Background: `bg-white/5` with `backdrop-blur-xl`
  - Border: `border-white/10`
  - Border radius: `rounded-2xl`
  - Padding: `p-6`
  - Hover glow effect with project-specific gradient
- **Contents**:
  - Label (small gray text)
  - Value (large gradient text)
  - Subtext (extra small gray text)
- **Layout**: 3-column grid on desktop
- **macOS Equivalent**: Custom `NSView` with stack layout
- **Implementation Notes**:
  - `NSStackView` for layout
  - Gradient text via `NSAttributedString` or layer mask

#### **Message Display**
- **Visual Properties**:
  - User messages: `bg-gradient-to-r from-purple-500/20 to-pink-500/20`
  - Assistant messages: `bg-white/5`
  - Border radius: `rounded-xl`
  - Padding: `px-4 py-3`
  - Border: `border-white/10`
- **Features**:
  - Code block syntax highlighting (hidden by default)
  - Summary extraction
  - Message threading
- **macOS Equivalent**: `NSTextView` with attributed text
- **Implementation Notes**:
  - `NSTextView` with custom text containers
  - `NSAttributedString` for formatting
  - Collapsible code blocks with disclosure triangles

#### **Preview Panel (iframe)**
- **Current Implementation**: 70% width iframe container
- **Visual Properties**:
  - Background: `bg-gray-900/50`
  - Border: `border-b border-white/10`
  - Iframe: Full-size with rounded corners
  - Sandbox: `allow-scripts`
- **macOS Equivalent**: `WKWebView` (WebKit)
- **Implementation Notes**:
  - Use `WKWebView` for HTML preview
  - Configure `WKWebViewConfiguration` for sandboxing
  - JavaScript message handlers for debugging

### 5. Data Visualization

#### **PFC Metrics Panel**
- **Visual Properties**:
  - Compact mode: Horizontal stat display
  - Full mode: Multi-section card with progress bars
  - Background: `bg-white rounded-lg` (light) or `bg-gray-800` (dark)
- **Metrics Displayed**:
  - Token balance (progress bar)
  - Context percentage (color-coded progress bar)
  - Tokens used/saved
  - Plan tier badge
  - Efficiency percentage
- **Progress Bar Colors**:
  - Green: 0-40%
  - Yellow: 40-60%
  - Orange: 60-80%
  - Red: 80-100%
- **macOS Equivalent**: Custom `NSView` with `NSProgressIndicator`
- **Implementation Notes**:
  - Use `NSLevelIndicator` or custom drawn progress bars
  - Color coding via layer backgrounds
  - Animated updates with Core Animation

#### **Version History Panel**
- **Visual Properties**:
  - Modal overlay: `bg-black/60 backdrop-blur-sm`
  - Panel: `bg-gray-900 border-white/20 rounded-2xl`
  - Width: 600px
  - Max height: 80vh
- **Features**:
  - Snapshot list with timestamps
  - Restore button per snapshot
  - Create snapshot button
- **macOS Equivalent**: `NSPanel` or sheet
- **Implementation Notes**:
  - Use `NSPanel` with `.hudWindow` style
  - Or present as sheet with `beginSheet(_:completionHandler:)`

### 6. Loading & Feedback

#### **VibingLoader**
- **Visual Properties**:
  - Animated gradient box with pulse/ping effects
  - Rotating message text with animated dots
  - Size: 20x20px icon + text
- **Messages**: 25+ creative loading messages (vibing, cooking, crafting, etc.)
- **macOS Equivalent**: Custom `NSView` with `NSProgressIndicator`
- **Implementation Notes**:
  - `CABasicAnimation` for pulse effect
  - Timer-based text rotation
  - Indeterminate progress indicator

#### **Error/Success Alerts**
- **Visual Properties**:
  - Error: `bg-red-500/10 border-red-500/30 text-red-400`
  - Success: `bg-green-500/10 border-green-500/30 text-green-400`
  - Border radius: `rounded-xl`
- **macOS Equivalent**: `NSAlert` or custom notification
- **Implementation Notes**:
  - Use native `NSAlert` for critical errors
  - Custom toast notifications for non-blocking feedback

### 7. Complex Components

#### **File Tree Viewer**
- **Visual Properties**:
  - Background: `bg-gray-900`
  - Text: `text-gray-100`
  - Selected item: `bg-blue-600/20 text-blue-400`
  - Folder icons: Blue
  - File icons: Gray
  - Chevrons for expand/collapse
- **Features**:
  - Hierarchical folder structure
  - Expand/collapse folders
  - File selection
  - Indentation: 12px per level
- **macOS Equivalent**: `NSOutlineView`
- **Implementation Notes**:
  - Use `NSOutlineView` with custom cell views
  - SF Symbols for folder/file icons
  - Built-in expand/collapse animations

#### **Code Viewer**
- **Visual Properties**:
  - Background: `bg-gray-900`
  - Text: `text-gray-100`
  - Header: File path + language badge
  - Line numbers: `bg-gray-800 text-gray-500`
  - Copy button: `bg-gray-700 hover:bg-gray-600`
- **Features**:
  - Line numbers
  - Syntax highlighting (future)
  - Copy to clipboard
  - Language badge
- **macOS Equivalent**: `NSTextView` with custom layout
- **Implementation Notes**:
  - Use `NSTextView` with `NSLayoutManager`
  - Monospaced font (SF Mono or Menlo)
  - Line number gutter via custom text container inset
  - Syntax highlighting with `NSAttributedString`

#### **Agent Selector**
- **Visual Properties**:
  - Search input: `bg-white/5 border-white/10`
  - Dropdown: `bg-gray-900 border-white/10 rounded-lg`
  - Agent items: Hover `bg-white/5`
  - Model badges: Color-coded (Opus: purple, Sonnet: blue, Haiku: green)
- **Features**:
  - Search/filter agents
  - Agent type icons (Sparkles, Users, Wrench)
  - Model tier badges
  - Description text
- **macOS Equivalent**: `NSSearchField` + `NSPopover` or `NSComboBox`
- **Implementation Notes**:
  - `NSSearchField` with custom search template
  - `NSPopover` for dropdown with custom content view
  - Filter array controller for live search

#### **Multi-File View**
- **Visual Properties**:
  - View mode toggle: Preview vs Code
  - Split view: File tree (256px) + content area
  - Toggle buttons: `bg-blue-600` when active
- **Features**:
  - Preview mode: Full-size iframe
  - Code mode: File tree + code viewer
  - File count badge
- **macOS Equivalent**: `NSSplitView` with toggle
- **Implementation Notes**:
  - `NSSplitViewController` for split layout
  - `NSSegmentedControl` for view mode toggle
  - `WKWebView` for preview, `NSTextView` for code

---

## Design Tokens

### Color System

#### **Base Colors**
```swift
// Background (Light Mode)
--background: #ffffff

// Background (Dark Mode)
--background: #0a0a0a (gray-950)

// Foreground (Light Mode)
--foreground: #171717

// Foreground (Dark Mode)
--foreground: #ededed
```

#### **Brand Colors (Gradients)**
```swift
// Primary Gradient
from-purple-500 (#a855f7) via-pink-500 (#ec4899) to-cyan-500 (#06b6d4)

// Text Gradient
from-purple-400 (#c084fc) via-pink-400 (#f472b6) to-cyan-400 (#22d3ee)

// Logo Gradient
from-purple-500 (#a855f7) to-pink-500 (#ec4899)
```

#### **Semantic Colors**
```swift
// Success
green-500: #22c55e (text)
green-500/10: rgba(34, 197, 94, 0.1) (background)
green-500/30: rgba(34, 197, 94, 0.3) (border)

// Error
red-500: #ef4444
red-500/10: rgba(239, 68, 68, 0.1)
red-500/30: rgba(239, 68, 68, 0.3)
red-400: #f87171 (text)

// Warning
yellow-500: #eab308
orange-500: #f97316

// Info
blue-500: #3b82f6
blue-500/10: rgba(59, 130, 246, 0.1)
cyan-500: #06b6d4
```

#### **Neutral Colors**
```swift
// Dark Mode Palette
gray-950: #0a0a0a (background)
gray-900: #111827 (cards, panels)
gray-800: #1f2937 (header, borders)
gray-700: #374151 (hover states)
gray-600: #4b5563 (disabled)
gray-500: #6b7280 (secondary text)
gray-400: #9ca3af (tertiary text)
gray-300: #d1d5db (text on dark)
gray-200: #e5e7eb (borders)
gray-100: #f3f4f6 (light text)

// Alpha Variants
white/5: rgba(255, 255, 255, 0.05)
white/10: rgba(255, 255, 255, 0.1)
white/20: rgba(255, 255, 255, 0.2)
white/40: rgba(255, 255, 255, 0.4)
white/60: rgba(255, 255, 255, 0.6)
white/80: rgba(255, 255, 255, 0.8)
```

### Typography

#### **Font Families**
```swift
// Sans Serif (Primary)
--font-geist-sans: "Geist" (Google Fonts)
Fallback: Arial, Helvetica, sans-serif

// Monospace (Code)
--font-geist-mono: "Geist Mono" (Google Fonts)
Fallback: Menlo, Monaco, monospace

// macOS Native Alternatives
Primary: SF Pro Text, SF Pro Display
Monospace: SF Mono
```

#### **Font Sizes**
```swift
// Scale (Tailwind)
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px)
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px)
text-3xl: 1.875rem (30px)
text-4xl: 2.25rem (36px)
text-5xl: 3rem (48px)
text-7xl: 4.5rem (72px)
text-8xl: 6rem (96px)

// macOS System Sizes
.headline: 17pt (SF Pro Display Semibold)
.body: 13pt (SF Pro Text Regular)
.callout: 12pt (SF Pro Text Regular)
.subheadline: 11pt (SF Pro Text Regular)
.footnote: 10pt (SF Pro Text Regular)
.caption1: 10pt (SF Pro Text Regular)
.caption2: 9pt (SF Pro Text Regular)
```

#### **Font Weights**
```swift
font-normal: 400
font-medium: 500
font-semibold: 600
font-bold: 700

// macOS System Weights
.regular: NSFont.Weight.regular
.medium: NSFont.Weight.medium
.semibold: NSFont.Weight.semibold
.bold: NSFont.Weight.bold
```

### Spacing

#### **Padding/Margin Scale**
```swift
p-1: 0.25rem (4px)
p-2: 0.5rem (8px)
p-3: 0.75rem (12px)
p-4: 1rem (16px)
p-6: 1.5rem (24px)
p-8: 2rem (32px)
p-12: 3rem (48px)
p-16: 4rem (64px)

// Inline Padding
px-2: 8px horizontal
px-3: 12px horizontal
px-4: 16px horizontal
px-6: 24px horizontal
py-2: 8px vertical
py-3: 12px vertical
py-4: 16px vertical
```

#### **Gap (Flexbox/Grid)**
```swift
gap-2: 0.5rem (8px)
gap-3: 0.75rem (12px)
gap-4: 1rem (16px)
gap-6: 1.5rem (24px)
```

### Border Radius

```swift
rounded-lg: 0.5rem (8px)
rounded-xl: 0.75rem (12px)
rounded-2xl: 1rem (16px)
rounded-3xl: 1.5rem (24px)
rounded-full: 9999px (circular)

// macOS Equivalents
.small: 4pt
.medium: 6pt
.large: 10pt
```

### Shadows

```swift
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)

// Colored Shadows
shadow-purple-500/50: 0 10px 15px -3px rgba(168, 85, 247, 0.5)

// macOS Equivalents
NSShadow with:
  - shadowBlurRadius: 10-25
  - shadowOffset: NSSize(width: 0, height: -2 to -5)
  - shadowColor: NSColor.black.withAlphaComponent(0.1-0.25)
```

### Effects

#### **Backdrop Blur**
```swift
backdrop-blur-sm: blur(4px)
backdrop-blur-lg: blur(16px)
backdrop-blur-xl: blur(24px)

// macOS Equivalent
NSVisualEffectView.Material:
  - .underWindowBackground
  - .behindWindow
  - .hudWindow
  - .popover
  - .sidebar
```

#### **Opacity**
```swift
opacity-50: 50%
opacity-75: 75%

// Alpha in colors
/5: 5% opacity
/10: 10% opacity
/20: 20% opacity
/30: 30% opacity
/40: 40% opacity
/50: 50% opacity
/60: 60% opacity
/80: 80% opacity
```

### Animations

```swift
// Tailwind Animations
animate-spin: rotation 1s linear infinite
animate-ping: scale + opacity 1s cubic-bezier(0, 0, 0.2, 1) infinite
animate-pulse: opacity 2s cubic-bezier(0.4, 0, 0.6, 1) infinite

// Transitions
transition-all: all properties 150ms ease
transition-colors: color properties 150ms ease
transition-transform: transform 150ms ease

// Hover Effects
hover:scale-105: transform: scale(1.05)
hover:bg-white/20: background opacity change

// macOS Equivalents
NSAnimationContext with:
  - duration: 0.15-0.3s
  - timingFunction: .easeInEaseOut

CABasicAnimation for custom animations
```

---

## Layout Patterns

### 1. **Dashboard Layout**
- **Structure**: Full-screen container with sticky header
- **Sections**:
  - Navigation bar (top, sticky)
  - Hero/Welcome section
  - Stats cards grid (3 columns)
  - Projects grid (2-3 columns responsive)
- **Background**: Animated gradient blobs with blur
- **macOS Implementation**:
  - `NSScrollView` with main content
  - Sticky header via `NSVisualEffectView` with `.titlebar` material
  - `NSCollectionView` for project grid

### 2. **Create/Edit Layout (Split Pane)**
- **Structure**: Vertical split with 30/70 ratio
- **Left Pane (30%)**: Chat interface
  - Header with project info
  - Scrollable message list
  - Fixed input footer
- **Right Pane (70%)**: Preview panel
  - Header with title
  - Full-size iframe or file viewer
- **macOS Implementation**:
  - `NSSplitViewController` with two panes
  - Minimum widths: 300pt left, 400pt right
  - Divider style: `.thin` with vibrancy

### 3. **Authentication Layout**
- **Structure**: Centered card on gradient background
- **Elements**:
  - Logo header
  - Title + subtitle
  - Form fields
  - Primary CTA button
  - Social login buttons
  - Footer links
- **Card Properties**:
  - Width: max-w-md (448px)
  - Background: `bg-white/10` with `backdrop-blur-xl`
  - Padding: `p-8` (32px)
  - Border radius: `rounded-3xl` (24px)
- **macOS Implementation**:
  - Custom `NSWindow` with transparent title bar
  - Centered `NSView` with vibrancy effect
  - Standard form controls with custom styling

### 4. **Landing Page Layout**
- **Structure**: Long-scroll marketing page
- **Sections**:
  1. Hero with gradient text and CTAs
  2. Feature cards grid (3 columns)
  3. Project types showcase (5 columns)
  4. Stats section (3 columns)
  5. Final CTA
  6. Footer
- **macOS Implementation**:
  - Not typically needed for native app
  - Could be `WKWebView` for onboarding

### 5. **Responsive Breakpoints**
```swift
// Tailwind Breakpoints
sm: 640px
md: 768px
lg: 1024px
xl: 1280px

// macOS Window Sizes
Minimum: 1024x768 (iPad Pro landscape)
Recommended: 1280x800 (MacBook Air)
Default: 1440x900 (MacBook Pro 14")
```

---

## Interaction Patterns

### 1. **Navigation**

#### **Primary Navigation**
- **Pattern**: Top navigation bar with logo, links, and user menu
- **Actions**:
  - Click logo: Go to dashboard
  - Click navigation items: Navigate to section
  - Click user menu: Show dropdown menu
- **macOS Equivalent**:
  - `NSToolbar` with custom items
  - Or custom title bar view with `NSButton` controls

#### **Tab/View Switching**
- **Pattern**: Segmented control for view modes (Preview vs Code)
- **Actions**: Click segment to switch view
- **macOS Equivalent**:
  - `NSSegmentedControl` with `.texturedSquare` style
  - Or `NSTabView` with custom tab bar

### 2. **Data Entry**

#### **Text Input**
- **Pattern**: Focus on click, type, blur to confirm
- **Shortcuts**:
  - Enter: Submit form
  - Escape: Clear input or cancel
  - Cmd+V: Paste (including images)
- **macOS Implementation**:
  - Standard `NSTextField` behavior
  - Custom paste handling for images

#### **Voice Input**
- **Pattern**: Click to start recording, click again to stop
- **Feedback**: Pulsing red indicator, interim transcript tooltip
- **macOS Implementation**:
  - `NSSpeechRecognizer` with task-based recognition
  - Visual feedback via `CAAnimation`

#### **File Upload**
- **Pattern**: Click to browse, or drag-and-drop files
- **Feedback**: Border color change on drag hover
- **macOS Implementation**:
  - `NSOpenPanel` for file selection
  - Drag-and-drop via `NSDraggingDestination`

### 3. **Selection & Actions**

#### **Card Selection**
- **Pattern**: Hover to highlight, click to open
- **Hover Effects**:
  - Scale up (1.05x)
  - Gradient glow overlay
  - Background opacity increase
- **macOS Implementation**:
  - `NSTrackingArea` for hover detection
  - Core Animation for scale and glow effects

#### **Button Actions**
- **Pattern**: Hover to change state, click to execute
- **Loading State**: Disabled with loading text or spinner
- **macOS Implementation**:
  - Standard `NSButton` with custom styling
  - Disable button during async operations

#### **File Tree Navigation**
- **Pattern**: Click chevron to expand/collapse, click file to select
- **Feedback**: Highlight selected file, animate expand/collapse
- **macOS Implementation**:
  - `NSOutlineView` with built-in animations
  - Delegate methods for selection changes

### 4. **Real-Time Updates**

#### **Message Streaming**
- **Pattern**: Stream assistant messages word-by-word (SSE)
- **Feedback**: Loading indicator, progress messages
- **macOS Implementation**:
  - URLSession with streaming delegate
  - Update `NSTextView` progressively

#### **Preview Updates**
- **Pattern**: Update iframe on code changes
- **Feedback**: Reload animation (if needed)
- **macOS Implementation**:
  - Reload `WKWebView` when code changes
  - Optional loading overlay

#### **Auto-Save**
- **Pattern**: Save project automatically after generation
- **Feedback**: Status indicator (Saving... → Saved)
- **macOS Implementation**:
  - Timer-based or change-based auto-save
  - Status indicator in title bar or toolbar

### 5. **Modals & Overlays**

#### **Version History Modal**
- **Pattern**: Click history button to open, click outside to close
- **Animation**: Fade in with scale
- **macOS Implementation**:
  - Present as sheet: `window.beginSheet(_:completionHandler:)`
  - Or use `NSPanel` with `.hudWindow` style

#### **Error Alerts**
- **Pattern**: Show inline error message below input
- **Duration**: Persist until dismissed or form resubmitted
- **macOS Implementation**:
  - `NSAlert` for critical errors
  - Custom `NSView` for inline validation errors

### 6. **Gestures**

#### **Current Web Gestures**
- Scroll: Vertical scrolling in message list and preview
- Drag: File upload drag-and-drop
- Paste: Cmd+V for images and files
- Click: Standard pointer interactions
- Hover: Button and card highlights

#### **macOS Native Gestures**
- Scroll: Two-finger scroll (trackpad) or scroll wheel
- Pinch: Zoom in/out (for preview)
- Swipe: Navigate back/forward (optional)
- Right-click: Context menus (file tree, code viewer)
- Drag: Drag-and-drop for file upload

---

## Accessibility Features

### Current Web Accessibility

#### **Keyboard Navigation**
- Tab order: Follows visual flow (top to bottom, left to right)
- Focus indicators: Purple ring on focused inputs
- Shortcuts:
  - Enter: Submit forms
  - Escape: Close modals
  - Spacebar: Toggle buttons

#### **Screen Reader Support**
- Semantic HTML: Proper heading hierarchy
- ARIA labels: For icon buttons and interactive elements
- Alt text: For images (user-uploaded)
- Live regions: For status updates (loading, errors)

#### **Visual Accessibility**
- High contrast: Dark mode with sufficient contrast ratios
- Text sizing: Relative units (rem) for scalability
- Color coding: Not relied upon solely (icons + text)
- Focus indicators: Visible purple rings

#### **Input Accommodations**
- Voice input: Speech-to-text for text entry
- File upload: Both click and drag-and-drop
- Error messages: Clear, actionable error text

### macOS Accessibility Implementation

#### **VoiceOver Support**
```swift
// All interactive elements need:
.setAccessibilityLabel("Action button")
.setAccessibilityHint("Submits the form")
.setAccessibilityRole(.button)

// For custom controls:
.setAccessibilityElement(true)
.setAccessibilityTraits([.button, .notEnabled])
```

#### **Keyboard Navigation**
```swift
// Full keyboard navigation:
window.initialFirstResponder = textField
view.nextKeyView = nextTextField

// Tab order via Interface Builder or code

// Keyboard shortcuts:
NSEvent.ModifierFlags.command + "s" = Save
```

#### **Dynamic Type**
```swift
// Use system fonts that scale:
NSFont.systemFont(ofSize: NSFont.systemFontSize)

// Or dynamic type:
NSFont.preferredFont(forTextStyle: .body)
```

#### **Reduce Motion**
```swift
// Check user preference:
NSWorkspace.shared.accessibilityDisplayShouldReduceMotion

// Disable animations if true:
if shouldReduceMotion {
    layer.removeAllAnimations()
}
```

#### **High Contrast**
```swift
// Check user preference:
NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast

// Adjust colors accordingly:
if shouldIncreaseContrast {
    borderColor = .black
    textColor = .white
}
```

#### **Voice Control**
```swift
// Ensure all clickable elements have:
.setAccessibilityLabel("Submit button")

// Voice Control will automatically recognize them
```

---

## Native macOS Translation

### AppKit vs SwiftUI Decision Matrix

| Component | AppKit | SwiftUI | Recommendation | Rationale |
|-----------|--------|---------|----------------|-----------|
| Main Window | ✓ | ✓ | **AppKit** | More control over vibrancy, title bar customization |
| Navigation Bar | ✓ | ✓ | **AppKit** | NSToolbar provides better macOS integration |
| Split View | ✓ | ✓ | **AppKit** | NSSplitView has better resize controls |
| Text Input | ✓ | ✓ | **Either** | Both work well, choose based on rest of app |
| Buttons | ✓ | ✓ | **Either** | Both work well |
| File Tree | ✓ | ✗ | **AppKit** | NSOutlineView is superior for hierarchical data |
| Code Viewer | ✓ | ✗ | **AppKit** | NSTextView has better performance for large files |
| Preview (WebView) | ✓ | ✓ | **Either** | WKWebView available in both |
| Modals | ✓ | ✓ | **AppKit** | Better sheet and panel control |
| Cards/Lists | ✓ | ✓ | **SwiftUI** | Easier to create custom card layouts |
| Glassmorphism | ✓ | ✓ | **AppKit** | NSVisualEffectView more powerful |
| Animations | ✓ | ✓ | **SwiftUI** | Declarative animations easier |

**Recommendation**: **Hybrid approach with AppKit foundation**
- Use AppKit for main window structure, file management, code editing
- Use SwiftUI for card layouts, forms, and simple views
- Bridge with `NSHostingController` or `NSHostingView`

### Component Mapping Reference

#### **1:1 Native Equivalents**

| Web Component | Native macOS | Implementation |
|---------------|--------------|----------------|
| `<input type="text">` | `NSTextField` | Standard text field with custom styling |
| `<button>` | `NSButton` | Custom gradient background via layer |
| `<select>` / Dropdown | `NSPopUpButton` or `NSComboBox` | For agent selector |
| `<textarea>` | `NSTextView` | For multiline input |
| `<iframe>` | `WKWebView` | For HTML preview |
| File input | `NSOpenPanel` | Native file picker |
| Progress bar | `NSProgressIndicator` or `NSLevelIndicator` | For metrics |
| Modal | `NSPanel` or sheet | For version history |
| Checkbox | `NSButton` (checkbox type) | For settings |
| Alert | `NSAlert` | For errors/confirmations |

#### **Custom Implementation Required**

| Web Component | Native Approach | Notes |
|---------------|-----------------|-------|
| Gradient backgrounds | `CAGradientLayer` | Add as sublayer to button/view |
| Glassmorphism | `NSVisualEffectView` | Use appropriate material |
| Hover effects | `NSTrackingArea` + Core Animation | Track mouse enter/exit |
| Voice recorder | `NSSpeechRecognizer` | Native speech recognition |
| File upload (drag-drop) | `NSDraggingDestination` protocol | Implement on custom view |
| Animated loader | Custom `NSView` + `CAAnimation` | Rotating gradients |
| Message bubbles | Custom `NSView` or `NSTableCellView` | For chat interface |
| Project cards | Custom `NSView` + `CALayer` | With shadow and gradients |
| Code syntax highlighting | `NSAttributedString` + `NSTextView` | Use regex or parser |
| File tree | `NSOutlineView` + custom cell views | Built-in expand/collapse |

### Glassmorphism Implementation

#### **NSVisualEffectView Materials**

```swift
// For main backgrounds
.underWindowBackground // Main content area

// For sidebars
.sidebar // File tree, navigation

// For overlays
.popover // Dropdowns, tooltips
.hudWindow // Version history panel

// For headers
.titlebar // Navigation bar
.headerView // Section headers

// For content
.contentBackground // Cards, panels
```

#### **Blur + Opacity Pattern**

```swift
// Replicate backdrop-blur-xl bg-white/5
let visualEffect = NSVisualEffectView()
visualEffect.material = .underWindowBackground
visualEffect.blendingMode = .behindWindow
visualEffect.state = .active

// Add colored overlay for tinting
let tintLayer = CALayer()
tintLayer.backgroundColor = NSColor.white.withAlphaComponent(0.05).cgColor
visualEffect.layer?.addSublayer(tintLayer)
```

### Gradient Implementation

#### **Text Gradients**

```swift
// Method 1: Using NSAttributedString (limited)
// Better for single-color text

// Method 2: Using layer mask (recommended)
let gradientLayer = CAGradientLayer()
gradientLayer.colors = [
    NSColor(red: 0.66, green: 0.33, blue: 0.97, alpha: 1).cgColor, // purple-400
    NSColor(red: 0.96, green: 0.45, blue: 0.71, alpha: 1).cgColor, // pink-400
    NSColor(red: 0.13, green: 0.83, blue: 0.93, alpha: 1).cgColor  // cyan-400
]
gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)

let textView = NSTextView()
textView.layer?.mask = gradientLayer
```

#### **Button Gradients**

```swift
let button = NSButton()
button.wantsLayer = true

let gradientLayer = CAGradientLayer()
gradientLayer.colors = [
    NSColor(red: 0.66, green: 0.33, blue: 0.97, alpha: 1).cgColor, // purple-500
    NSColor(red: 0.93, green: 0.28, blue: 0.60, alpha: 1).cgColor, // pink-500
    NSColor(red: 0.02, green: 0.71, blue: 0.83, alpha: 1).cgColor  // cyan-500
]
gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
gradientLayer.frame = button.bounds

button.layer?.insertSublayer(gradientLayer, at: 0)
button.layer?.cornerRadius = 12
button.layer?.masksToBounds = true
```

#### **Background Gradients (Animated)**

```swift
// For animated background blobs
let blobView = NSView()
blobView.wantsLayer = true

let gradientLayer = CAGradientLayer()
gradientLayer.type = .radial
gradientLayer.colors = [
    NSColor.purple.withAlphaComponent(0.3).cgColor,
    NSColor.pink.withAlphaComponent(0.2).cgColor,
    NSColor.clear.cgColor
]
gradientLayer.locations = [0, 0.5, 1]

// Animate position
let animation = CABasicAnimation(keyPath: "locations")
animation.fromValue = [0, 0.5, 1]
animation.toValue = [0, 0.7, 1]
animation.duration = 2
animation.autoreverses = true
animation.repeatCount = .infinity

gradientLayer.add(animation, forKey: "pulse")
blobView.layer?.addSublayer(gradientLayer)
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

#### **Goals**
- Set up Xcode project with AppKit target
- Implement design tokens (colors, typography, spacing)
- Create base window with custom title bar
- Implement vibrancy system

#### **Tasks**
1. Create new macOS App project in Xcode
2. Set up Swift package for design system
3. Define color palette as `NSColor` extensions
4. Define typography as `NSFont` extensions
5. Create `DesignSystem` class for centralized access
6. Implement main window with transparent title bar
7. Add `NSVisualEffectView` as base layer
8. Test dark mode appearance

#### **Deliverables**
- Working macOS app shell
- Design system Swift package
- Main window with vibrancy effect
- Dark mode support

### Phase 2: Core Components (Weeks 3-4)

#### **Goals**
- Implement reusable button components
- Create text input components
- Implement card layouts
- Build navigation bar

#### **Tasks**
1. Create `GradientButton` subclass of `NSButton`
2. Create `GlassButton` with vibrancy effect
3. Create `StyledTextField` with focus ring
4. Create `ProjectCard` custom view
5. Create `StatsCard` custom view
6. Implement custom navigation bar view
7. Add logo and user menu
8. Test component library

#### **Deliverables**
- Reusable component library
- Navigation bar implementation
- Card components
- Button styles

### Phase 3: Authentication & Dashboard (Weeks 5-6)

#### **Goals**
- Implement login/signup screens
- Build dashboard layout
- Implement project grid
- Add user menu

#### **Tasks**
1. Create authentication window controller
2. Implement login form with validation
3. Implement signup form
4. Add Google OAuth (if needed)
5. Create dashboard view controller
6. Implement stats cards layout
7. Implement project grid with `NSCollectionView`
8. Add create project button
9. Implement project deletion

#### **Deliverables**
- Working authentication flow
- Dashboard with project grid
- User profile menu
- Project CRUD operations

### Phase 4: Create/Edit Interface (Weeks 7-9)

#### **Goals**
- Implement split-pane layout
- Build chat interface
- Implement preview panel
- Add file management

#### **Tasks**
1. Create split view controller (30/70 split)
2. Implement chat message list (`NSTableView`)
3. Create message cell views (user/assistant)
4. Implement text input with voice button
5. Add file upload button with drag-drop
6. Integrate `WKWebView` for preview
7. Create file tree with `NSOutlineView`
8. Implement code viewer with `NSTextView`
9. Add view mode toggle (preview/code)
10. Implement auto-save functionality

#### **Deliverables**
- Working split-pane interface
- Chat system with streaming
- Preview panel with WebView
- File tree and code viewer
- Voice input integration

### Phase 5: Advanced Features (Weeks 10-11)

#### **Goals**
- Implement agent selector
- Add version history
- Implement metrics panel
- Add keyboard shortcuts

#### **Tasks**
1. Create agent selector with search
2. Implement agent filtering
3. Create version history panel (sheet)
4. Implement snapshot creation/restoration
5. Create PFC metrics view
6. Add progress bars with animations
7. Implement keyboard shortcuts
8. Add menu bar items
9. Implement preferences window

#### **Deliverables**
- Agent selector with search
- Version history system
- Metrics visualization
- Keyboard shortcuts
- Preferences panel

### Phase 6: Polish & Optimization (Weeks 12-13)

#### **Goals**
- Optimize performance
- Add animations
- Implement error handling
- Test accessibility

#### **Tasks**
1. Optimize `NSOutlineView` for large file trees
2. Optimize `NSTextView` for large code files
3. Add Core Animation for transitions
4. Implement loading states
5. Add error alerts and validation
6. Test with VoiceOver
7. Test keyboard navigation
8. Add haptic feedback (if supported)
9. Optimize memory usage
10. Profile with Instruments

#### **Deliverables**
- Smooth animations
- Performance optimization
- Accessibility compliance
- Error handling

### Phase 7: Testing & Deployment (Week 14)

#### **Goals**
- Comprehensive testing
- App notarization
- Deployment preparation

#### **Tasks**
1. Write unit tests for core logic
2. Write UI tests for critical flows
3. Test on different macOS versions (12-14)
4. Test on different screen sizes
5. Code signing setup
6. Notarization for Gatekeeper
7. Create installer (DMG or PKG)
8. Prepare app store submission (if applicable)
9. Write user documentation
10. Final QA pass

#### **Deliverables**
- Test coverage reports
- Signed and notarized app
- Installer package
- User documentation
- Release candidate

---

## Technical Considerations

### 1. **State Management**

#### **Web (React)**
- Uses React hooks (`useState`, `useEffect`, `useRef`)
- Uses Zustand for global state (inferred from package.json)
- Local component state for UI

#### **macOS Native**
- SwiftUI: `@State`, `@StateObject`, `@EnvironmentObject`, `@Binding`
- AppKit:
  - View controllers hold state properties
  - Delegate pattern for communication
  - `NotificationCenter` for app-wide events
  - Combine framework for reactive patterns

**Recommendation**: Use Combine for reactive state management

```swift
import Combine

class ProjectStore: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading: Bool = false
    @Published var error: Error?

    private var cancellables = Set<AnyCancellable>()

    func loadProjects() {
        isLoading = true
        // API call...
    }
}
```

### 2. **Networking**

#### **Web**
- Fetch API with SSE (Server-Sent Events) for streaming
- Next-Auth for authentication
- Custom SSE parser library

#### **macOS**
- URLSession for HTTP requests
- URLSessionDelegate for streaming responses
- Keychain for credential storage

**Implementation**:
```swift
// Streaming SSE
let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
let task = session.dataTask(with: request)

func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    // Parse SSE events
    parseSSE(data)
}
```

### 3. **Data Persistence**

#### **Web**
- Prisma ORM with PostgreSQL
- Server-side persistence

#### **macOS**
- Options:
  1. Core Data (recommended for structured data)
  2. SQLite directly
  3. User Defaults (for preferences)
  4. File system (for documents)
  5. CloudKit (for iCloud sync)

**Recommendation**: Core Data for local projects, API sync for cloud

### 4. **Sandboxing**

#### **Web**
- Server-side sandboxing with Daytona or WebContainer
- iframe sandboxing for preview

#### **macOS**
- WKWebView sandboxing for preview (same as iframe)
- App sandboxing for macOS App Store
- Entitlements for network, file access

**Considerations**:
- Enable "Outgoing Connections (Client)" for API calls
- Enable "User Selected File (Read/Write)" for file uploads
- Consider hardened runtime for notarization

### 5. **Code Syntax Highlighting**

#### **Web**
- Prism.js or Monaco Editor (planned)
- Currently: plain text

#### **macOS**
- Options:
  1. Highlightr (Swift wrapper for highlight.js)
  2. NSAttributedString with custom parsing
  3. Embed Monaco via WKWebView
  4. Use syntax-highlighted library like SyntaxKit

**Recommendation**: Highlightr for native feel

```swift
import Highlightr

let highlightr = Highlightr()!
highlightr.setTheme(to: "github-dark")
let attributedCode = highlightr.highlight(code, as: "swift")
textView.textStorage?.setAttributedString(attributedCode)
```

### 6. **Speech Recognition**

#### **Web**
- Web Speech API (browser-based)
- Free, no API key required
- Continuous listening support

#### **macOS**
- NSSpeechRecognizer (on-device, macOS 12+)
- Or Speech framework (iOS/macOS)
- Requires microphone permission

**Implementation**:
```swift
import Speech

let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
let request = SFSpeechAudioBufferRecognitionRequest()

recognizer?.recognitionTask(with: request) { result, error in
    if let result = result {
        let transcript = result.bestTranscription.formattedString
        // Update UI
    }
}
```

### 7. **File Management**

#### **Web**
- Virtual file system via WebContainer
- In-memory file tree

#### **macOS**
- Real file system access
- FileManager for file operations
- NSDocument architecture (optional)

**Recommendation**: Create temporary project directories

```swift
// Create temp project directory
let tempDir = FileManager.default.temporaryDirectory
    .appendingPathComponent(UUID().uuidString)

try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)

// Save files
for file in projectFiles {
    let fileURL = tempDir.appendingPathComponent(file.path)
    try file.content.write(to: fileURL, atomically: true, encoding: .utf8)
}
```

### 8. **Auto-Save**

#### **Web**
- Triggered after each generation
- Saves to database via API

#### **macOS**
- NSDocument auto-save (if using document architecture)
- Or custom timer-based auto-save
- Save to Core Data or local file

**Implementation**:
```swift
// Auto-save timer
var autoSaveTimer: Timer?

func startAutoSave() {
    autoSaveTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
        self.saveProject()
    }
}

func saveProject() {
    // Save to Core Data or file system
}
```

---

## Migration Challenges & Solutions

### 1. **Glassmorphism Fidelity**

**Challenge**: Web uses `backdrop-filter: blur()` with alpha backgrounds. macOS `NSVisualEffectView` has preset materials.

**Solution**:
- Use `.underWindowBackground` material for closest match
- Layer multiple `NSVisualEffectView` instances for custom effects
- Add colored overlay layers for tinting

```swift
let backdropView = NSVisualEffectView()
backdropView.material = .underWindowBackground
backdropView.blendingMode = .behindWindow

let tintView = NSView()
tintView.wantsLayer = true
tintView.layer?.backgroundColor = NSColor.white.withAlphaComponent(0.05).cgColor

backdropView.addSubview(tintView)
```

### 2. **Gradient Text**

**Challenge**: Web uses `background-clip: text` for gradient text. No direct AppKit equivalent.

**Solution**:
- Use `CAGradientLayer` as mask for text layer
- Or use `NSAttributedString` with custom drawing

```swift
// Gradient text via layer mask
let textLayer = CATextLayer()
textLayer.string = "Gradient Text"

let gradientLayer = CAGradientLayer()
gradientLayer.colors = [/* gradient colors */]
gradientLayer.mask = textLayer

view.layer?.addSublayer(gradientLayer)
```

### 3. **Streaming Messages**

**Challenge**: Web streams text via SSE. AppKit `NSTextView` needs progressive updates.

**Solution**:
- Use URLSession streaming delegate
- Append to `NSTextStorage` progressively
- Scroll to bottom on updates

```swift
func appendMessage(_ text: String) {
    let attributedText = NSAttributedString(string: text)
    textView.textStorage?.append(attributedText)
    textView.scrollToEndOfDocument(nil)
}
```

### 4. **Hover Effects**

**Challenge**: Web uses `:hover` CSS pseudo-class. AppKit needs explicit tracking.

**Solution**:
- Add `NSTrackingArea` to views
- Implement `mouseEntered` and `mouseExited`
- Animate changes with Core Animation

```swift
let trackingArea = NSTrackingArea(
    rect: bounds,
    options: [.mouseEnteredAndExited, .activeAlways],
    owner: self,
    userInfo: nil
)
addTrackingArea(trackingArea)

override func mouseEntered(with event: NSEvent) {
    NSAnimationContext.runAnimationGroup { context in
        context.duration = 0.15
        layer?.transform = CATransform3DMakeScale(1.05, 1.05, 1)
    }
}
```

### 5. **Responsive Layout**

**Challenge**: Web uses CSS media queries. AppKit windows have fixed sizes (can resize).

**Solution**:
- Use Auto Layout with constraints
- Implement `viewDidLayout` to adjust for window size changes
- Use `NSStackView` for flexible layouts

```swift
override func viewDidLayout() {
    super.viewDidLayout()

    if view.bounds.width < 1024 {
        stackView.orientation = .vertical
    } else {
        stackView.orientation = .horizontal
    }
}
```

### 6. **Web Fonts**

**Challenge**: Web uses Google Fonts (Geist, Geist Mono). macOS uses system fonts.

**Solution**:
- Use SF Pro Text/Display for sans-serif
- Use SF Mono for monospace
- Or embed custom fonts in app bundle

```swift
// Use system fonts
let bodyFont = NSFont.systemFont(ofSize: 13, weight: .regular)
let headlineFont = NSFont.systemFont(ofSize: 17, weight: .semibold)
let codeFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

// Or load custom font
if let fontURL = Bundle.main.url(forResource: "Geist-Regular", withExtension: "ttf") {
    CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil)
    let customFont = NSFont(name: "Geist", size: 13)
}
```

### 7. **Dark Mode**

**Challenge**: Web manually implements dark mode with CSS. macOS has system-wide dark mode.

**Solution**:
- Use semantic system colors that adapt automatically
- Or check appearance and adjust colors

```swift
// Use semantic colors (recommended)
let backgroundColor = NSColor.controlBackgroundColor
let textColor = NSColor.labelColor

// Or check appearance manually
override func viewDidChangeEffectiveAppearance() {
    super.viewDidChangeEffectiveAppearance()

    if effectiveAppearance.name == .darkAqua {
        // Dark mode
    } else {
        // Light mode
    }
}
```

### 8. **Code Sandbox/Preview**

**Challenge**: Web uses Daytona sandbox or WebContainer for live execution. macOS needs preview solution.

**Solution**:
- Use `WKWebView` for HTML preview (same as web)
- For other languages, show code only (no execution)
- Or integrate external compiler/interpreter

```swift
let webView = WKWebView()
webView.loadHTMLString(generatedHTML, baseURL: nil)

// For sandboxing
let config = WKWebViewConfiguration()
config.preferences.javaScriptEnabled = true
// Additional security settings...
```

---

## Resources & References

### Apple Documentation
- [Human Interface Guidelines - macOS](https://developer.apple.com/design/human-interface-guidelines/macos)
- [NSVisualEffectView Documentation](https://developer.apple.com/documentation/appkit/nsvisualeffectview)
- [AppKit Documentation](https://developer.apple.com/documentation/appkit)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Core Animation Programming Guide](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/Introduction/Introduction.html)

### Design Resources
- SF Symbols: https://developer.apple.com/sf-symbols/
- macOS UI Kit (Figma): https://www.figma.com/community/file/1006885051521968468
- Apple Design Resources: https://developer.apple.com/design/resources/

### Third-Party Libraries
- **Highlightr**: Syntax highlighting (https://github.com/raspu/Highlightr)
- **SnapKit**: Auto Layout DSL (https://github.com/SnapKit/SnapKit)
- **Alamofire**: Networking (https://github.com/Alamofire/Alamofire)
- **Kingfisher**: Image loading/caching (https://github.com/onevcat/Kingfisher)

### Color Conversion Tools
- Tailwind to Swift: https://tailwind-to-swift.netlify.app/
- ColorSlurp: macOS color picker with hex/RGB/HSL
- SF Symbols App: Built-in macOS app for icon browsing

### Development Tools
- Xcode 15+ (for macOS 14 target)
- SF Symbols 5 (for latest icons)
- Instruments (for performance profiling)
- Accessibility Inspector (for a11y testing)

---

## Appendix A: Component Implementation Examples

### Example 1: Gradient Button

```swift
class GradientButton: NSButton {
    private var gradientLayer: CAGradientLayer?

    override var wantsUpdateLayer: Bool { return true }

    override func updateLayer() {
        super.updateLayer()

        if gradientLayer == nil {
            let gradient = CAGradientLayer()
            gradient.colors = [
                NSColor(red: 0.66, green: 0.33, blue: 0.97, alpha: 1).cgColor,
                NSColor(red: 0.93, green: 0.28, blue: 0.60, alpha: 1).cgColor,
                NSColor(red: 0.02, green: 0.71, blue: 0.83, alpha: 1).cgColor
            ]
            gradient.startPoint = CGPoint(x: 0, y: 0.5)
            gradient.endPoint = CGPoint(x: 1, y: 0.5)
            gradient.frame = bounds
            gradient.cornerRadius = 12

            layer?.insertSublayer(gradient, at: 0)
            gradientLayer = gradient
        }

        gradientLayer?.frame = bounds
    }

    override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)

        // Scale down animation
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.1
            layer?.transform = CATransform3DMakeScale(0.95, 0.95, 1)
        }
    }

    override func mouseUp(with event: NSEvent) {
        super.mouseUp(with: event)

        // Scale back up
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.1
            layer?.transform = CATransform3DIdentity
        }
    }
}
```

### Example 2: Glassmorphism Card

```swift
class GlassCard: NSView {
    private var visualEffectView: NSVisualEffectView!

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupViews()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupViews()
    }

    private func setupViews() {
        wantsLayer = true

        // Visual effect view for backdrop blur
        visualEffectView = NSVisualEffectView(frame: bounds)
        visualEffectView.material = .underWindowBackground
        visualEffectView.blendingMode = .behindWindow
        visualEffectView.state = .active
        visualEffectView.autoresizingMask = [.width, .height]
        addSubview(visualEffectView, positioned: .below, relativeTo: nil)

        // Tint overlay
        let tintLayer = CALayer()
        tintLayer.backgroundColor = NSColor.white.withAlphaComponent(0.05).cgColor
        tintLayer.frame = bounds
        tintLayer.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
        layer?.addSublayer(tintLayer)

        // Border
        layer?.borderWidth = 1
        layer?.borderColor = NSColor.white.withAlphaComponent(0.1).cgColor
        layer?.cornerRadius = 16
        layer?.masksToBounds = true
    }

    override func layout() {
        super.layout()
        visualEffectView.frame = bounds
    }
}
```

### Example 3: Voice Recorder Button

```swift
class VoiceRecorderButton: NSButton {
    private var isRecording = false
    private var recognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    var onTranscription: ((String) -> Void)?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        wantsLayer = true
        image = NSImage(systemSymbolName: "mic", accessibilityDescription: "Microphone")
        imagePosition = .imageOnly
        isBordered = false
        layer?.cornerRadius = 12
        updateAppearance()

        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        target = self
        action = #selector(toggleRecording)
    }

    @objc private func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        // Request authorization first
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                if status == .authorized {
                    self.beginRecording()
                }
            }
        }
    }

    private func beginRecording() {
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try? audioEngine.start()

        recognitionTask = recognizer?.recognitionTask(with: recognitionRequest!) { result, error in
            if let result = result {
                let transcript = result.bestTranscription.formattedString
                self.onTranscription?(transcript)
            }

            if error != nil || result?.isFinal == true {
                self.stopRecording()
            }
        }

        isRecording = true
        updateAppearance()
        startPulseAnimation()
    }

    private func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        isRecording = false
        updateAppearance()
        stopPulseAnimation()
    }

    private func updateAppearance() {
        if isRecording {
            layer?.backgroundColor = NSColor.red.withAlphaComponent(0.2).cgColor
        } else {
            layer?.backgroundColor = NSColor.white.withAlphaComponent(0.1).cgColor
        }
    }

    private func startPulseAnimation() {
        let animation = CABasicAnimation(keyPath: "opacity")
        animation.fromValue = 1.0
        animation.toValue = 0.5
        animation.duration = 0.8
        animation.autoreverses = true
        animation.repeatCount = .infinity
        layer?.add(animation, forKey: "pulse")
    }

    private func stopPulseAnimation() {
        layer?.removeAnimation(forKey: "pulse")
    }
}
```

---

## Appendix B: Design Token Swift Implementation

```swift
// DesignSystem.swift

import AppKit

enum DesignSystem {

    // MARK: - Colors

    enum Colors {
        // Brand Gradients
        static let primaryGradient: [CGColor] = [
            NSColor(red: 0.66, green: 0.33, blue: 0.97, alpha: 1).cgColor, // purple-500
            NSColor(red: 0.93, green: 0.28, blue: 0.60, alpha: 1).cgColor, // pink-500
            NSColor(red: 0.02, green: 0.71, blue: 0.83, alpha: 1).cgColor  // cyan-500
        ]

        static let textGradient: [CGColor] = [
            NSColor(red: 0.75, green: 0.52, blue: 0.99, alpha: 1).cgColor, // purple-400
            NSColor(red: 0.96, green: 0.45, blue: 0.71, alpha: 1).cgColor, // pink-400
            NSColor(red: 0.13, green: 0.83, blue: 0.93, alpha: 1).cgColor  // cyan-400
        ]

        // Semantic Colors
        static let success = NSColor(red: 0.13, green: 0.77, blue: 0.37, alpha: 1) // green-500
        static let error = NSColor(red: 0.94, green: 0.26, blue: 0.26, alpha: 1)   // red-500
        static let warning = NSColor(red: 0.92, green: 0.70, blue: 0.03, alpha: 1) // yellow-500
        static let info = NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1)    // blue-500

        // Neutral Colors (Dark Mode)
        static let background = NSColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1) // gray-950
        static let surface = NSColor(red: 0.07, green: 0.09, blue: 0.15, alpha: 1)     // gray-900
        static let border = NSColor.white.withAlphaComponent(0.1)

        // Text Colors
        static let textPrimary = NSColor.white
        static let textSecondary = NSColor.white.withAlphaComponent(0.8)
        static let textTertiary = NSColor.white.withAlphaComponent(0.6)
        static let textDisabled = NSColor.white.withAlphaComponent(0.4)
    }

    // MARK: - Typography

    enum Typography {
        static let displayFont = NSFont.systemFont(ofSize: 72, weight: .bold)
        static let headlineFont = NSFont.systemFont(ofSize: 36, weight: .bold)
        static let titleFont = NSFont.systemFont(ofSize: 24, weight: .semibold)
        static let bodyFont = NSFont.systemFont(ofSize: 13, weight: .regular)
        static let captionFont = NSFont.systemFont(ofSize: 11, weight: .regular)
        static let codeFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
        static let xxxl: CGFloat = 64
    }

    // MARK: - Corner Radius

    enum CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let xlarge: CGFloat = 24
    }

    // MARK: - Shadows

    enum Shadows {
        static let small: NSShadow = {
            let shadow = NSShadow()
            shadow.shadowBlurRadius = 10
            shadow.shadowOffset = NSSize(width: 0, height: -2)
            shadow.shadowColor = NSColor.black.withAlphaComponent(0.1)
            return shadow
        }()

        static let medium: NSShadow = {
            let shadow = NSShadow()
            shadow.shadowBlurRadius = 20
            shadow.shadowOffset = NSSize(width: 0, height: -4)
            shadow.shadowColor = NSColor.black.withAlphaComponent(0.15)
            return shadow
        }()

        static let large: NSShadow = {
            let shadow = NSShadow()
            shadow.shadowBlurRadius = 30
            shadow.shadowOffset = NSSize(width: 0, height: -6)
            shadow.shadowColor = NSColor.black.withAlphaComponent(0.2)
            return shadow
        }()
    }

    // MARK: - Animations

    enum Animations {
        static let fast: TimeInterval = 0.15
        static let normal: TimeInterval = 0.3
        static let slow: TimeInterval = 0.5
    }
}
```

---

## Conclusion

This analysis provides a comprehensive foundation for migrating Vibing2 from a web application to a native macOS application. The design system is well-documented, modern, and translatable to AppKit/SwiftUI with careful attention to macOS design patterns.

**Key Recommendations**:
1. Use AppKit for the main application structure (better control)
2. Leverage `NSVisualEffectView` extensively for glassmorphism
3. Use Core Animation for smooth transitions and effects
4. Implement custom components for cards, gradients, and unique UI elements
5. Follow the phased implementation roadmap (14 weeks)
6. Test accessibility features thoroughly with VoiceOver
7. Profile performance with Instruments, especially for file tree and code viewer

**Success Metrics**:
- Visual fidelity: 95%+ match to web design
- Performance: 60 FPS animations, <100ms response time
- Accessibility: Full VoiceOver support, keyboard navigation
- Native feel: Respects macOS conventions while maintaining brand identity

The resulting native macOS application will provide a superior user experience compared to the web version, with better performance, native integrations, and a truly native feel while maintaining the unique Vibing2 design aesthetic.
