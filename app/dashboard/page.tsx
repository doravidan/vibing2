import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserById, getProjectsByUserId } from '@/lib/instantdb';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const [user, projects] = await Promise.all([
    getUserById(session.user.id),
    getProjectsByUserId(session.user.id)
  ]);

  // Transform projects to match the expected format
  const projectsWithCounts = projects.map((project: any) => ({
    id: project.id,
    name: project.name || 'Untitled Project',
    description: project.description || '',
    projectType: project.projectType || 'website',
    messageCount: project.messages?.length || 0,
    visibility: project.visibility || 'PRIVATE',
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <DashboardClient
      user={{
        name: user?.name || 'User',
        email: user?.email || '',
        plan: user?.plan || 'FREE',
        tokenBalance: user?.tokenBalance || 0,
        projectCount: projects.length,
      }}
      projects={projectsWithCounts}
    />
  );
}
