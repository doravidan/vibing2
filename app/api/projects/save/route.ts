import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, name, description, projectType, activeAgents, currentCode, messages } = await req.json();

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert projectType to enum format (mobile-app -> MOBILE_APP)
    const projectTypeEnum = projectType.toUpperCase().replace(/-/g, '_');

    let project;

    // Update existing project or create new one
    if (projectId) {
      // Update existing project
      project = await prisma.project.update({
        where: { id: projectId, userId: userRecord.id },
        data: {
          name: name || 'Untitled Project',
          description: description || '',
          activeAgents: JSON.stringify(activeAgents || []),
          currentCode: currentCode || '',
        },
      });

      // Delete old messages for this project
      await prisma.message.deleteMany({
        where: { projectId: project.id },
      });
    } else {
      // Create new project
      project = await prisma.project.create({
        data: {
          name: name || 'Untitled Project',
          description: description || '',
          projectType: projectTypeEnum as any,
          activeAgents: JSON.stringify(activeAgents || []),
          currentCode: currentCode || '',
          userId: userRecord.id,
        },
      });
    }

    // Save messages
    if (messages && messages.length > 0) {
      await Promise.all(
        messages.map((msg: any, index: number) =>
          prisma.message.create({
            data: {
              role: msg.role,
              content: msg.content,
              projectId: project.id,
              tokensUsed: msg.tokensUsed || 0,
              contextAtTime: msg.contextAtTime || 0,
              pfcSaved: msg.pfcSaved || 0,
            },
          })
        )
      );
    }

    // Create version only for new projects
    if (currentCode && !projectId) {
      await prisma.version.create({
        data: {
          projectId: project.id,
          versionNumber: 1,
          code: currentCode,
          description: 'Initial version',
        },
      });
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        userId: userRecord.id,
      },
    });
  } catch (error: any) {
    console.error('Save project error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save project' },
      { status: 500 }
    );
  }
}
