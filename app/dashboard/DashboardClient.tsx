'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  projectType: string;
  messageCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  name: string;
  email: string;
  plan: string;
  tokenBalance: number;
  projectCount: number;
}

interface Props {
  user: User;
  projects: Project[];
}

export default function DashboardClient({ user, projects: initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    setDeleting(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      alert('Error deleting project');
    } finally {
      setDeleting(null);
    }
  };

  const getProjectTypeEmoji = (type: string) => {
    switch (type) {
      case 'WEBSITE': return '🌐';
      case 'MOBILE_APP': return '📱';
      case 'GAME': return '🎮';
      case 'API': return '⚡';
      case 'DASHBOARD': return '📊';
      default: return '📁';
    }
  };

  const getProjectTypeGradient = (type: string) => {
    switch (type) {
      case 'WEBSITE': return 'from-blue-500/20 to-cyan-500/20';
      case 'MOBILE_APP': return 'from-purple-500/20 to-pink-500/20';
      case 'GAME': return 'from-green-500/20 to-emerald-500/20';
      case 'API': return 'from-yellow-500/20 to-orange-500/20';
      case 'DASHBOARD': return 'from-red-500/20 to-rose-500/20';
      default: return 'from-gray-500/20 to-slate-500/20';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden relative">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header with Glassmorphism */}
      <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              QuickVibe
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/discover"
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Discover
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">{user.name}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-4 py-2 text-sm backdrop-blur-lg bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/20 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-white">Welcome back, </span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {user.name.split(' ')[0]}
            </span>
          </h1>
          <p className="text-gray-400">Continue building amazing projects with AI</p>
        </div>

        {/* Stats Cards with Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative">
              <div className="text-sm text-gray-400 mb-2">Total Projects</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {user.projectCount}
              </div>
              <div className="text-xs text-gray-500 mt-2">Active creations</div>
            </div>
          </div>

          <div className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative">
              <div className="text-sm text-gray-400 mb-2">Token Balance</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {user.tokenBalance.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-2">PFC tokens remaining</div>
            </div>
          </div>

          <div className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative">
              <div className="text-sm text-gray-400 mb-2">Current Plan</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {user.plan}
              </div>
              <div className="text-xs text-gray-500 mt-2">Subscription tier</div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your Projects</h2>
              <p className="text-gray-400 text-sm">Create and manage your AI-powered projects</p>
            </div>
            <Link
              href="/create"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg shadow-purple-500/50"
            >
              + New Project
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16 backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10">
              <div className="text-7xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No projects yet
              </h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Start your first AI-powered project now and experience the future of development
              </p>
              <Link
                href="/create"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg shadow-purple-500/50"
              >
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getProjectTypeGradient(project.projectType)} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {getProjectTypeEmoji(project.projectType)}
                        </span>
                        <div>
                          <h3 className="font-bold text-white text-lg line-clamp-1">
                            {project.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">
                            {project.visibility}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-white/10">
                      <span className="flex items-center gap-1">
                        <span>💬</span> {project.messageCount} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📅</span> {formatDate(project.updatedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/create?projectId=${project.id}`}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 text-center transition-all shadow-lg"
                      >
                        Continue →
                      </Link>
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={deleting === project.id}
                        className="px-4 py-2.5 backdrop-blur-lg bg-red-500/10 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 border border-red-500/20"
                      >
                        {deleting === project.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
