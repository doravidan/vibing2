import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query projects for the current user with message counts
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { messages: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });

    return NextResponse.json({
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        projectType: p.projectType,
        activeAgents: p.activeAgents ? JSON.parse(p.activeAgents) : [],
        messageCount: p._count.messages,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('List projects error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list projects' },
      { status: 500 }
    );
  }
}
