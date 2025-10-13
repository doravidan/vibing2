/*
  Warnings:

  - You are about to drop the `Competition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompetitionVote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JoinRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PresenceSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectFork` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectInvitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Version` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `authorName` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `contextAtTime` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `pfcSaved` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `tokensUsed` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `allowJoinRequests` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `competitionId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `forkCount` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `likeCount` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `previewUrl` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `ProjectCollaborator` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `ProjectCollaborator` table. All the data in the column will be lost.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `competitionsWon` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionEnds` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tokenEarned` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Competition_endDate_idx";

-- DropIndex
DROP INDEX "Competition_status_idx";

-- DropIndex
DROP INDEX "Competition_category_idx";

-- DropIndex
DROP INDEX "CompetitionVote_competitionId_projectId_userId_key";

-- DropIndex
DROP INDEX "CompetitionVote_projectId_idx";

-- DropIndex
DROP INDEX "CompetitionVote_competitionId_idx";

-- DropIndex
DROP INDEX "JoinRequest_projectId_userId_key";

-- DropIndex
DROP INDEX "JoinRequest_projectId_status_idx";

-- DropIndex
DROP INDEX "PresenceSession_socketId_idx";

-- DropIndex
DROP INDEX "PresenceSession_userId_idx";

-- DropIndex
DROP INDEX "PresenceSession_projectId_isActive_idx";

-- DropIndex
DROP INDEX "ProjectFork_userId_idx";

-- DropIndex
DROP INDEX "ProjectFork_originalId_idx";

-- DropIndex
DROP INDEX "ProjectFork_forkId_key";

-- DropIndex
DROP INDEX "ProjectInvitation_status_idx";

-- DropIndex
DROP INDEX "ProjectInvitation_projectId_idx";

-- DropIndex
DROP INDEX "ProjectInvitation_receiverId_idx";

-- DropIndex
DROP INDEX "ProjectInvitation_receiverEmail_idx";

-- DropIndex
DROP INDEX "ProjectLike_projectId_userId_key";

-- DropIndex
DROP INDEX "ProjectLike_projectId_idx";

-- DropIndex
DROP INDEX "ProjectRating_projectId_userId_key";

-- DropIndex
DROP INDEX "ProjectRating_projectId_idx";

-- DropIndex
DROP INDEX "TokenUsage_timestamp_idx";

-- DropIndex
DROP INDEX "TokenUsage_userId_idx";

-- DropIndex
DROP INDEX "Version_projectId_versionNumber_key";

-- DropIndex
DROP INDEX "Version_createdAt_idx";

-- DropIndex
DROP INDEX "Version_projectId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Competition";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CompetitionVote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JoinRequest";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PresenceSession";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectFork";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectInvitation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectLike";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectRating";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Version";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollaborationInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollaborationInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollaborationInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollaborationInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("provider", "providerAccountId"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("access_token", "expires_at", "id_token", "provider", "providerAccountId", "refresh_token", "scope", "session_state", "token_type", "type", "userId") SELECT "access_token", "expires_at", "id_token", "provider", "providerAccountId", "refresh_token", "scope", "session_state", "token_type", "type", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "projectId", "role") SELECT "content", "createdAt", "id", "projectId", "role" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL,
    "activeAgents" TEXT NOT NULL DEFAULT '[]',
    "currentCode" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("activeAgents", "createdAt", "currentCode", "description", "id", "name", "projectType", "updatedAt", "userId", "visibility") SELECT "activeAgents", "createdAt", "currentCode", "description", "id", "name", "projectType", "updatedAt", "userId", "visibility" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE TABLE "new_ProjectCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectCollaborator" ("id", "projectId", "role", "userId") SELECT "id", "projectId", "role", "userId" FROM "ProjectCollaborator";
DROP TABLE "ProjectCollaborator";
ALTER TABLE "new_ProjectCollaborator" RENAME TO "ProjectCollaborator";
CREATE UNIQUE INDEX "ProjectCollaborator_projectId_userId_key" ON "ProjectCollaborator"("projectId", "userId");
CREATE TABLE "new_Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("expires", "sessionToken", "userId") SELECT "expires", "sessionToken", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "tokenBalance" INTEGER NOT NULL DEFAULT 10000,
    "contextUsed" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("contextUsed", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "plan", "tokenBalance", "updatedAt") SELECT "contextUsed", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "plan", "tokenBalance", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,

    PRIMARY KEY ("identifier", "token")
);
INSERT INTO "new_VerificationToken" ("expires", "identifier", "token") SELECT "expires", "identifier", "token" FROM "VerificationToken";
DROP TABLE "VerificationToken";
ALTER TABLE "new_VerificationToken" RENAME TO "VerificationToken";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_projectId_path_key" ON "ProjectFile"("projectId", "path");
