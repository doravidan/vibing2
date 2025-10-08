import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const projects = userId
      ? await prisma.project.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: { messages: true },
            },
          },
        })
      : await prisma.project.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 20,
          include: {
            _count: {
              select: { messages: true },
            },
          },
        });

    return NextResponse.json({
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        projectType: p.projectType,
        activeAgents: JSON.parse(p.activeAgents),
        messageCount: p._count.messages,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
