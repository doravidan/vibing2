# 🚀 QuickVibe 2.0 - Setup Guide

## Quick Start (5 minutes)

### Step 1: Get Your API Key

1. Visit [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (you'll need it in Step 3)

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here
```

### Step 4: Start Development Server

```bash
pnpm dev
```

The app will be available at:
- **Local:** http://localhost:3000
- **Network:** http://192.168.1.x:3000

### Step 5: Test It Out

1. Visit http://localhost:3000
2. Click "Start Building"
3. Try a prompt like: "Create a todo list app with React"
4. Watch the streaming response in real-time!

---

## Troubleshooting

### Port 3000 Already in Use

If you see "Port 3000 is in use", Next.js will automatically use 3001 or another available port. Just use the URL shown in the terminal.

### API Key Not Working

- Make sure there are no spaces in your `.env.local` file
- Restart the dev server after changing `.env.local`
- Verify the key starts with `sk-ant-api03-`

### Build Errors

If you get TypeScript or build errors:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Restart dev server
pnpm dev
```

### Module Not Found

Make sure all dependencies are installed:

```bash
pnpm add ai @ai-sdk/anthropic
```

---

## Development Workflow

### File Structure

```
app/
├── page.tsx              # Landing page
├── chat/page.tsx         # Chat interface (main feature)
├── api/
│   └── stream/
│       └── chat/
│           └── route.ts  # Streaming API endpoint
└── layout.tsx           # Root layout
```

### Making Changes

1. **Edit UI:** Modify `app/chat/page.tsx`
2. **Edit API:** Modify `app/api/stream/chat/route.ts`
3. **Add Routes:** Create new folders in `app/`
4. **Install Packages:** Use `pnpm add <package>`

Changes will hot-reload automatically.

### Testing Streaming

The streaming feature is the core of Phase 1. Test it by:

1. Opening the chat at `/chat`
2. Sending a message
3. Watching for real-time streaming (no delays)
4. Checking the typing indicators appear

---

## Next Steps

### Phase 2: WebContainer Integration

To start Phase 2, install WebContainer:

```bash
pnpm add @webcontainer/api
```

Then follow the implementation plan in `QUICKVIBE_2.0_PLAN.md`.

### Phase 3: Multi-Agent System

Install additional dependencies:

```bash
pnpm add zod
```

### Phase 4: AutoFix Pipeline

Install linting tools:

```bash
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

---

## Performance Tips

### Optimize Build Time

- Use Turbopack (already enabled)
- Keep dependencies minimal
- Use dynamic imports for large components

### Reduce API Costs

- Use Haiku for simple tasks
- Cache common responses
- Implement rate limiting

### Better Streaming

- Keep system prompts concise
- Use lower temperature for more focused responses
- Stream UI updates separately from content

---

## Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic API Reference](https://docs.anthropic.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Need Help?

- Check `QUICKVIBE_2.0_PLAN.md` for the full roadmap
- Review `README.md` for feature overview
- File issues on GitHub (coming soon)

---

**Happy Building! 🚀**
