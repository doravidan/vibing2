'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROJECT_TYPES } from '@/lib/project-types';

interface Project {
  id: string;
  name: string;
  description: string;
  projectType: string;
  activeAgents: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects/list');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectTypeIcon = (type: string) => {
    const config = PROJECT_TYPES.find((t) => t.id === type.toLowerCase().replace('_', '-'));
    return config?.icon || '📁';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              QuickVibe 2.0
            </h1>
            <p className="text-sm text-gray-600 mt-1">Your Projects</p>
          </div>
          <Link
            href="/create"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            + New Project
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No projects yet</h2>
            <p className="text-gray-600 mb-8">Create your first project to get started</p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                All Projects ({projects.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/create?projectId=${project.id}`}
                  className="group bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{getProjectTypeIcon(project.projectType)}</div>
                    <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      {project.projectType.replace('_', ' ')}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {project.name}
                  </h3>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {project.description || 'No description'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.activeAgents.slice(0, 3).map((agent, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full"
                      >
                        {agent.replace('-', ' ')}
                      </span>
                    ))}
                    {project.activeAgents.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        +{project.activeAgents.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                    <span>{project.messageCount} messages</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
