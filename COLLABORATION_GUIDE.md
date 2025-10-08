# 🤝 QuickVibe 2.0 - Collaboration Features Guide

## Overview

QuickVibe 2.0 now supports **real-time multi-user collaboration** - enabling teams to "pair vibe" together, building apps, games, and projects from idea to deployment!

## Key Features

### 1. **Real-time Collaboration**
- Multiple users can work on the same project simultaneously
- Live presence indicators show who's online
- Real-time message synchronization
- Typing indicators

### 2. **Invitation System**
- Invite collaborators via email
- Two role types:
  - **EDITOR**: Can edit, generate code, and invite others
  - **VIEWER**: Read-only access
- Invitations expire after 7 days

### 3. **Presence Awareness**
- See who's currently active in your project
- Avatar bubbles for active collaborators
- "X people online" counter
- Typing indicators

### 4. **Access Control**
- **OWNER**: Full control, can remove members
- **EDITOR**: Can edit and invite
- **VIEWER**: Read-only access

## Database Schema

### New Models Added

#### `ProjectCollaborator`
```prisma
model ProjectCollaborator {
  id            String           @id
  userId        String
  projectId     String
  role          CollaboratorRole // OWNER | EDITOR | VIEWER
  joinedAt      DateTime
  lastActiveAt  DateTime
}
```

#### `ProjectInvitation`
```prisma
model ProjectInvitation {
  id            String           @id
  senderId      String
  receiverEmail String
  receiverId    String?
  projectId     String
  role          CollaboratorRole
  status        InvitationStatus // PENDING | ACCEPTED | DECLINED | EXPIRED
  message       String?
  createdAt     DateTime
  expiresAt     DateTime?
}
```

#### `PresenceSession`
```prisma
model PresenceSession {
  id            String    @id
  userId        String
  projectId     String
  socketId      String?
  isActive      Boolean
  lastHeartbeat DateTime
  connectedAt   DateTime
}
```

## API Endpoints

### Invitation Management

#### `POST /api/collab/invite`
Send an invitation to collaborate

**Request:**
```json
{
  "projectId": "project_id",
  "receiverEmail": "user@example.com",
  "role": "EDITOR",
  "message": "Let's build together!",
  "senderId": "sender_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "invitation_id",
    "receiverEmail": "user@example.com",
    "role": "EDITOR"
  }
}
```

#### `GET /api/collab/invite?userId=xxx`
Get pending invitations for a user

**Response:**
```json
{
  "success": true,
  "invitations": [
    {
      "id": "inv_id",
      "project": { "id": "proj_id", "name": "My Project" },
      "sender": { "name": "John Doe", "email": "john@example.com" },
      "role": "EDITOR",
      "message": "Join me!",
      "createdAt": "2025-10-05T12:00:00Z"
    }
  ]
}
```

#### `POST /api/collab/respond`
Accept or decline an invitation

**Request:**
```json
{
  "invitationId": "invitation_id",
  "userId": "user_id",
  "action": "ACCEPT" // or "DECLINE"
}
```

### Member Management

#### `GET /api/collab/members?projectId=xxx`
Get all members of a project

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "OWNER",
      "joinedAt": "2025-10-05T10:00:00Z"
    }
  ]
}
```

#### `DELETE /api/collab/members?projectId=xxx&userId=xxx&requesterId=xxx`
Remove a collaborator (owner only)

## WebSocket Events

The collaboration system uses Socket.io for real-time communication.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-project` | `{ projectId, userId, userName }` | Join a project room |
| `leave-project` | `{ projectId, userId }` | Leave a project room |
| `message-sent` | `{ projectId, message }` | Broadcast new message |
| `typing-start` | `{ projectId, userId, userName }` | User started typing |
| `typing-stop` | `{ projectId, userId }` | User stopped typing |
| `heartbeat` | `{ projectId, userId }` | Keep presence alive |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `active-users` | `{ users: [...] }` | List of online users |
| `user-joined` | `{ userId, userName, socketId }` | Someone joined |
| `user-left` | `{ userId, socketId }` | Someone left |
| `message-received` | `{ message }` | New message from collaborator |
| `user-typing` | `{ userId, userName }` | Someone is typing |
| `user-stopped-typing` | `{ userId }` | Stopped typing |

## Usage Guide

### Using the Collaboration Hook

```tsx
import { useCollaboration } from '@/hooks/useCollaboration';

function MyComponent() {
  const {
    isConnected,
    activeUsers,
    typingUsers,
    broadcastMessage,
    startTyping,
    stopTyping,
    onMessageReceived
  } = useCollaboration({
    projectId: 'project_id',
    userId: 'user_id',
    userName: 'John Doe',
    enabled: true
  });

  // Listen for messages from collaborators
  useEffect(() => {
    return onMessageReceived((message) => {
      console.log('Received:', message);
      // Add message to your state
    });
  }, [onMessageReceived]);

  // Send message to collaborators
  const handleSend = () => {
    broadcastMessage({
      id: Date.now(),
      content: 'Hello team!',
      userId: 'user_id'
    });
  };

  return (
    <div>
      <PresenceIndicator
        activeUsers={activeUsers}
        typingUsers={typingUsers}
        currentUserId={userId}
      />
    </div>
  );
}
```

### Inviting Collaborators

```tsx
import InviteModal from '@/components/InviteModal';

function ProjectPage() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <button onClick={() => setShowInvite(true)}>
        Invite Collaborators
      </button>

      {showInvite && (
        <InviteModal
          projectId="project_id"
          projectName="My Awesome Project"
          userId="current_user_id"
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
```

## Server Setup

The custom server ([server.js](server.js)) integrates Socket.io with Next.js:

```bash
# Run development server with Socket.io
pnpm dev

# The server runs on http://localhost:3000
# Socket.io available at ws://localhost:3000/api/socket
```

## Testing Collaboration

1. **Start the server**: `pnpm dev`
2. **Open two browser windows** at `http://localhost:3000`
3. **Create a project** in window 1
4. **Save the project** to get a project ID
5. **Invite a collaborator** (use different email or create second user)
6. **Accept invitation** in window 2
7. **Start collaborating!** - Both windows show live presence and messages

## Architecture Highlights

### Real-time Sync Flow

```
User A types → Socket.io → Server → Socket.io → User B sees typing indicator
User A sends message → API saves to DB → Socket broadcasts → All users receive
```

### Presence Management

- Heartbeat every 30 seconds keeps sessions alive
- Auto-disconnect cleanup on tab close
- Database-backed presence tracking

### Security

- Owner-only member removal
- Role-based permissions (OWNER > EDITOR > VIEWER)
- Invitation expiration (7 days)
- Socket.io rooms prevent cross-project leaks

## Next Steps

- [ ] Add cursor position tracking
- [ ] Implement collaborative code editing
- [ ] Add voice/video calls (WebRTC)
- [ ] Project-level chat history
- [ ] @mentions and notifications
- [ ] Conflict resolution for simultaneous edits
