import { cleanupDatabase, createTestUser, createTestSession } from '@/__tests__/utils/test-helpers';
import { auth } from '@/auth';

// Note: This test file tests session management through NextAuth
// The actual session routes are handled by NextAuth internally

describe('Session Management', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create a session for authenticated user', async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id);

    expect(session.sessionToken).toBeDefined();
    expect(session.userId).toBe(user.id);
    expect(session.expires).toBeInstanceOf(Date);
  });

  it('should verify session token is unique', async () => {
    const user = await createTestUser();
    const session1 = await createTestSession(user.id);
    const session2 = await createTestSession(user.id);

    expect(session1.sessionToken).not.toBe(session2.sessionToken);
  });

  it('should allow multiple sessions for same user', async () => {
    const { prisma } = require('@/lib/prisma');
    const user = await createTestUser();

    await createTestSession(user.id);
    await createTestSession(user.id);

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(2);
  });

  it('should cascade delete sessions when user is deleted', async () => {
    const { prisma } = require('@/lib/prisma');
    const user = await createTestUser();
    const session = await createTestSession(user.id);

    // Delete user
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Verify session is deleted
    const deletedSession = await prisma.session.findUnique({
      where: { sessionToken: session.sessionToken },
    });

    expect(deletedSession).toBeNull();
  });

  it('should set expiration date in the future', async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id);

    const now = new Date();
    expect(session.expires.getTime()).toBeGreaterThan(now.getTime());
  });
});
