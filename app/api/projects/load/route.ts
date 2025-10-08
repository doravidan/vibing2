import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        activeAgents: JSON.parse(project.activeAgents),
        currentCode: project.currentCode,
        messages: project.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tokensUsed: m.tokensUsed,
          contextAtTime: m.contextAtTime,
          pfcSaved: m.pfcSaved,
        })),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
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
