-- Database Optimization Migration for vibing2 Platform
-- This migration adds performance indexes for common query patterns
-- Run after backing up your database

-- ============================================
-- User Table Indexes
-- ============================================

-- Login optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_password
ON "User"(email, password);

-- User analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_created_at
ON "User"(createdAt);

-- Plan-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_plan
ON "User"(plan);

-- ============================================
-- Account Table Indexes
-- ============================================

-- User account lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_user_id
ON "Account"(userId);

-- ============================================
-- Session Table Indexes
-- ============================================

-- User session lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_id
ON "Session"(userId);

-- Session cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_expires
ON "Session"(expires);

-- ============================================
-- VerificationToken Table Indexes
-- ============================================

-- Token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_token_expires
ON "VerificationToken"(expires);

-- ============================================
-- Project Table Indexes
-- ============================================

-- Add missing columns if they don't exist
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "likeCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "forkCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;

-- Update existing data to sync counts
UPDATE "Project" SET "likeCount" = "likes" WHERE "likeCount" = 0;
UPDATE "Project" SET "forkCount" = "forks" WHERE "forkCount" = 0;

-- User project lists with sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_user_updated
ON "Project"(userId, updatedAt DESC);

-- Popular public projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_likes
ON "Project"(visibility, "likeCount" DESC);

-- Most forked projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_forks
ON "Project"(visibility, "forkCount" DESC);

-- Trending projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_views
ON "Project"(visibility, "viewCount" DESC);

-- Recent public projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_created
ON "Project"(visibility, createdAt DESC);

-- Filtered discovery (category + visibility)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_type_updated
ON "Project"(visibility, projectType, updatedAt DESC);

-- Featured projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_featured_visibility_updated
ON "Project"("isFeatured", visibility, updatedAt DESC);

-- Name searches (using GIN for full-text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_name_gin
ON "Project" USING GIN (name gin_trgm_ops);

-- User project history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_user_created
ON "Project"(userId, createdAt DESC);

-- ============================================
-- ProjectFile Table Indexes
-- ============================================

-- Add missing columns
ALTER TABLE "ProjectFile"
ADD COLUMN IF NOT EXISTS "size" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "checksum" TEXT;

-- Composite index for file lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_file_project_path
ON "ProjectFile"(projectId, path);

-- Getting latest files
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_file_project_updated
ON "ProjectFile"(projectId, updatedAt DESC);

-- Language-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_file_language
ON "ProjectFile"(language);

-- Language-specific file queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_file_project_language
ON "ProjectFile"(projectId, language);

-- ============================================
-- Message Table Indexes
-- ============================================

-- Add cursor column for pagination
ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS "cursor" SERIAL,
ADD COLUMN IF NOT EXISTS "tokens" INTEGER DEFAULT 0;

-- Cursor-based pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_project_cursor
ON "Message"(projectId, cursor);

-- Latest messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_project_created_desc
ON "Message"(projectId, createdAt DESC);

-- Role-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_project_role_created
ON "Message"(projectId, role, createdAt);

-- ============================================
-- TokenUsage Table Indexes
-- ============================================

-- Add missing columns for analytics
ALTER TABLE "TokenUsage"
ADD COLUMN IF NOT EXISTS "projectId" TEXT,
ADD COLUMN IF NOT EXISTS "model" TEXT,
ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION DEFAULT 0;

-- Recent usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_user_timestamp_desc
ON "TokenUsage"(userId, timestamp DESC);

-- Endpoint-specific analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_user_endpoint_timestamp
ON "TokenUsage"(userId, endpoint, timestamp DESC);

-- Project-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_project
ON "TokenUsage"(projectId) WHERE projectId IS NOT NULL;

-- Time-based aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_timestamp
ON "TokenUsage"(timestamp);

-- Model usage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_model
ON "TokenUsage"(model) WHERE model IS NOT NULL;

-- ============================================
-- ProjectCollaborator Table Indexes
-- ============================================

-- User's collaborations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_collaborator_user
ON "ProjectCollaborator"(userId);

-- Role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_collaborator_project_role
ON "ProjectCollaborator"(projectId, role);

-- ============================================
-- CollaborationInvite Table Indexes
-- ============================================

-- Pending invites for a user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_invite_to_user_status
ON "CollaborationInvite"(toUserId, status);

-- Sent invites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_invite_from_user
ON "CollaborationInvite"(fromUserId);

-- Project invites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_invite_project
ON "CollaborationInvite"(projectId);

-- Invitation management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_invite_status_created
ON "CollaborationInvite"(status, createdAt);

-- ============================================
-- Create Competition Table (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS "Competition" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competition_status
ON "Competition"(status);

-- ============================================
-- Performance Statistics Tables
-- ============================================

-- Query performance tracking
CREATE TABLE IF NOT EXISTS "QueryPerformance" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    query_hash TEXT NOT NULL,
    query_text TEXT,
    execution_time_ms DOUBLE PRECISION,
    rows_returned INTEGER,
    timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_hash
ON "QueryPerformance"(query_hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_time
ON "QueryPerformance"(execution_time_ms DESC);

-- ============================================
-- Materialized Views for Analytics
-- ============================================

-- User token usage summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_token_summary AS
SELECT
    userId,
    DATE_TRUNC('day', timestamp) as usage_date,
    SUM(tokensUsed) as daily_tokens,
    SUM(contextUsed) as daily_context,
    SUM(savedTokens) as daily_saved,
    COUNT(*) as request_count,
    SUM(cost) as daily_cost
FROM "TokenUsage"
GROUP BY userId, DATE_TRUNC('day', timestamp);

CREATE UNIQUE INDEX ON user_token_summary(userId, usage_date);

-- Project statistics (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_stats AS
SELECT
    p.id as project_id,
    p.userId,
    p.projectType,
    p.visibility,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT f.id) as file_count,
    COUNT(DISTINCT c.id) as collaborator_count,
    MAX(m.createdAt) as last_message_at,
    MAX(f.updatedAt) as last_file_update
FROM "Project" p
LEFT JOIN "Message" m ON p.id = m.projectId
LEFT JOIN "ProjectFile" f ON p.id = f.projectId
LEFT JOIN "ProjectCollaborator" c ON p.id = c.projectId
GROUP BY p.id, p.userId, p.projectType, p.visibility;

CREATE UNIQUE INDEX ON project_stats(project_id);
CREATE INDEX ON project_stats(userId);

-- ============================================
-- Analyze Tables for Query Planner
-- ============================================

ANALYZE "User";
ANALYZE "Project";
ANALYZE "ProjectFile";
ANALYZE "Message";
ANALYZE "TokenUsage";
ANALYZE "ProjectCollaborator";
ANALYZE "CollaborationInvite";

-- ============================================
-- Performance Settings (adjust based on your server)
-- ============================================

-- These should be set in postgresql.conf or via ALTER SYSTEM
-- ALTER SYSTEM SET shared_buffers = '4GB';
-- ALTER SYSTEM SET effective_cache_size = '12GB';
-- ALTER SYSTEM SET maintenance_work_mem = '1GB';
-- ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage
-- ALTER SYSTEM SET effective_io_concurrency = 200;  -- For SSD
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;

-- Apply settings (requires superuser)
-- SELECT pg_reload_conf();