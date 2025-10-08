import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Get project members
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Format members list
    const members = [
      {
        id: project.user.id,
        name: project.user.name || project.user.email,
        email: project.user.email,
        role: 'OWNER',
        joinedAt: project.createdAt,
      },
      ...project.collaborators.map((collab) => ({
        id: collab.user.id,
        name: collab.user.name || collab.user.email,
        email: collab.user.email,
        role: collab.role,
        joinedAt: collab.joinedAt,
        lastActive: collab.lastActiveAt,
      })),
    ];

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error: any) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get members' }, { status: 500 });
  }
}

// Remove collaborator
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const requesterId = searchParams.get('requesterId');

    if (!projectId || !userId || !requesterId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only owner can remove members
    if (project.userId !== requesterId && userId !== requesterId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.projectCollaborator.deleteMany({
      where: {
        projectId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed',
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
