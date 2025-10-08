import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  // Redirect logged-in users to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

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
              <Link
                href="/auth/signin"
                className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/50"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-300">AI-Powered Development Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-7xl md:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Build Apps
            </span>
            <br />
            <span className="text-white">with AI Vibes</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Create stunning websites, mobile apps, and games in seconds.
            <span className="text-purple-400 font-semibold"> Save 80%+ tokens</span> with PFC protocol.
            <span className="text-pink-400 font-semibold"> Collaborate in real-time</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/signup"
              className="group px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Start Vibing
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
            <Link
              href="/discover"
              className="px-8 py-4 backdrop-blur-xl bg-white/10 text-white rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              Explore Projects
            </Link>
          </div>
        </div>

        {/* Feature Cards with Glassmorphism */}
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

        {/* Project Types Showcase */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Build Anything
            </span>
            <span className="text-white"> You Imagine</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {[
              { emoji: '🌐', label: 'Websites', color: 'from-blue-400 to-cyan-400' },
              { emoji: '📱', label: 'Mobile Apps', color: 'from-purple-400 to-pink-400' },
              { emoji: '🎮', label: 'Games', color: 'from-green-400 to-emerald-400' },
              { emoji: '⚡', label: 'APIs', color: 'from-yellow-400 to-orange-400' },
              { emoji: '📊', label: 'Dashboards', color: 'from-red-400 to-rose-400' },
            ].map((type) => (
              <div
                key={type.label}
                className="group text-center p-6 rounded-xl backdrop-blur-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-110"
              >
                <div className="text-6xl mb-3 group-hover:scale-125 transition-transform">{type.emoji}</div>
                <div className={`font-semibold bg-gradient-to-r ${type.color} bg-clip-text text-transparent`}>
                  {type.label}
                </div>
              </div>
            ))}
          </div>
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
          <Link
            href="/auth/signup"
            className="inline-block px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white rounded-xl font-bold text-xl transition-all shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
          >
            Create Free Account →
          </Link>
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
