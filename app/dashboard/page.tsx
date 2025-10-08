import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      plan: true,
      tokenBalance: true,
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  return (
    <DashboardClient
      user={{
        name: user?.name || 'User',
        email: user?.email || '',
        plan: user?.plan || 'FREE',
        tokenBalance: user?.tokenBalance || 0,
        projectCount: user?._count.projects || 0,
      }}
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        projectType: p.projectType,
        messageCount: p._count.messages,
        visibility: p.visibility,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
