-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "claudeApiKey" TEXT,
    "claudeApiKeySet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("contextUsed", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "plan", "tokenBalance", "updatedAt") SELECT "contextUsed", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "plan", "tokenBalance", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
