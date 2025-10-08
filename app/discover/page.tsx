'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DiscoverPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: 'all', sort: 'recent' });

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filter as any);
      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            QuickVibe 2.0
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/create" className="px-4 py-2 text-gray-700 hover:text-gray-900">
              Create Project
            </Link>
            <Link href="/projects" className="px-4 py-2 text-gray-700 hover:text-gray-900">
              My Projects
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold mb-4 text-center">Discover Amazing Projects</h1>
        <p className="text-xl text-gray-600 text-center mb-8">
          Explore AI-generated creations from the community
        </p>

        {/* Filters */}
        <div className="flex gap-4 justify-center mb-12">
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="GAME">🎮 Games</option>
            <option value="WEB_APP">🌐 Web Apps</option>
            <option value="MOBILE_APP">📱 Mobile Apps</option>
            <option value="TOOL">🛠️ Tools</option>
            <option value="DASHBOARD">📊 Dashboards</option>
          </select>

          <select
            value={filter.sort}
            onChange={(e) => setFilter({ ...filter, sort: e.target.value })}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">🆕 Most Recent</option>
            <option value="popular">⭐ Most Popular</option>
            <option value="trending">🔥 Trending</option>
            <option value="forks">🍴 Most Forked</option>
          </select>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-xl text-gray-600">Loading amazing projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No projects found</h2>
            <p className="text-gray-600 mb-6">Be the first to create and share a public project!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const [currentUserId] = useState(() => `user_${Date.now()}`);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/projects/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          userId: currentUserId,
        }),
      });
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleFork = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          userId: currentUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Forked! View your fork at /create?projectId=${data.forkId}`);
        window.location.href = `/create?projectId=${data.forkId}`;
      }
    } catch (error) {
      console.error('Failed to fork:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all overflow-hidden group">
      {/* Preview */}
      <div className="h-48 bg-gray-100 relative overflow-hidden">
        <iframe
          srcDoc={project.preview.code}
          className="w-full h-full pointer-events-none scale-90 origin-top-left"
          title={project.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 line-clamp-1">{project.name}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description || 'No description'}</p>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {project.projectType.replace('_', ' ')}
          </span>
          <span className="text-gray-500">by {project.creator.name || project.creator.email}</span>
        </div>

        {/* Competition Badge */}
        {project.competition && (
          <div className="mb-4 px-3 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg">
            <div className="text-xs font-semibold text-yellow-800">
              🏆 {project.competition.title}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span className="flex items-center gap-1">
            <span>❤️</span>
            <span>{project.stats.likes}</span>
          </span>
          <span className="flex items-center gap-1">
            <span>👁</span>
            <span>{project.stats.views}</span>
          </span>
          <span className="flex items-center gap-1">
            <span>🍴</span>
            <span>{project.stats.forks}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-center text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            View
          </Link>
          <button
            onClick={handleLike}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            title="Like this project"
          >
            ❤️
          </button>
          <button
            onClick={handleFork}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            title="Fork & Remix"
          >
            🍴
          </button>
        </div>
      </div>
    </div>
  );
}
