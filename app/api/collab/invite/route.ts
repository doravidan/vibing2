import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Send invitation
export async function POST(req: NextRequest) {
  try {
    const { projectId, receiverEmail, role, message, senderId } = await req.json();

    // Check if sender has permission
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only owner or editors can invite
    const senderCollaboration = project.collaborators.find((c) => c.userId === senderId);
    const isOwner = project.userId === senderId;

    if (!isOwner && (!senderCollaboration || senderCollaboration.role === 'VIEWER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user exists
    const receiver = await prisma.user.findUnique({
      where: { email: receiverEmail },
    });

    // Check for existing invitation
    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        receiverEmail,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create invitation
    const invitation = await prisma.projectInvitation.create({
      data: {
        senderId,
        receiverEmail,
        receiverId: receiver?.id || null,
        projectId,
        role: role || 'EDITOR',
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        receiverEmail: invitation.receiverEmail,
        role: invitation.role,
      },
    });
  } catch (error: any) {
    console.error('Invitation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
}

// Get user's invitations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email required' }, { status: 400 });
    }

    const invitations = await prisma.projectInvitation.findMany({
      where: {
        OR: [
          { receiverId: userId || undefined },
          { receiverEmail: email || undefined },
        ],
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectType: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: any) {
    console.error('Get invitations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get invitations' }, { status: 500 });
  }
}
