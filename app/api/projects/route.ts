import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInstantDBAdmin } from '@/lib/instantdb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Fetching projects for user:', session.user.id);

    // Get InstantDB admin client
    const db = getInstantDBAdmin();

    // Query projects for the current user
    const result = await db.query({
      projects: {
        $: {
          where: {
            userId: session.user.id,
          },
          order: {
            serverCreatedAt: 'desc'
          },
          limit: 20
        }
      }
    });

    console.log('✅ Projects fetched:', result.projects.length);

    return NextResponse.json({
      success: true,
      projects: result.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        projectType: p.projectType,
        activeAgents: p.activeAgents ? JSON.parse(p.activeAgents) : [],
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('❌ List projects error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list projects' },
      { status: 500 }
    );
  }
}
