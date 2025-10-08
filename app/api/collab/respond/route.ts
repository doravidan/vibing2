import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Accept or decline invitation
export async function POST(req: NextRequest) {
  try {
    const { invitationId, userId, action } = await req.json(); // action: 'ACCEPT' | 'DECLINE'

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
      include: {
        project: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if invitation is for this user
    if (invitation.receiverId !== userId && invitation.receiverEmail !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.projectInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    if (action === 'ACCEPT') {
      // Create collaborator
      await prisma.projectCollaborator.create({
        data: {
          userId,
          projectId: invitation.projectId,
          role: invitation.role,
        },
      });

      // Update invitation
      await prisma.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted',
        projectId: invitation.projectId,
      });
    } else if (action === 'DECLINE') {
      await prisma.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation declined',
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Respond to invitation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to respond' }, { status: 500 });
  }
}
