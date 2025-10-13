import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInstantDBAdmin, id } from '@/lib/instantdb';
import { SaveProjectSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('🔵 Save route POST called (InstantDB)');

  try {
    // Get session
    const session = await auth();
    console.log('🔵 Auth complete, session:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('🔴 No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('🔵 Body parsed successfully');
    } catch (e) {
      console.error('🔴 Failed to parse JSON:', e);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate request body
    const validation = validateRequest(SaveProjectSchema, body);
    if (!validation.success) {
      console.error('🔴 Validation error:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { projectId, name, description, projectType, activeAgents, currentCode, messages } = validation.data;
    console.log('🔵 Validated data:', { projectId, name, projectType, hasCode: !!currentCode });

    // Get InstantDB admin client
    const db = getInstantDBAdmin();
    let finalProjectId = projectId;

    if (projectId) {
      console.log('🔵 Updating existing project:', projectId);

      // Query existing project to verify ownership
      const result = await db.query({
        projects: {
          $: {
            where: {
              id: projectId,
              userId: session.user.id
            }
          }
        }
      });

      if (!result.projects || result.projects.length === 0) {
        console.log('🔴 Project not found or unauthorized');
        return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
      }

      // Update existing project
      await db.transact([
        db.tx.projects[projectId].update({
          name: name || 'Untitled Project',
          description: description || '',
          activeAgents: activeAgents || '[]',
          currentCode: currentCode || '',
          updatedAt: Date.now(),
        })
      ]);

      // Delete old messages
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
        const deleteTransactions = messagesResult.messages.map((msg: any) =>
          db.tx.messages[msg.id].delete()
        );
        await db.transact(deleteTransactions);
      }

      console.log('🔵 Project updated');
    } else {
      console.log('🔵 Creating new project');

      // First verify the user exists in InstantDB
      const userResult = await db.query({
        users: {
          $: {
            where: {
              id: session.user.id
            }
          }
        }
      });

      if (!userResult.users || userResult.users.length === 0) {
        console.log('🔴 User not found in InstantDB:', session.user.id);
        // Try to find user by email instead
        const emailResult = await db.query({
          users: {
            $: {
              where: {
                email: session.user.email
              }
            }
          }
        });

        if (!emailResult.users || emailResult.users.length === 0) {
          console.log('🔴 User not found by email either:', session.user.email);
          return NextResponse.json({ error: 'User not found in database. Please sign up again.' }, { status: 404 });
        }

        // Use the user ID from email lookup
        const actualUserId = emailResult.users[0].id;
        console.log('✅ Found user by email, using ID:', actualUserId);
        session.user.id = actualUserId; // Update session with correct ID
      }

      console.log('✅ User exists in InstantDB');

      // Generate new project ID
      finalProjectId = id();

      // Create new project
      await db.transact([
        db.tx.projects[finalProjectId].update({
          name: name || 'Untitled Project',
          description: description || '',
          projectType: projectType || 'website',
          activeAgents: activeAgents || '[]',
          currentCode: currentCode || '',
          visibility: 'PRIVATE',
          likes: 0,
          forks: 0,
          userId: session.user.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      ]);

      console.log('🔵 Project created:', finalProjectId);
    }

    // Save messages
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log('🔵 Saving', messages.length, 'messages');

      const messageTransactions = messages.map((msg: any) => {
        const messageId = id();
        return db.tx.messages[messageId].update({
          role: msg.role,
          content: msg.content,
          projectId: finalProjectId,
          createdAt: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
        });
      });

      await db.transact(messageTransactions);
      console.log('🔵 Messages saved');
    }

    console.log('✅ Save complete, returning response');
    return NextResponse.json({
      success: true,
      project: {
        id: finalProjectId,
        name: name || 'Untitled Project',
        userId: session.user.id,
      },
    });

  } catch (error: any) {
    console.error('🔴 SAVE ERROR:', error);
    console.error('🔴 Error message:', error.message);
    console.error('🔴 Error stack:', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Failed to save project',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}