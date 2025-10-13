import { init as initAdmin, id as instantId } from '@instantdb/admin';
import bcrypt from 'bcryptjs';

/**
 * InstantDB Admin Client Configuration
 *
 * Used for server-side operations like authentication, user management, and data mutations
 */

if (!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID) {
  throw new Error('NEXT_PUBLIC_INSTANTDB_APP_ID environment variable is required');
}

// Create admin client instance
let adminClient: ReturnType<typeof initAdmin> | null = null;

export function getInstantDBAdmin() {
  if (!adminClient) {
    adminClient = initAdmin({
      appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID!,
      // Admin token is optional - InstantDB works without it for basic operations
      ...(process.env.INSTANTDB_ADMIN_TOKEN && {
        adminToken: process.env.INSTANTDB_ADMIN_TOKEN,
      }),
    });
  }
  return adminClient;
}

// Export the ID generator for creating InstantDB IDs
export { instantId as id };

// Helper function to query users
export async function getUserByEmail(email: string) {
  const db = getInstantDBAdmin();
  const result = await db.query({ users: { $: { where: { email } } } });
  return result.users[0] || null;
}

// Helper function to create a user
export async function createInstantDBUser(data: {
  email: string;
  password: string;
  name?: string;
}) {
  const db = getInstantDBAdmin();
  const userId = instantId();

  await db.transact([
    db.tx.users[userId].update({
      email: data.email,
      password: data.password,
      name: data.name || null,
      plan: 'FREE',
      tokenBalance: 10000,
      contextUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  ]);

  return userId;
}

// Helper function to verify password
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Get user by ID
export async function getUserById(userId: string) {
  const db = getInstantDBAdmin();

  try {
    const result = await db.query({
      users: {
        $: {
          where: {
            id: userId
          }
        }
      }
    });

    return result.users[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

// Get projects by user ID
export async function getProjectsByUserId(userId: string) {
  const db = getInstantDBAdmin();

  try {
    // First try to get projects directly
    const projectsResult = await db.query({
      projects: {
        $: {
          where: {
            userId: userId
          }
        },
        messages: {}
      }
    });

    if (projectsResult.projects && projectsResult.projects.length > 0) {
      // Sort by createdAt in descending order (newest first)
      return projectsResult.projects.sort((a: any, b: any) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime;
      });
    }

    // If no projects found, try to find user by email
    const userResult = await db.query({
      users: {
        $: {
          where: {
            id: userId
          }
        }
      }
    });

    if (!userResult.users || userResult.users.length === 0) {
      console.log('User not found by ID, returning empty projects');
      return [];
    }

    // Try with user's email
    const email = userResult.users[0].email;
    const emailProjectsResult = await db.query({
      projects: {
        $: {
          where: {
            userEmail: email
          }
        },
        messages: {}
      }
    });

    if (emailProjectsResult.projects) {
      return emailProjectsResult.projects.sort((a: any, b: any) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime;
      });
    }

    return [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}
