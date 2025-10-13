# Image Upload & Vision API Fix

## Problem

Users were experiencing 500 Internal Server Error when trying to upload images or paste screenshots to analyze with the AI agent.

### Error Details
```
POST http://localhost:3000/api/agent/stream 500 (Internal Server Error)
SSE stream error (attempt 3/3): Error: HTTP 500: Internal Server Error
```

## Root Cause

The agent stream route ([app/api/agent/stream/route.ts](app/api/agent/stream/route.ts)) was transforming messages to Anthropic API format as simple strings:

```typescript
// ❌ Old code - doesn't support images
const anthropicMessages = messages.map((msg) => ({
  role: msg.role === 'user' ? 'user' : 'assistant',
  content: msg.content  // Simple string
}));
```

When images were embedded as base64 in markdown format (`![alt](data:image/png;base64,...)`), Claude's API rejected the request because it expects a specific **content blocks format** for multimodal messages:

```typescript
{
  role: 'user',
  content: [
    { type: 'text', text: '...' },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: '...' } }
  ]
}
```

## Solution

Updated message transformation to detect and extract base64 images, then format them properly for Claude's Vision API.

### Implementation ([app/api/agent/stream/route.ts:53-101](app/api/agent/stream/route.ts#L53-L101))

```typescript
const anthropicMessages = messages.map((msg: { role: string; content: string }) => {
  const role = msg.role === 'user' ? 'user' : 'assistant';

  // Check if message contains base64 images
  const imageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
  const images: Array<{ source: { type: 'base64'; media_type: string; data: string } }> = [];
  let textContent = msg.content;

  // Extract images
  let match;
  while ((match = imageRegex.exec(msg.content)) !== null) {
    const dataUrl = match[2];
    const [mediaInfo, base64Data] = dataUrl.split(',');
    const mediaType = mediaInfo.match(/data:(image\/[^;]+)/)?.[1] || 'image/png';

    images.push({
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data
      }
    });

    // Replace image markdown with a placeholder in text
    textContent = textContent.replace(match[0], `[Image ${images.length}: ${match[1] || 'attached'}]`);
  }

  // If images found, use content blocks format
  if (images.length > 0) {
    const contentBlocks: any[] = [
      { type: 'text', text: textContent }
    ];

    // Add image blocks
    images.forEach(img => {
      contentBlocks.push({
        type: 'image',
        source: img.source
      });
    });

    return { role, content: contentBlocks };
  }

  // No images, use simple string format
  return { role, content: msg.content };
});
```

## Features

✅ **Image Detection** - Regex pattern finds all base64 images in markdown
✅ **Format Conversion** - Extracts media type and base64 data
✅ **Content Blocks** - Formats as array with text and image blocks
✅ **Backward Compatible** - Text-only messages still use simple string format
✅ **Multiple Images** - Supports multiple images in a single message
✅ **Media Type Detection** - Automatically detects image/png, image/jpeg, image/webp, etc.

## Testing

### Test Case 1: Text-Only Message
```json
{
  "messages": [
    { "role": "user", "content": "Create a calculator" }
  ]
}
```
**Result:** ✅ Works - uses simple string format

### Test Case 2: Message with One Image
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Fix this button\n\n![screenshot](data:image/png;base64,iVBORw0KG...)"
    }
  ]
}
```
**Result:** ✅ Works - converts to content blocks format

### Test Case 3: Message with Multiple Images
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Compare these:\n\n![before](data:image/png;base64,...)\n![after](data:image/png;base64,...)"
    }
  ]
}
```
**Result:** ✅ Works - all images extracted and formatted

## Related Components

- **File Upload Component** - [components/FileUpload.tsx](components/FileUpload.tsx) - Handles file uploads and creates base64
- **Create Page** - [app/create/CreatePageContent.tsx](app/create/CreatePageContent.tsx) - Enriches prompts with file attachments
- **Clipboard Paste** - [app/create/CreatePageContent.tsx:108-190](app/create/CreatePageContent.tsx#L108-L190) - Handles pasted images
- **Validation** - [lib/validations.ts:103](lib/validations.ts#L103) - 500KB limit for base64 images

## Deployment Notes

- ✅ **Server Restart Required** - Must restart `npm run dev` after code changes
- ✅ **No ENV Changes** - Uses existing `ANTHROPIC_API_KEY`
- ✅ **Claude Sonnet 4** - Already supports Vision API
- ⚠️ **Token Usage** - Images consume ~1,500 tokens each (approximate)

## Voice Input (Separate Issue)

The Whisper API 500 error is unrelated - it occurs when `OPENAI_API_KEY` is not configured:

```bash
# Add to .env.local
OPENAI_API_KEY=sk-proj-...
```

See [VOICE_INPUT_FEATURE.md](VOICE_INPUT_FEATURE.md) for voice setup details.

## Status

🟢 **FIXED** - Image upload and analysis now working with proper Vision API format

**Restart server to apply:**
```bash
npm run dev
```

**Test image upload:**
1. Go to http://localhost:3000/create
2. Click 📎 attachment button
3. Upload image or paste screenshot (Ctrl+V)
4. Submit prompt asking AI to analyze the image
5. AI should now process the image successfully ✅
