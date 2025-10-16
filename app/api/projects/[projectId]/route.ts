import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInstantDBAdmin } from '@/lib/instantdb';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await req.json();
    const { projectId } = await params;
    const db = getInstantDBAdmin();

    // Update project in InstantDB
    await db.transact([
      db.tx.projects[projectId].update({
        title: title || undefined,
        description: description || undefined,
        updatedAt: Date.now(),
      }),
    ]);

    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const db = getInstantDBAdmin();

    // Query project from InstantDB
    const { data } = await db.query({
      projects: {
        $: {
          where: {
            id: projectId,
          },
        },
      },
    });

    const project = data.projects?.[0];

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const db = getInstantDBAdmin();

    // Delete project from InstantDB
    await db.transact([
      db.tx.projects[projectId].delete(),
    ]);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
