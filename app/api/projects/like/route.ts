import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get current project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { likes: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Toggle like (increment)
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });

    return NextResponse.json({
      success: true,
      liked: true,
      likes: updated.likes,
      message: 'Project liked',
    });
  } catch (error: any) {
    console.error('Like error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to like project' },
      { status: 500 }
    );
  }
}
