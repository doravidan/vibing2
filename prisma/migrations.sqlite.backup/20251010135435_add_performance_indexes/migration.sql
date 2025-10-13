-- CreateIndex
CREATE INDEX "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_visibility_updatedAt_idx" ON "Project"("visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "TokenUsage_userId_timestamp_idx" ON "TokenUsage"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "TokenUsage_endpoint_idx" ON "TokenUsage"("endpoint");
