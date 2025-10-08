-- AlterTable
ALTER TABLE "Message" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Message" ADD COLUMN "authorName" TEXT;

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverEmail" TEXT NOT NULL,
    "receiverId" TEXT,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "respondedAt" DATETIME,
    CONSTRAINT "ProjectInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectInvitation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PresenceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "socketId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cursorLine" INTEGER,
    "cursorColumn" INTEGER,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" DATETIME,
    CONSTRAINT "PresenceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PresenceSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL,
    "activeAgents" TEXT NOT NULL,
    "currentCode" TEXT NOT NULL,
    "previewUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowJoinRequests" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("activeAgents", "createdAt", "currentCode", "description", "id", "name", "previewUrl", "projectType", "updatedAt", "userId") SELECT "activeAgents", "createdAt", "currentCode", "description", "id", "name", "previewUrl", "projectType", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX "Project_isPublic_idx" ON "Project"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectCollaborator_projectId_idx" ON "ProjectCollaborator"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_userId_idx" ON "ProjectCollaborator"("userId");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_role_idx" ON "ProjectCollaborator"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCollaborator_userId_projectId_key" ON "ProjectCollaborator"("userId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectInvitation_receiverEmail_idx" ON "ProjectInvitation"("receiverEmail");

-- CreateIndex
CREATE INDEX "ProjectInvitation_receiverId_idx" ON "ProjectInvitation"("receiverId");

-- CreateIndex
CREATE INDEX "ProjectInvitation_projectId_idx" ON "ProjectInvitation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInvitation_status_idx" ON "ProjectInvitation"("status");

-- CreateIndex
CREATE INDEX "PresenceSession_projectId_isActive_idx" ON "PresenceSession"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "PresenceSession_userId_idx" ON "PresenceSession"("userId");

-- CreateIndex
CREATE INDEX "PresenceSession_socketId_idx" ON "PresenceSession"("socketId");

-- CreateIndex
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");
