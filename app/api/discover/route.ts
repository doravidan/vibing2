import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/discover - Browse public projects
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'recent'; // popular, recent, trending
    const featured = searchParams.get('featured') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      visibility: 'PUBLIC',
    };

    if (category && category !== 'all') {
      where.projectType = category.toUpperCase().replace('-', '_');
    }

    // Note: isFeatured field doesn't exist in schema, skip featured filtering for now
    // if (featured) {
    //   where.isFeatured = true;
    // }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case 'popular':
        orderBy = { likes: 'desc' };
        break;
      case 'trending':
        orderBy = { updatedAt: 'desc' }; // Use updatedAt as proxy for trending
        break;
      case 'forks':
        orderBy = { forks: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
              files: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        projectType: p.projectType,
        creator: {
          id: p.user.id,
          name: p.user.name || p.user.email,
          email: p.user.email,
        },
        stats: {
          views: 0, // viewCount not in schema
          likes: p.likes,
          forks: p.forks,
          messages: p._count.messages,
          files: p._count.files,
        },
        preview: {
          code: p.currentCode?.substring(0, 500) || '', // First 500 chars for thumbnail
          url: null, // previewUrl not in schema
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error: any) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
