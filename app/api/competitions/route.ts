import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET - List competitions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (category && category !== 'all') {
      where.category = category.toUpperCase().replace('-', '_');
    }

    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            votes: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      competitions: competitions.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        prompt: c.prompt,
        rules: c.rules,
        prizes: {
          first: c.firstPrize,
          second: c.secondPrize,
          third: c.thirdPrize,
        },
        timeline: {
          startDate: c.startDate,
          endDate: c.endDate,
          votingEnds: c.votingEnds,
        },
        creator: c.creator,
        stats: {
          entryCount: c._count.submissions,
          voteCount: c._count.votes,
        },
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get competitions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get competitions' },
      { status: 500 }
    );
  }
}

// POST - Create competition
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const competition = await prisma.competition.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        prompt: data.prompt,
        rules: data.rules,
        firstPrize: data.firstPrize,
        secondPrize: data.secondPrize,
        thirdPrize: data.thirdPrize,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        votingEnds: new Date(data.votingEnds),
        createdBy: data.userId,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      competition: {
        id: competition.id,
        title: competition.title,
      },
    });
  } catch (error: any) {
    console.error('Create competition error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create competition' },
      { status: 500 }
    );
  }
}
