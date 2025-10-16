'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import FileUpload, { UploadedFile } from '@/components/FileUpload';
import VoiceRecorder from '@/components/VoiceRecorder';

type ProjectType = 'WEBSITE' | 'MOBILE_APP' | 'GAME' | 'API' | 'DASHBOARD';

interface Project {
  id: string;
  name: string;
  projectType: string;
  createdAt: string;
}

interface HomePageProps {
  session: Session | null;
}

export default function HomePage({ session }: HomePageProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('WEBSITE');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleStartBuilding = () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter a project description');
      return;
    }

    const params = new URLSearchParams({
      type: projectType,
      prompt: prompt.trim()
    });

    router.push(`/create?${params.toString()}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
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

  return (
    <div className="min-h-screen bg-gray-950 overflow-hidden relative">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/30 via-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                QuickVibe
              </span>
            </div>
            <div className="flex items-center gap-4">
              {session?.user ? (
                <>
                  <span className="text-gray-300">{session.user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/50"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-32">
        {/* Initial Prompt Section - Always Visible */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Build Apps
              </span>
              <br />
              <span className="text-white">with AI Vibes</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Describe your project and watch it come to life in seconds
            </p>
          </div>

          <div className="max-w-3xl mx-auto backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Prompt Input */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleStartBuilding();
                }
              }}
              placeholder="Describe your project... (e.g., 'Build a tic-tac-toe game with a modern design')"
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all mb-6"
            />

            {/* Project Type Selector */}
            <div className="mb-6">
              <label className="block text-white/70 text-sm font-medium mb-3">
                Project Type
              </label>
              <div className="flex flex-wrap gap-3">
                {(['WEBSITE', 'MOBILE_APP', 'GAME', 'API', 'DASHBOARD'] as ProjectType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setProjectType(type)}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      projectType === type
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {getProjectTypeEmoji(type)} {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload and Voice Input */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach Files
              </button>
              <VoiceRecorder
                onTranscription={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)}
              />
            </div>

            {showFileUpload && (
              <div className="mb-6">
                <FileUpload
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  maxFiles={5}
                />
              </div>
            )}

            {/* Start Building Button */}
            <button
              onClick={handleStartBuilding}
              disabled={isLoading}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-600 text-white text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-purple-500/50"
            >
              {isLoading ? 'Starting...' : session?.user ? 'Start Building' : 'Sign In to Start Building'}
            </button>
            <p className="text-center text-white/40 text-sm mt-3">
              Press Ctrl+Enter to quick start
            </p>
          </div>
        </div>

        {/* Existing Projects Section */}
        {session?.user && projects.length > 0 && (
          <div className="mb-20">
            <h2 className="text-4xl font-bold mb-8">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Projects
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/create?projectId=${project.id}`)}
                  className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105 hover:border-white/20 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-5xl">{getProjectTypeEmoji(project.projectType)}</div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{project.projectType.replace('_', ' ')}</span>
                    <span className="text-white/40">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[
            {
              icon: '⚡',
              title: 'Lightning Fast',
              description: 'Build complete applications in minutes with AI-powered code generation',
              gradient: 'from-yellow-500/20 to-orange-500/20'
            },
            {
              icon: '🤝',
              title: 'Real-Time Collab',
              description: 'Invite team members and build together with live updates and sync',
              gradient: 'from-blue-500/20 to-cyan-500/20'
            },
            {
              icon: '💎',
              title: 'PFC Protocol',
              description: 'Save 80%+ on tokens with Pointer-First Context technology',
              gradient: 'from-purple-500/20 to-pink-500/20'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105 hover:border-white/20"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
              <div className="relative">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[
            { value: '10K+', label: 'Projects Created', icon: '🚀' },
            { value: '80%', label: 'Token Savings', icon: '💰' },
            { value: '5K+', label: 'Active Developers', icon: '👨‍💻' }
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all"
            >
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center backdrop-blur-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-white/20 rounded-3xl p-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-white">Ready to</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Start Vibing?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of developers creating amazing projects with AI. No credit card required.
          </p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="inline-block px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-xl font-bold text-xl transition-all shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
          >
            Create Free Account →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-xl bg-white/5 border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-500">
            <p>© 2025 QuickVibe. Built with AI vibes 💜</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
