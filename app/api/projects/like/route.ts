import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json();

    // Check if already liked
    const existing = await prisma.projectLike.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existing) {
      // Unlike
      await prisma.projectLike.delete({
        where: { id: existing.id },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { likeCount: { decrement: 1 } },
      });

      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Project unliked',
      });
    }

    // Like
    await prisma.projectLike.create({
      data: {
        projectId,
        userId,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { likeCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      liked: true,
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
