# Automatic Agent Selection System

**Status:** ✅ IMPLEMENTED AND ACTIVE

## Overview

The vibing2 platform now features an intelligent automatic agent selection system that analyzes each user prompt and automatically selects the most relevant specialized AI agents based on:

1. **Intent Analysis** - What the user wants to accomplish
2. **Project Context** - Existing files, code structure, and conversation history
3. **Keyword Matching** - Technical terms and domain-specific language
4. **Project Type** - The type of application being built

## How It Works

### Automatic Selection Flow

```
User Input
    ↓
🤖 Analyze Prompt
    ↓
Detect Intent Patterns
    ├─ UI Creation → frontend-developer, ui-ux-designer
    ├─ API Development → backend-architect, api-developer
    ├─ Security → security-auditor, backend-security-coder
    ├─ Testing → test-automator, tdd-orchestrator
    ├─ Debugging → debugger, code-reviewer
    └─ ... (15+ intent patterns)
    ↓
Analyze Project Context
    ├─ Existing Files → backend/frontend detection
    ├─ Current Code → Technology stack detection
    └─ Conversation History → Recent topics
    ↓
Calculate Agent Scores
    ├─ Intent Match: High weight (3x)
    ├─ Context Match: Medium weight (1.5x)
    └─ Router Selection: Medium-high weight (2.5x)
    ↓
Select Top 3-5 Agents
    ↓
✨ Display & Execute
```

### Intent Patterns Detected

The system recognizes 15+ intent patterns:

| Intent | Keywords | Agents Selected |
|--------|----------|----------------|
| **UI Creation** | create, build, ui, interface, button, form | frontend-developer, ui-ux-designer |
| **API Development** | api, endpoint, backend, database, rest | backend-architect, api-developer |
| **Authentication** | auth, login, signup, jwt, oauth | backend-security-coder, auth-specialist |
| **Security Review** | secure, vulnerability, xss, audit | security-auditor, frontend/backend-security-coder |
| **Testing** | test, unit test, e2e, coverage | test-automator, tdd-orchestrator |
| **Performance** | optimize, speed, slow, bottleneck | performance-engineer, database-optimizer |
| **Debugging** | fix, bug, error, problem, broken | debugger, code-reviewer |
| **Feature Addition** | add, implement, integrate | fullstack-developer, feature-engineer |
| **Refactoring** | refactor, clean, improve, organize | code-reviewer, refactoring-specialist |
| **Documentation** | document, docs, readme, comment | docs-architect, technical-writer |
| **Deployment** | deploy, ci/cd, docker, production | deployment-engineer, devops-engineer |
| **Data Processing** | data, analytics, chart, dashboard | data-scientist, frontend-developer |
| **AI Integration** | ai, ml, llm, chatbot | ai-engineer, ml-engineer |
| **UI Styling** | style, css, color, responsive | frontend-developer, css-expert |
| **Database** | database, schema, query, migration | database-optimizer, backend-architect |

### Context Analysis

The system analyzes:

- **Existing Files**: Detects if project has frontend, backend, database, or tests
- **Current Code**: Identifies React, API calls, authentication, etc.
- **Conversation History**: Last 3 messages for continuity
- **Project Type**: Website, mobile app, API, dashboard, game

## Implementation Details

### Files Created

1. **`lib/agents/auto-selector.ts`** (340 lines)
   - Core automatic selection logic
   - Intent pattern matching
   - Context analysis algorithms
   - Agent scoring system

2. **`app/api/agents/auto-select/route.ts`** (55 lines)
   - API endpoint for agent selection
   - Input validation with Zod
   - Logging and debugging

3. **`app/create/CreatePageContent.tsx`** (modified)
   - Integration with auto-selection API
   - UI updates to show selected agents
   - Removed manual agent selector

### API Endpoint

**POST** `/api/agents/auto-select`

**Request Body:**
```json
{
  "prompt": "Add user authentication with login and signup",
  "projectType": "website",
  "existingFiles": ["pages/index.tsx", "api/users.ts"],
  "currentCode": "<html>...</html>",
  "conversationHistory": [
    {"role": "user", "content": "Create a homepage"},
    {"role": "assistant", "content": "Here's the code..."}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "agents": [
    "backend-security-coder",
    "auth-specialist",
    "frontend-developer"
  ],
  "primaryAgent": "backend-security-coder",
  "confidence": 0.92,
  "reasoning": "Detected intents: authentication, api creation. Project context suggests: backend architect, frontend developer. Selected 3 specialized agents for this task",
  "explanation": "🤖 Auto-selected agents: backend security coder, auth specialist, frontend developer\n💡 Detected intents: authentication, api creation. Project context suggests: backend architect, frontend developer. Selected 3 specialized agents for this task\n📊 Confidence: 92%"
}
```

## User Experience

### Before (Manual Selection)
- User had to manually choose agents from dropdown
- No context awareness
- Risk of selecting wrong agents
- Extra step in workflow

### After (Automatic Selection)
- 🤖 System automatically analyzes prompt
- ✨ Shows selected agents: "frontend-developer, backend-architect"
- 📊 Displays: "(auto-selected based on your prompt)"
- No manual selection needed
- Agents adapt to each message

### UI Changes

**Old UI:**
```
[Agent Selector Dropdown ▼]
┌─────────────────────────────┐
│ Select specialized agent... │
└─────────────────────────────┘
```

**New UI:**
```
🤖 Active Agents:
[frontend-developer] [backend-architect] [ui-ux-designer]
(auto-selected based on your prompt)
```

## Examples

### Example 1: UI Creation
**User:** "Create a responsive navigation bar with a hamburger menu"

**Auto-Selected:**
- `frontend-developer` (primary)
- `ui-ux-designer`
- `css-expert`

**Reasoning:** UI creation intent detected, responsive design keywords found

---

### Example 2: Authentication
**User:** "Add JWT authentication with login and signup endpoints"

**Auto-Selected:**
- `backend-security-coder` (primary)
- `auth-specialist`
- `backend-architect`

**Reasoning:** Authentication and API keywords detected, security focus

---

### Example 3: Bug Fix
**User:** "Fix the error where the form doesn't submit"

**Auto-Selected:**
- `debugger` (primary)
- `frontend-developer`
- `code-reviewer`

**Reasoning:** Debugging intent detected, error-fixing focus

---

### Example 4: Performance
**User:** "The page is loading slowly, optimize it"

**Auto-Selected:**
- `performance-engineer` (primary)
- `frontend-developer`
- `database-optimizer`

**Reasoning:** Performance optimization intent, slow loading keywords

---

### Example 5: Testing
**User:** "Write unit tests for the authentication system"

**Auto-Selected:**
- `test-automator` (primary)
- `tdd-orchestrator`
- `backend-security-coder`

**Reasoning:** Testing intent detected, authentication context from history

## Benefits

✅ **Smarter Agent Selection**
- Context-aware decisions
- Considers project structure
- Learns from conversation

✅ **Better Results**
- Right agents for each task
- Multiple specialized perspectives
- Consistent quality

✅ **Improved UX**
- No manual selection needed
- Transparent selection process
- Shows which agents are active

✅ **Faster Development**
- No time wasted choosing agents
- Automatic optimization
- Seamless workflow

## Confidence Scoring

The system calculates confidence based on:
- **Intent Match Strength**: How many keywords matched
- **Context Relevance**: Project structure alignment
- **Pattern Clarity**: Clear vs ambiguous prompts

**Confidence Levels:**
- 90-100%: Very clear intent, strong matches
- 70-89%: Good intent detection, solid matches
- 50-69%: Moderate confidence, fallback agents added
- <50%: Low confidence, uses default project type agents

## Fallback Behavior

If automatic selection fails:
1. Uses default agents for project type
2. Logs warning in console
3. User workflow continues uninterrupted
4. No error shown to user

## Future Enhancements

Potential improvements:
- 🧠 Machine learning from user feedback
- 🔄 Agent swapping mid-conversation
- 📊 Historical pattern analysis
- 👥 Multi-agent orchestration
- 🎯 User preferences and overrides

## Testing

To test the automatic selection:

1. Go to http://localhost:3000/create
2. Select a project type
3. Enter various prompts:
   - "Create a login form" → backend-security-coder, frontend-developer
   - "Optimize database queries" → database-optimizer, performance-engineer
   - "Fix the broken API" → debugger, backend-architect
   - "Add unit tests" → test-automator, tdd-orchestrator

4. Check browser console for:
```
🤖 Automatic agent selection: {
  prompt: "Add user authentication...",
  selectedAgents: ["backend-security-coder", "auth-specialist"],
  confidence: 0.92,
  reasoning: "Detected intents: authentication..."
}
```

## Status

✅ **FULLY OPERATIONAL**
- Auto-selection active
- UI updated
- API endpoint working
- Documentation complete

The system will now intelligently select the best agents for every prompt!
