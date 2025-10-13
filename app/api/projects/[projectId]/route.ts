import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInstantDBAdmin } from '@/lib/instantdb';
import { z } from 'zod';

// Allow both UUID and CUID formats for InstantDB
const idSchema = z.string().min(1);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate projectId format
    const validation = idSchema.safeParse(projectId);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Get InstantDB admin client
    const db = getInstantDBAdmin();

    // Query project with messages using InstantDB
    const result = await db.query({
      projects: {
        $: {
          where: {
            id: projectId
          }
        },
        messages: {
          $: {
            order: {
              serverCreatedAt: 'asc'
            }
          }
        }
      }
    });

    if (!result.projects || result.projects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = result.projects[0];

    // Check if user has access to this project
    if (project.userId !== session.user.id) {
      // Try by email as fallback
      const userResult = await db.query({
        users: {
          $: {
            where: {
              id: session.user.id
            }
          }
        }
      });

      const userEmail = userResult.users?.[0]?.email;
      const projectUserResult = await db.query({
        users: {
          $: {
            where: {
              id: project.userId
            }
          }
        }
      });

      const projectUserEmail = projectUserResult.users?.[0]?.email;

      if (userEmail !== projectUserEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Format activeAgents as JSON string for frontend parsing
    const projectData = {
      ...project,
      activeAgents: typeof project.activeAgents === 'string'
        ? project.activeAgents
        : JSON.stringify(project.activeAgents || []),
      createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : new Date().toISOString(),
      messages: (project.messages || []).map((msg: any) => ({
        ...msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString()
      }))
    };

    return NextResponse.json({ success: true, project: projectData });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate projectId format
    const validation = idSchema.safeParse(projectId);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Get InstantDB admin client
    const db = getInstantDBAdmin();

    // Query project first
    const result = await db.query({
      projects: {
        $: {
          where: {
            id: projectId
          }
        }
      }
    });

    if (!result.projects || result.projects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = result.projects[0];

    // Check if user owns this project
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete messages first
    const messagesResult = await db.query({
      messages: {
        $: {
          where: {
            projectId: projectId
          }
        }
      }
    });

    if (messagesResult.messages && messagesResult.messages.length > 0) {
      const deleteMessagesTxs = messagesResult.messages.map((msg: any) =>
        db.tx.messages[msg.id].delete()
      );
      await db.transact(deleteMessagesTxs);
    }

    // Delete project
    await db.transact([
      db.tx.projects[projectId].delete()
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}