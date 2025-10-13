# Debugging 400 Bad Request Error

## Issue
Getting 400 Bad Request error when submitting prompts in the create page after implementing automatic agent selection.

## Error Message
```
POST http://localhost:3000/api/agent/stream 400 (Bad Request)
SSE stream error (attempt 3/3): Error: HTTP 400: Bad Request
```

## Debugging Steps Taken

### 1. Added Server-Side Logging
**File:** [app/api/agent/stream/route.ts](app/api/agent/stream/route.ts#L26-L27)

Added detailed error logging to see validation failures:
```typescript
if (!validation.success) {
  console.error('❌ Validation failed:', validation.error);
  console.error('❌ Request body:', JSON.stringify(body, null, 2));
  return new Response(...);
}
```

### 2. Added Client-Side Logging
**File:** [app/create/CreatePageContent.tsx](app/create/CreatePageContent.tsx#L222-L230)

Added logging to see exactly what's being sent:
```typescript
const requestBody = {
  messages: [...messages, userMessage],
  projectType,
  agents: selectedAgents,
  specializedAgent: selectedSpecializedAgent || undefined,
};

console.log('📤 Sending request to /api/agent/stream:', JSON.stringify(requestBody, null, 2));
```

## Validation Schema
**File:** [lib/validations.ts](lib/validations.ts#L98-L109)

```typescript
export const AIGenerationSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1, 'Message content required').max(10000),
    })
  ).min(1, 'At least one message is required').max(50, 'Too many messages'),
  projectType: z.string().min(1, 'Project type required').max(50),
  agents: z.array(z.string()).default([]),
  specializedAgent: z.string().optional(),
});
```

## Possible Causes

1. **projectType is null/empty** - When loading existing project, projectType might not be set
2. **messages have invalid structure** - Missing id, role, or content fields
3. **content too long** - Message content exceeds 10000 characters
4. **Too many messages** - More than 50 messages in conversation
5. **specializedAgent mismatch** - Invalid agent name format

## Next Steps

1. Submit a test prompt in the create page
2. Check browser console for the `📤 Sending request` log
3. Check terminal for the `❌ Validation failed` log
4. Compare the actual request body against the schema requirements
5. Fix the specific validation issue found

## Root Cause Found

**Issue:** Message content validation limit was too low (10,000 characters)

**Details:**
- Assistant responses with full HTML/CSS/JavaScript code often exceed 10,000 characters
- When loading a project with existing messages, the first message (calculator code) was 14,000+ characters
- Validation schema rejected the request before it could be processed

**Solution:**
Increased the message content limit from 10,000 to 50,000 characters in [lib/validations.ts](lib/validations.ts#L103)

```typescript
// Before:
content: z.string().min(1, 'Message content required').max(10000),

// After:
content: z.string().min(1, 'Message content required').max(50000),
```

## Status
✅ **Fixed** - Message content limit increased to 50,000 characters
