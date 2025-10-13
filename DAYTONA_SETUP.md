# Daytona Integration Setup Guide

This guide explains how to set up and use the Daytona sandbox integration for isolated code generation with preview URLs.

## What is Daytona?

Daytona provides on-demand development environments (sandboxes) where you can:
- Generate code in isolated containers
- Get shareable preview URLs
- Deploy instantly without local setup
- Keep your main application safe from experimental code

## Features

✅ **Isolated Generation** - Each project runs in its own sandbox
✅ **Preview URLs** - Get instant shareable links to your generated apps
✅ **Better Error Isolation** - Failures don't affect your main app
✅ **Production-Ready** - Deploy environments similar to production
✅ **Child Process Pattern** - Better resource management and error handling

## Setup Instructions

### 1. Get Daytona API Key

1. Sign up at [Daytona.io](https://www.daytona.io)
2. Navigate to your dashboard
3. Generate an API key
4. Copy the key

### 2. Add to Environment Variables

Add to your `.env` file:

```bash
DAYTONA_API_KEY="your_daytona_api_key_here"
```

### 3. Test the Integration

```bash
# Run the development server
pnpm dev

# Navigate to the Daytona page
# http://localhost:3000/create-daytona

# Select a project type and enter a prompt
# Example: "Create a todo app with dark mode"
```

## Architecture

### Traditional Flow (existing `/create` page)
```
User Input → API Route → Claude AI → Database → Preview
```

### Daytona Flow (new `/create-daytona` page)
```
User Input → API Route → Child Process → Daytona Sandbox → Claude AI → Preview URL
```

## File Structure

```
lib/
├── daytona-client.ts          # Daytona SDK wrapper functions

scripts/
├── generate-in-daytona.ts     # Child process script for generation

app/api/agent/
├── stream-daytona/
│   └── route.ts               # API route for Daytona generation

app/
├── create-daytona/
│   └── page.tsx               # UI for Daytona generation

components/
├── MessageDisplay.tsx         # Improved message display component
```

## API Endpoints

### POST `/api/agent/stream-daytona`

Generates code in a Daytona sandbox and returns a preview URL.

**Request:**
```json
{
  "messages": [...],
  "projectType": "web-app",
  "agents": ["frontend-dev", "ui-designer"],
  "projectName": "my-project"
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"type":"progress","data":{"status":"creating","message":"🏗️ Creating sandbox..."}}
data: {"type":"message","data":{"type":"assistant","content":"..."}}
data: {"type":"tool","data":{"action":"create","file":"index.html"}}
data: {"type":"complete","data":{"previewUrl":"https://..."}}
```

## Event Types

### Progress Events
```typescript
{
  type: 'progress',
  data: {
    status: 'creating' | 'initializing' | 'generating' | 'writing' | 'starting' | 'preview' | 'complete',
    message: string,
    sandboxId?: string
  }
}
```

### Message Events
```typescript
{
  type: 'message',
  data: {
    type: 'assistant',
    content: string,
    delta: boolean  // true for streaming chunks
  }
}
```

### Tool Events
```typescript
{
  type: 'tool',
  data: {
    action: 'read' | 'create' | 'update',
    file: string,
    linesAdded?: number
  }
}
```

### Complete Event
```typescript
{
  type: 'complete',
  data: {
    success: true,
    sandboxId: string,
    projectDir: string,
    previewUrl: string,
    accessToken?: string,
    tokensUsed: number,
    message: string
  }
}
```

### Error Events
```typescript
{
  type: 'error',
  data: {
    message: string,
    stack?: string
  }
}
```

## Usage Examples

### Example 1: Simple Web App

**Input:**
```
Create a calculator with a modern design
```

**Output:**
- Sandbox created
- HTML/CSS/JS generated
- Preview URL: `https://sandbox-abc123.daytona.app`

### Example 2: Complex Application

**Input:**
```
Build a task management app with:
- Add/edit/delete tasks
- Mark tasks as complete
- Filter by status
- Dark mode toggle
- LocalStorage persistence
```

**Output:**
- Multiple files created
- Full functionality implemented
- Live preview URL with all features working

## Troubleshooting

### Issue: "DAYTONA_API_KEY not configured"

**Solution:** Add the API key to your `.env` file and restart the dev server.

### Issue: "Generation process exited with code 1"

**Solutions:**
1. Check Anthropic API key is valid
2. Check Daytona API key is valid
3. Check console logs for detailed error messages
4. Verify network connectivity

### Issue: Preview URL not loading

**Solutions:**
1. Wait a few seconds - server may still be starting
2. Check if sandbox was created successfully
3. Verify port 3000 is being used
4. Try opening in a new tab

## Comparison: Traditional vs Daytona

| Feature | Traditional (`/create`) | Daytona (`/create-daytona`) |
|---------|------------------------|------------------------------|
| **Isolation** | ❌ Modifies your app | ✅ Separate sandbox |
| **Preview** | ✅ iframe only | ✅ Shareable URL |
| **Persistence** | ✅ Saved to database | ⚠️ Temporary (sandbox lifecycle) |
| **Collaboration** | ✅ Real-time sync | ❌ Not yet implemented |
| **Safety** | ⚠️ Experimental code in main app | ✅ Fully isolated |
| **Setup** | ✅ No extra setup | ⚠️ Requires Daytona account |
| **Cost** | Free (AI only) | Paid (AI + Daytona) |

## Best Practices

1. **Use Daytona for:**
   - Experimenting with new ideas
   - Generating standalone demos
   - Sharing quick prototypes
   - Testing risky changes

2. **Use Traditional for:**
   - Building persistent projects
   - Collaborative development
   - Projects you want to save
   - Iterative development

3. **Sandbox Cleanup:**
   - Sandboxes are automatically cleaned up on error
   - Consider implementing manual cleanup for successful generations
   - Monitor your Daytona usage to avoid costs

4. **Performance:**
   - First sandbox creation takes ~10-15 seconds
   - Subsequent generations are faster
   - Preview URLs remain active as long as sandbox exists

## Future Enhancements

- [ ] Sandbox persistence and management
- [ ] Multiple file support in sandboxes
- [ ] Real-time collaboration in sandboxes
- [ ] Custom sandbox configurations
- [ ] Automatic sandbox cleanup after inactivity
- [ ] Export sandbox to GitHub
- [ ] Deploy sandbox to production

## Cost Considerations

**Daytona Pricing:**
- Free tier: Limited sandboxes
- Pro tier: More sandboxes + longer runtime
- Enterprise: Unlimited

**Recommended:**
- Use Daytona for demos and experiments
- Use traditional flow for long-term projects
- Monitor usage on Daytona dashboard

## Support

For issues or questions:
1. Check this documentation
2. Review console logs
3. Check Daytona dashboard for sandbox status
4. Contact Daytona support for sandbox-specific issues
5. Open GitHub issue for integration bugs

## Related Documentation

- [SYSTEM_SPECIFICATION.md](./SYSTEM_SPECIFICATION.md) - Overall system architecture
- [MULTI_FILE_ARCHITECTURE.md](./MULTI_FILE_ARCHITECTURE.md) - Traditional multi-file system
- [Daytona Docs](https://docs.daytona.io) - Official Daytona documentation
