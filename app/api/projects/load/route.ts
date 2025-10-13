import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Validate projectId format
    const idSchema = z.string().cuid();
    const validation = idSchema.safeParse(projectId);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Get cursor from query params for pagination
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Query project with paginated messages
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          },
          take: limit + 1, // Fetch one extra to check if there are more
          ...(cursor && {
            cursor: {
              id: cursor
            },
            skip: 1 // Skip the cursor itself
          })
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if there are more messages (pagination)
    const hasMore = project.messages.length > limit;
    const messages = hasMore ? project.messages.slice(0, limit) : project.messages;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        activeAgents: project.activeAgents ? JSON.parse(project.activeAgents) : [],
        currentCode: project.currentCode,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Load project error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load project' },
      { status: 500 }
    );
  }
}
