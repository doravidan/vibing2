-- Drop Claude API key fields
PRAGMA foreign_keys=OFF;

CREATE TABLE "_User_new" (
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

INSERT INTO "_User_new" SELECT id, name, email, emailVerified, password, image, plan, tokenBalance, contextUsed, createdAt, updatedAt FROM "User";
DROP TABLE "User";
ALTER TABLE "_User_new" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
