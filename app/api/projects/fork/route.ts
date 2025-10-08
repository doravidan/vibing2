import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId, newName } = await req.json();

    // Get original project
    const original = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!original) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create fork
    const fork = await prisma.project.create({
      data: {
        name: newName || `${original.name} (Fork)`,
        description: original.description,
        projectType: original.projectType,
        activeAgents: original.activeAgents,
        currentCode: original.currentCode,
        userId,
        visibility: 'PRIVATE', // Forks start as private
      },
    });

    // Record fork relationship
    await prisma.projectFork.create({
      data: {
        originalId: projectId,
        forkId: fork.id,
        userId,
      },
    });

    // Increment fork count
    await prisma.project.update({
      where: { id: projectId },
      data: { forkCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      forkId: fork.id,
      fork: {
        id: fork.id,
        name: fork.name,
      },
    });
  } catch (error: any) {
    console.error('Fork error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fork project' },
      { status: 500 }
    );
  }
}
