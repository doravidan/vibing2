/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Project` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "respondedBy" TEXT,
    CONSTRAINT "JoinRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalId" TEXT NOT NULL,
    "forkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectFork_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFork_forkId_fkey" FOREIGN KEY ("forkId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "firstPrize" INTEGER NOT NULL,
    "secondPrize" INTEGER NOT NULL,
    "thirdPrize" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "votingEnds" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competition_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "efficiency" INTEGER NOT NULL,
    "design" INTEGER NOT NULL,
    "creativity" INTEGER NOT NULL,
    "functionality" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionVote_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionVote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectRating_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectLike_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "allowJoinRequests" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "competitionId" TEXT,
    "submittedAt" DATETIME,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("activeAgents", "allowJoinRequests", "createdAt", "currentCode", "description", "id", "name", "previewUrl", "projectType", "updatedAt", "userId") SELECT "activeAgents", "allowJoinRequests", "createdAt", "currentCode", "description", "id", "name", "previewUrl", "projectType", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");
CREATE INDEX "Project_competitionId_idx" ON "Project"("competitionId");
CREATE INDEX "Project_isFeatured_idx" ON "Project"("isFeatured");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "tokenBalance" INTEGER NOT NULL DEFAULT 10000,
    "contextUsed" REAL NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionEnds" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tokenEarned" INTEGER NOT NULL DEFAULT 0,
    "competitionsWon" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("contextUsed", "createdAt", "email", "id", "name", "plan", "stripeCustomerId", "stripeSubscriptionId", "subscriptionEnds", "tokenBalance", "updatedAt") SELECT "contextUsed", "createdAt", "email", "id", "name", "plan", "stripeCustomerId", "stripeSubscriptionId", "subscriptionEnds", "tokenBalance", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_plan_idx" ON "User"("plan");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "JoinRequest_projectId_status_idx" ON "JoinRequest"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_projectId_userId_key" ON "JoinRequest"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFork_forkId_key" ON "ProjectFork"("forkId");

-- CreateIndex
CREATE INDEX "ProjectFork_originalId_idx" ON "ProjectFork"("originalId");

-- CreateIndex
CREATE INDEX "ProjectFork_userId_idx" ON "ProjectFork"("userId");

-- CreateIndex
CREATE INDEX "Competition_category_idx" ON "Competition"("category");

-- CreateIndex
CREATE INDEX "Competition_status_idx" ON "Competition"("status");

-- CreateIndex
CREATE INDEX "Competition_endDate_idx" ON "Competition"("endDate");

-- CreateIndex
CREATE INDEX "CompetitionVote_competitionId_idx" ON "CompetitionVote"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionVote_projectId_idx" ON "CompetitionVote"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionVote_competitionId_projectId_userId_key" ON "CompetitionVote"("competitionId", "projectId", "userId");

-- CreateIndex
CREATE INDEX "ProjectRating_projectId_idx" ON "ProjectRating"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRating_projectId_userId_key" ON "ProjectRating"("projectId", "userId");

-- CreateIndex
CREATE INDEX "ProjectLike_projectId_idx" ON "ProjectLike"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLike_projectId_userId_key" ON "ProjectLike"("projectId", "userId");
