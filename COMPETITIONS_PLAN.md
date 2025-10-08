# QuickVibe 2.0 - Competitions & Public Projects Plan

## Overview

Add community-driven competitions and public project discovery to QuickVibe 2.0, enabling developers to compete, collaborate, and showcase their AI-generated creations.

## Current System (What We Have)

✅ Projects with owner + collaborators
✅ Private collaboration via invitations
✅ Project save/load functionality
✅ Real-time multi-user editing
✅ PFC token tracking
✅ User authentication (demo users)

## New Features to Add

### Part 1: Public Projects & Discovery
1. **Project Visibility Settings** (Public/Private)
2. **Project Gallery** (Discover public projects)
3. **Join Requests** (Request to collaborate on public projects)
4. **Project Preview** (View without joining)
5. **Fork/Remix** (Create copy of public project)

### Part 2: Competitions
1. **Competition Creation** (Admin/Creator feature)
2. **Category-based Challenges** (Games, Apps, Tools, etc.)
3. **Submission System** (Submit projects to competitions)
4. **Community Voting** (Rate submissions)
5. **Leaderboards** (Real-time rankings)
6. **Winner Announcements** (Auto-select based on votes)
7. **Token Rewards** (Award tokens to winners)

---

## Phase 1: Database Schema (Week 1)

### New Prisma Models

```prisma
// Extend Project model
model Project {
  // ... existing fields ...

  // NEW: Visibility
  visibility        ProjectVisibility  @default(PRIVATE)
  allowJoinRequests Boolean            @default(false)

  // NEW: Showcase
  isFeatured        Boolean            @default(false)
  viewCount         Int                @default(0)
  likeCount         Int                @default(0)
  forkCount         Int                @default(0)

  // NEW: Competition
  competitionId     String?
  competition       Competition?       @relation(fields: [competitionId], references: [id])
  submittedAt       DateTime?

  // NEW: Relations
  joinRequests      JoinRequest[]
  ratings           ProjectRating[]
  forks             ProjectFork[]
  likes             ProjectLike[]
}

enum ProjectVisibility {
  PRIVATE      // Only owner and collaborators
  PUBLIC       // Anyone can view
  UNLISTED     // Only those with link can view
}

// Join Requests for Public Projects
model JoinRequest {
  id            String    @id @default(cuid())

  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  message       String?   // Why they want to join
  status        RequestStatus  @default(PENDING)
  role          CollaboratorRole @default(VIEWER)

  createdAt     DateTime  @default(now())
  respondedAt   DateTime?
  respondedBy   String?

  @@unique([projectId, userId])
  @@index([projectId, status])
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

// Project Forks (Remix/Clone)
model ProjectFork {
  id            String    @id @default(cuid())

  originalId    String
  original      Project   @relation("OriginalProject", fields: [originalId], references: [id])

  forkId        String
  fork          Project   @relation("ForkedProject", fields: [forkId], references: [id])

  userId        String
  user          User      @relation(fields: [userId], references: [id])

  createdAt     DateTime  @default(now())

  @@index([originalId])
  @@index([userId])
}

// Competitions
model Competition {
  id            String    @id @default(cuid())

  title         String
  description   String
  category      CompetitionCategory

  // Challenge details
  prompt        String    // The challenge prompt
  rules         String    // Judging criteria

  // Prizes
  firstPrize    Int       // Tokens
  secondPrize   Int
  thirdPrize    Int

  // Timeline
  startDate     DateTime
  endDate       DateTime
  votingEnds    DateTime

  // Status
  status        CompetitionStatus  @default(DRAFT)

  // Creator
  createdBy     String
  creator       User      @relation(fields: [createdBy], references: [id])

  // Stats
  entryCount    Int       @default(0)
  voteCount     Int       @default(0)

  createdAt     DateTime  @default(now())

  // Relations
  submissions   Project[]
  votes         CompetitionVote[]

  @@index([category])
  @@index([status])
  @@index([endDate])
}

enum CompetitionCategory {
  GAME
  WEB_APP
  MOBILE_APP
  TOOL
  DASHBOARD
  CREATIVE
  AI_EXPERIMENT
}

enum CompetitionStatus {
  DRAFT
  UPCOMING
  ACTIVE
  VOTING
  COMPLETED
  CANCELLED
}

// Competition Votes
model CompetitionVote {
  id            String    @id @default(cuid())

  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)

  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId        String
  user          User      @relation(fields: [userId], references: [id])

  // Ratings (1-5 stars each)
  efficiency    Int       // Code quality
  design        Int       // UI/UX
  creativity    Int       // Innovation
  functionality Int       // Does it work well?

  comment       String?

  createdAt     DateTime  @default(now())

  @@unique([competitionId, projectId, userId])
  @@index([competitionId])
  @@index([projectId])
}

// Project Ratings (for non-competition projects)
model ProjectRating {
  id            String    @id @default(cuid())

  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId        String
  user          User      @relation(fields: [userId], references: [id])

  rating        Int       // 1-5 stars
  comment       String?

  createdAt     DateTime  @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
}

// Project Likes
model ProjectLike {
  id            String    @id @default(cuid())

  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId        String
  user          User      @relation(fields: [userId], references: [id])

  createdAt     DateTime  @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
}

// Update User model
model User {
  // ... existing fields ...

  // NEW: Community
  joinRequests      JoinRequest[]
  projectForks      ProjectFork[]
  competitionsCreated Competition[]
  votes             CompetitionVote[]
  ratings           ProjectRating[]
  likes             ProjectLike[]

  // NEW: Rewards
  tokenEarned       Int       @default(0)
  competitionsWon   Int       @default(0)
}
```

### Tasks
- [ ] T1.1: Add new enums and models to schema.prisma (1h)
- [ ] T1.2: Run migration `prisma migrate dev --name add_competitions` (5min)
- [ ] T1.3: Update Prisma client types (5min)

---

## Phase 2: Public Projects API (Week 2)

### API Endpoints

#### Project Discovery
```typescript
// GET /api/projects/discover
// Query params: category, featured, search, sort
{
  projects: [
    {
      id, name, description, projectType,
      creator: { name, email },
      stats: { views, likes, forks },
      preview: { thumbnail, description },
      submittedTo: competitionId?
    }
  ],
  pagination: { page, total, hasMore }
}
```

#### Join Requests
```typescript
// POST /api/projects/join-request
{
  projectId: string,
  userId: string,
  message: string,
  role: 'VIEWER' | 'EDITOR'
}

// GET /api/projects/join-requests?projectId=xxx
{
  requests: [
    {
      id, user, message, status, createdAt
    }
  ]
}

// POST /api/projects/join-request/respond
{
  requestId: string,
  action: 'APPROVE' | 'REJECT'
}
```

#### Fork/Remix
```typescript
// POST /api/projects/fork
{
  projectId: string,
  userId: string,
  newName?: string
}
```

#### Visibility Settings
```typescript
// PATCH /api/projects/visibility
{
  projectId: string,
  visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED',
  allowJoinRequests: boolean
}
```

### Tasks
- [ ] T2.1: Create discover API endpoint (3h)
- [ ] T2.2: Implement join request CRUD (2h)
- [ ] T2.3: Build fork/remix logic (2h)
- [ ] T2.4: Add visibility controls (1h)
- [ ] T2.5: Project like/rate endpoints (1h)

---

## Phase 3: Competition System API (Week 3)

### API Endpoints

#### Competition CRUD
```typescript
// POST /api/competitions
{
  title, description, category,
  prompt, rules,
  prizes: { first, second, third },
  startDate, endDate, votingEnds
}

// GET /api/competitions
// Query: status, category, upcoming
{
  competitions: [
    {
      id, title, category, status,
      entryCount, voteCount,
      startDate, endDate, votingEnds,
      prizes: { first, second, third }
    }
  ]
}

// GET /api/competitions/:id
{
  competition: { /* full details */ },
  submissions: [
    {
      project, creator, submittedAt,
      stats: { votes, avgRating }
    }
  ],
  userHasSubmitted: boolean,
  userHasVoted: boolean
}
```

#### Submit to Competition
```typescript
// POST /api/competitions/:id/submit
{
  projectId: string
}
```

#### Voting
```typescript
// POST /api/competitions/:id/vote
{
  projectId: string,
  ratings: {
    efficiency: 1-5,
    design: 1-5,
    creativity: 1-5,
    functionality: 1-5
  },
  comment?: string
}

// GET /api/competitions/:id/leaderboard
{
  rankings: [
    {
      rank, project, creator,
      totalScore, breakdown: { efficiency, design, ... },
      voteCount
    }
  ]
}
```

#### Winner Selection
```typescript
// POST /api/competitions/:id/finalize
// (Admin only, auto-triggered when voting ends)
{
  winners: [
    { rank: 1, projectId, userId, prize: 1000 },
    { rank: 2, projectId, userId, prize: 500 },
    { rank: 3, projectId, userId, prize: 250 }
  ]
}
```

### Tasks
- [ ] T3.1: Competition CRUD APIs (3h)
- [ ] T3.2: Submission system (2h)
- [ ] T3.3: Voting & rating logic (3h)
- [ ] T3.4: Leaderboard calculation (2h)
- [ ] T3.5: Winner selection & rewards (2h)

---

## Phase 4: UI Components (Week 4-5)

### 4.1 Project Discovery Page

**File: `app/discover/page.tsx`**

```tsx
export default function DiscoverPage() {
  const [filter, setFilter] = useState({
    category: 'all',
    sort: 'popular' // popular, recent, trending
  });

  return (
    <div>
      <FilterBar filter={filter} onChange={setFilter} />

      <ProjectGrid>
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onLike={handleLike}
            onFork={handleFork}
            onView={handleView}
          />
        ))}
      </ProjectGrid>
    </div>
  );
}
```

### 4.2 Project Card Component

```tsx
export function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <div className="thumbnail">
        <iframe srcDoc={project.preview} />
      </div>

      <div className="info">
        <h3>{project.name}</h3>
        <p>{project.description}</p>

        <div className="creator">
          <Avatar user={project.creator} />
          <span>{project.creator.name}</span>
        </div>

        <div className="stats">
          <span>👁 {project.viewCount}</span>
          <span>❤️ {project.likeCount}</span>
          <span>🍴 {project.forkCount}</span>
        </div>

        {project.competition && (
          <CompetitionBadge competition={project.competition} />
        )}
      </div>

      <div className="actions">
        <button onClick={() => onView(project.id)}>
          View Preview
        </button>
        <button onClick={() => onFork(project.id)}>
          Fork & Remix
        </button>
      </div>
    </div>
  );
}
```

### 4.3 Competition Hub

**File: `app/competitions/page.tsx`**

```tsx
export default function CompetitionsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  return (
    <div className="competitions-hub">
      <Hero>
        <h1>Build. Compete. Win Tokens!</h1>
        <p>Join AI-powered coding competitions</p>
      </Hero>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="active">Active Now</Tab>
        <Tab value="upcoming">Coming Soon</Tab>
        <Tab value="completed">Past Winners</Tab>
      </Tabs>

      <CompetitionGrid>
        {competitions.map(comp => (
          <CompetitionCard key={comp.id} competition={comp} />
        ))}
      </CompetitionGrid>
    </div>
  );
}
```

### 4.4 Competition Detail Page

**File: `app/competitions/[id]/page.tsx`**

```tsx
export default function CompetitionDetailPage({ params }) {
  const { competition, submissions, leaderboard } = useCompetition(params.id);

  return (
    <div className="competition-detail">
      <CompetitionHeader competition={competition} />

      <div className="grid grid-cols-2 gap-8">
        <div className="left-panel">
          <ChallengePrompt>{competition.prompt}</ChallengePrompt>
          <Rules>{competition.rules}</Rules>
          <PrizePool prizes={competition.prizes} />
          <Timeline competition={competition} />
        </div>

        <div className="right-panel">
          {competition.status === 'ACTIVE' && (
            <SubmitProjectButton competitionId={competition.id} />
          )}

          {competition.status === 'VOTING' && (
            <Leaderboard rankings={leaderboard} />
          )}

          <SubmissionGallery submissions={submissions} />
        </div>
      </div>
    </div>
  );
}
```

### 4.5 Voting Interface

```tsx
export function VotingCard({ submission, onVote }) {
  const [ratings, setRatings] = useState({
    efficiency: 0,
    design: 0,
    creativity: 0,
    functionality: 0
  });

  return (
    <div className="voting-card">
      <ProjectPreview project={submission.project} />

      <div className="rating-form">
        <RatingSlider
          label="⚡ Efficiency"
          value={ratings.efficiency}
          onChange={(v) => setRatings({...ratings, efficiency: v})}
        />
        <RatingSlider
          label="🎨 Design"
          value={ratings.design}
          onChange={(v) => setRatings({...ratings, design: v})}
        />
        <RatingSlider
          label="💡 Creativity"
          value={ratings.creativity}
          onChange={(v) => setRatings({...ratings, creativity: v})}
        />
        <RatingSlider
          label="✅ Functionality"
          value={ratings.functionality}
          onChange={(v) => setRatings({...ratings, functionality: v})}
        />

        <textarea placeholder="Leave a comment (optional)" />

        <button onClick={() => onVote(ratings)}>
          Submit Vote
        </button>
      </div>
    </div>
  );
}
```

### Tasks
- [ ] T4.1: Build Discover page + ProjectCard (4h)
- [ ] T4.2: Create CompetitionsPage + CompetitionCard (4h)
- [ ] T4.3: Implement CompetitionDetail page (4h)
- [ ] T4.4: Build VotingInterface (3h)
- [ ] T4.5: Add Leaderboard component (2h)
- [ ] T4.6: Project visibility settings in chat UI (2h)

---

## Phase 5: Real-time Features (Week 6)

### 5.1 Live Leaderboard Updates

**Extend WebSocket server:**

```javascript
// server.js
io.of('/competitions').on('connection', (socket) => {
  socket.on('join-competition', ({ competitionId }) => {
    socket.join(`competition:${competitionId}`);
  });

  // Broadcast when new vote submitted
  socket.on('vote-submitted', async ({ competitionId, projectId }) => {
    const updatedRankings = await calculateLeaderboard(competitionId);

    io.of('/competitions')
      .to(`competition:${competitionId}`)
      .emit('leaderboard-update', updatedRankings);
  });

  // Broadcast when new submission added
  socket.on('submission-added', async ({ competitionId, submission }) => {
    io.of('/competitions')
      .to(`competition:${competitionId}`)
      .emit('new-submission', submission);
  });
});
```

### 5.2 Live Project Views

Track who's viewing a project in real-time:

```typescript
// Show "X people viewing" indicator
socket.on('view-project', ({ projectId, userId }) => {
  socket.join(`project:${projectId}`);

  const viewers = await getActiveViewers(projectId);
  io.to(`project:${projectId}`).emit('viewers-update', viewers);
});
```

### Tasks
- [ ] T5.1: Add competition WebSocket namespace (2h)
- [ ] T5.2: Live leaderboard updates (2h)
- [ ] T5.3: Real-time viewer tracking (1h)
- [ ] T5.4: Live submission notifications (1h)

---

## Phase 6: Gamification & Rewards (Week 7)

### 6.1 Token Economy

```typescript
// lib/token-rewards.ts
export const REWARD_STRUCTURE = {
  competitions: {
    first: 1000,   // tokens
    second: 500,
    third: 250,
    participation: 50
  },
  community: {
    projectLike: 1,
    projectFork: 5,
    helpfulVote: 2
  },
  milestones: {
    first_project: 100,
    first_collaboration: 50,
    first_fork: 25,
    ten_likes: 100
  }
};

export async function awardTokens(
  userId: string,
  amount: number,
  reason: string
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenBalance: { increment: amount },
      tokenEarned: { increment: amount }
    }
  });

  await prisma.tokenTransaction.create({
    data: { userId, amount, reason }
  });
}
```

### 6.2 Achievements System

```typescript
const ACHIEVEMENTS = [
  {
    id: 'first_win',
    name: 'Champion',
    description: 'Win your first competition',
    icon: '🏆',
    reward: 500
  },
  {
    id: 'crowd_favorite',
    name: 'Crowd Favorite',
    description: 'Get 100+ likes on a project',
    icon: '⭐',
    reward: 250
  },
  // ... more achievements
];
```

### Tasks
- [ ] T6.1: Implement token reward system (2h)
- [ ] T6.2: Create achievements framework (3h)
- [ ] T6.3: Build user profile with stats (3h)
- [ ] T6.4: Add notification system (2h)

---

## Phase 7: Moderation & Safety (Week 8)

### 7.1 Content Moderation

```typescript
// Flagging system
model ProjectFlag {
  id          String @id @default(cuid())
  projectId   String
  userId      String
  reason      FlagReason
  description String?
  status      String @default('PENDING')
  createdAt   DateTime @default(now())
}

enum FlagReason {
  INAPPROPRIATE
  SPAM
  PLAGIARISM
  VIOLATION
}
```

### 7.2 Admin Tools

- Review flagged content
- Disqualify submissions
- Ban users
- Feature/unfeature projects

### Tasks
- [ ] T7.1: Add flagging system (2h)
- [ ] T7.2: Build admin dashboard (4h)
- [ ] T7.3: Implement moderation queue (2h)

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| 1 | Week 1 | Database schema, migrations |
| 2 | Week 2 | Public projects API, join requests, forks |
| 3 | Week 3 | Competition API, voting, leaderboards |
| 4-5 | Week 4-5 | UI components, pages, forms |
| 6 | Week 6 | Real-time features via WebSockets |
| 7 | Week 7 | Token rewards, achievements |
| 8 | Week 8 | Moderation tools, polish |

**Total: 8 weeks**

---

## Success Metrics

- [ ] Users can create public/private projects
- [ ] Project discovery page with search & filters
- [ ] Users can fork public projects
- [ ] Users can request to join public projects
- [ ] Competition creation & management working
- [ ] Voting system with 4 rating criteria
- [ ] Real-time leaderboard updates
- [ ] Token rewards distributed to winners
- [ ] Admin moderation tools functional

---

## Next Steps

Reply **"START PHASE 1"** to begin implementing the database schema, or let me know if you want to adjust priorities!
