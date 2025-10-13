# JavaScript Preview Fix ✅

## Problem

When generating games or mobile apps (like Space Invaders), the preview panel showed nothing because:
- The AI generated **JavaScript** code, not HTML
- Preview extraction only looked for `.html` files
- JavaScript files were ignored

## Root Cause

**Code Extraction Logic** ([CreatePageContent.tsx:200-201](app/create/CreatePageContent.tsx#L200-L201)):
```typescript
// OLD - Only looked for HTML
const htmlChange = eventData.changes.find((c: any) =>
  c.language === 'html' || c.file?.endsWith('.html')
);
```

For mobile apps and games:
- ❌ AI generates `.js` or `.ts` files
- ❌ No HTML file found
- ❌ `setPreviewCode()` never called
- ❌ Preview stays blank

## Solution

### 1. Check for JavaScript Files

Updated to look for JavaScript when HTML not found:

```typescript
// First try HTML
let htmlChange = eventData.changes.find(c =>
  c.language === 'html' || c.file?.endsWith('.html')
);

// If no HTML, look for JavaScript
if (!htmlChange) {
  const jsChange = eventData.changes.find(c =>
    c.language === 'javascript' ||
    c.language === 'js' ||
    c.file?.endsWith('.js')
  );

  if (jsChange?.content) {
    // Wrap in HTML...
  }
}
```

### 2. Wrap JavaScript in HTML

Create a minimal HTML wrapper for JavaScript preview:

```typescript
const wrappedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script>
${jsChange.content}
    </script>
</body>
</html>`;

setPreviewCode(wrappedHTML);
```

## Files Modified

### [app/create/CreatePageContent.tsx](app/create/CreatePageContent.tsx)

**Lines 195-233**: Updated `code_changes` handler
```typescript
case 'code_changes':
case 'changes':
  // Now supports HTML and JavaScript
  if (eventData.changes) {
    let htmlChange = // find HTML

    if (!htmlChange) {
      const jsChange = // find JavaScript
      if (jsChange) {
        const wrappedHTML = // wrap JS
        setPreviewCode(wrappedHTML);
      }
    } else {
      setPreviewCode(htmlChange.content);
    }
  }
```

**Lines 234-267**: Updated `file_operations` handler
```typescript
case 'file_operations':
  // Same logic for file operations
  if (eventData.operations?.creates) {
    let htmlFile = // find HTML

    if (!htmlFile) {
      const jsFile = // find JavaScript
      if (jsFile) {
        const wrappedHTML = // wrap JS
        setPreviewCode(wrappedHTML);
      }
    }
  }
```

## How It Works

### Flow for Space Invaders

```
User: "build a space invaders basic game"
    ↓
AI generates: game.js (JavaScript)
    ↓
Stream sends: __CHANGES__ event
    ↓
Code extraction:
  1. Check for HTML → Not found
  2. Check for JavaScript → Found!
  3. Wrap in HTML template
  4. setPreviewCode(wrappedHTML)
    ↓
Preview renders: <iframe srcDoc={wrappedHTML} />
    ↓
Game displays in preview panel! 🎮
```

### HTML Wrapper Features

The wrapper includes:
- **Viewport meta tag** - Mobile responsiveness
- **Minimal styles**:
  - `body { margin: 0; padding: 0; overflow: hidden; }`
  - `canvas { display: block; }` (for canvas games)
- **Script tag** - Embeds the JavaScript
- **No external dependencies** - Self-contained

## Supported File Types

| File Type | Extension | Handling |
|-----------|-----------|----------|
| **HTML** | `.html` | ✅ Direct preview (priority) |
| **JavaScript** | `.js` | ✅ Wrapped in HTML |
| **JavaScript** | `.javascript` | ✅ Wrapped in HTML |
| **TypeScript** | `.ts` | ⚠️ Not yet (needs transpiling) |
| **React/Vue** | `.jsx/.vue` | ❌ Needs build step |

## Testing

### Test with Games
1. Go to http://localhost:3000/create
2. Select "Mobile App"
3. Enter: "build a space invaders basic game"
4. Submit and wait
5. Preview should show the game! 🎮

### Test with HTML (Still Works)
1. Select "Landing Page"
2. Enter: "create a simple webpage"
3. Preview shows HTML directly ✅

### Console Logs

Look for these in DevTools:
```
Code changes received: {changes: [...]}
Wrapping JavaScript in HTML for preview  ← For JS files
Setting preview code from HTML changes   ← For HTML files
```

## Example Output

### Space Invaders JavaScript
```javascript
// game.js
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
// ... game logic ...
```

### Wrapped for Preview
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>body{margin:0;padding:0;overflow:hidden}canvas{display:block}</style>
</head>
<body>
    <script>
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
// ... game logic ...
    </script>
</body>
</html>
```

### Preview Result
The iframe renders the wrapped HTML:
- ✅ Canvas element created
- ✅ JavaScript executes
- ✅ Game displays and runs
- ✅ User can interact

## Limitations

### What Works
- ✅ Pure JavaScript games/apps
- ✅ Canvas-based applications
- ✅ DOM manipulation code
- ✅ Self-contained scripts

### What Doesn't Work (Yet)
- ❌ **TypeScript** - Needs compilation
- ❌ **Multiple files** - Only wraps single JS file
- ❌ **External imports** - No module bundler
- ❌ **React/Vue** - Needs build system

### Future Improvements
- Add TypeScript transpilation
- Support multiple file bundling
- Add module support with importmap
- Integrate WebContainer for full build

## Fallback Behavior

### If No HTML or JavaScript
The preview stays empty with message:
> "Preview will appear here"

### Priority Order
1. **HTML files** - Direct preview (highest priority)
2. **JavaScript files** - Wrapped in HTML
3. **Other files** - No preview (show message)

## Console Debugging

Enable verbose logging:
```javascript
// In CreatePageContent.tsx
console.log('Code changes received:', eventData);
console.log('Wrapping JavaScript in HTML for preview');
console.log('Setting preview code from changes');
```

Check:
- ✅ Event received with correct data
- ✅ JavaScript file detected
- ✅ HTML wrapper created
- ✅ Preview code set

## Success!

Now you can:
- 🎮 Build and preview games
- 📱 Create mobile apps with preview
- 🎨 See JavaScript visualizations
- ⚡ Test interactive demos

Try these prompts:
- "build a snake game"
- "create a drawing app"
- "make a particle effect demo"
- "build a calculator app"

All will now show previews! 🎉
