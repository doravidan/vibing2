# Vibing2 DMG Background Design Specification

## Overview

This document specifies the design for the Vibing2 macOS DMG installer background image.
The background provides visual instructions for the drag-to-install process.

## Dimensions

- **Width**: 660 pixels
- **Height**: 450 pixels
- **Format**: PNG with transparency support
- **Resolution**: 2x retina (@2x version: 1320x900px)

## Design Elements

### Background

- **Color**: Gradient from #0A0A0A (top) to #1A1A1A (bottom)
- **Style**: Subtle, professional, modern
- **Texture**: Minimal noise overlay for depth (5% opacity)

### Brand Elements

- **Logo Position**: Top center, 80px from top
- **Logo Size**: 120x120px
- **Logo Style**: Full color Vibing2 logo with glow effect

### Installation Instructions

#### Text Elements

1. **Main Instruction**
   - Text: "Drag Vibing2 to Applications"
   - Font: SF Pro Display, Bold
   - Size: 24pt
   - Color: #FFFFFF
   - Position: Center, 200px from top
   - Alignment: Center

2. **Subtext**
   - Text: "To install Vibing2 on your Mac"
   - Font: SF Pro Text, Regular
   - Size: 14pt
   - Color: #A0A0A0
   - Position: Below main instruction (16px gap)
   - Alignment: Center

#### Visual Elements

3. **App Icon (Left)**
   - Position: 160px from left, 280px from top
   - Size: 128x128px
   - Shadow: 0 8px 24px rgba(0,0,0,0.3)
   - Interactive: Draggable

4. **Arrow/Line**
   - Style: Dotted or dashed line
   - Color: #4A9EFF (Vibing2 brand blue)
   - Width: 2px
   - Animation: Optional subtle pulse
   - Start: App icon center-right
   - End: Applications folder center-left
   - Curve: Slight arc upward (Bezier curve)

5. **Applications Folder Icon (Right)**
   - Position: 500px from left, 280px from top
   - Size: 128x128px
   - Icon: System Applications folder icon
   - Label: "Applications" below icon
   - Label Font: SF Pro Text, Regular, 12pt
   - Label Color: #FFFFFF
   - Target: Symlink to /Applications

### Additional Elements

6. **Version Badge**
   - Position: Bottom right, 16px margin
   - Text: "v1.0.0"
   - Font: SF Pro Text, Medium, 11pt
   - Color: #666666
   - Background: Semi-transparent dark pill
   - Padding: 6px 12px
   - Border radius: 12px

7. **System Requirements**
   - Position: Bottom left, 16px margin
   - Text: "Requires macOS 11+"
   - Font: SF Pro Text, Regular, 10pt
   - Color: #666666

## Color Palette

### Primary Colors
- **Vibing2 Blue**: #4A9EFF (accent, arrows, highlights)
- **Background Dark**: #0A0A0A to #1A1A1A (gradient)
- **Text Primary**: #FFFFFF (main instructions)
- **Text Secondary**: #A0A0A0 (subtitles)
- **Text Tertiary**: #666666 (metadata)

### Accent Colors
- **Success Green**: #10B981 (optional for completion state)
- **Warning Yellow**: #F59E0B (optional for attention)

## Typography

### Font Stack
1. SF Pro Display (headings)
2. SF Pro Text (body text)
3. Fallback: -apple-system, system-ui

### Font Weights
- Bold: 700 (main instructions)
- Medium: 500 (version badge)
- Regular: 400 (body text, labels)

## Visual States

### Normal State
- Standard appearance as described above
- Subtle glow on app icon

### Hover State (if interactive)
- App icon: Scale 1.05, increased shadow
- Arrow: Animated pulse effect

### Drag State
- App icon: Semi-transparent while dragging
- Arrow: Bright glow effect
- Applications folder: Highlight border

## Export Specifications

### File Formats
1. **dmg-background.png** (660x450, @1x)
   - Standard resolution
   - PNG-8 with transparency
   - Optimized file size

2. **dmg-background@2x.png** (1320x900, @2x)
   - Retina resolution
   - PNG-24 with transparency
   - High quality, optimized

3. **dmg-background.tiff** (optional)
   - Multi-resolution TIFF
   - Contains both @1x and @2x
   - Used by some DMG tools

### Optimization
- Use ImageOptim or similar tools
- Target file size: < 500KB (@1x), < 1MB (@2x)
- Preserve transparency
- sRGB color space

## Implementation

### Figma/Sketch Design

```
# Layer Structure
- Background
  - Gradient Fill
  - Noise Texture (5% opacity)
- Logo
  - Vibing2 Logo
  - Glow Effect
- Instructions
  - Main Text
  - Subtext
- Installation Elements
  - App Icon (with shadow)
  - Arrow Line (dashed)
  - Applications Folder
  - Applications Label
- Metadata
  - Version Badge
  - System Requirements
```

### CSS/HTML Prototype (for reference)

```css
.dmg-background {
  width: 660px;
  height: 450px;
  background: linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%);
  position: relative;
  font-family: -apple-system, system-ui, sans-serif;
}

.logo {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 0 24px rgba(74, 158, 255, 0.3));
}

.instruction-text {
  position: absolute;
  top: 200px;
  width: 100%;
  text-align: center;
  color: #FFFFFF;
  font-size: 24px;
  font-weight: 700;
}

.subtext {
  position: absolute;
  top: 240px;
  width: 100%;
  text-align: center;
  color: #A0A0A0;
  font-size: 14px;
}

.app-icon {
  position: absolute;
  left: 160px;
  top: 280px;
  width: 128px;
  height: 128px;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
}

.arrow {
  position: absolute;
  left: 288px;
  top: 344px;
  width: 212px;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #4A9EFF,
    #4A9EFF 10px,
    transparent 10px,
    transparent 20px
  );
}

.applications-folder {
  position: absolute;
  right: 160px;
  top: 280px;
  width: 128px;
  height: 128px;
}

.version-badge {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #666666;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.system-requirements {
  position: absolute;
  bottom: 16px;
  left: 16px;
  color: #666666;
  font-size: 10px;
}
```

## Assets Required

### Source Files
1. Vibing2 logo (SVG or high-res PNG)
2. macOS Applications folder icon (from system)
3. Custom app icon (from vibing2-desktop/src-tauri/icons/)

### Tools Needed
- Figma, Sketch, or Adobe Illustrator
- ImageOptim for optimization
- Preview or Pixelmator for final adjustments

## DMG Configuration

### Using create-dmg tool

```json
{
  "background": "dmg-background.png",
  "icon-size": 128,
  "window": {
    "size": {
      "width": 660,
      "height": 450
    },
    "position": {
      "x": 400,
      "y": 300
    }
  },
  "contents": [
    { "x": 160, "y": 280, "type": "file", "path": "Vibing2.app" },
    { "x": 500, "y": 280, "type": "link", "path": "/Applications" }
  ]
}
```

## Testing Checklist

- [ ] Background displays correctly at @1x resolution
- [ ] Background displays correctly at @2x resolution (Retina)
- [ ] Icons are properly positioned
- [ ] Text is readable on all Mac displays
- [ ] File size is optimized
- [ ] Drag-to-Applications workflow is intuitive
- [ ] Works on macOS 11, 12, 13, 14, 15
- [ ] Looks good in both light and dark mode (DMG window)

## Alternative Minimal Design

For a simpler approach:

- Plain dark background (#1A1A1A)
- No gradient or texture
- Simple arrow instead of dashed line
- Minimal text: "Install Vibing2"
- No version badge or requirements (shown in window title)

This reduces file size and works universally across all macOS versions.

## References

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/macos
- SF Pro Fonts: https://developer.apple.com/fonts/
- Create DMG: https://github.com/create-dmg/create-dmg
- DMG Canvas: https://www.araelium.com/dmgcanvas

## Notes

1. The background image should complement the macOS system appearance
2. Keep text minimal and clear
3. Use system-standard icons where possible
4. Test on multiple macOS versions
5. Consider accessibility (high contrast, readable text)
6. File size matters for download speed
7. Update version badge during build process
