'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-white/60">Manage your QuickVibe account preferences</p>
        </div>

        {/* Account Information */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Account Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Name</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                    {session?.user?.name || 'Not set'}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-1">Email</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                    {session?.user?.email}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-1">Plan</label>
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl px-4 py-3 text-purple-400 font-semibold">
                      FREE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Usage Statistics</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">Token Balance</div>
                  <div className="text-2xl font-bold text-white">10,000</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">Context Used</div>
                  <div className="text-2xl font-bold text-white">0%</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-blue-400 text-sm">
                  ℹ️ QuickVibe uses centralized AI services. No additional API keys needed - just create and build!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <div className="text-white font-medium">Email Notifications</div>
                    <div className="text-white/60 text-sm">Receive updates about your projects</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <div className="text-white font-medium">Auto-save Projects</div>
                    <div className="text-white/60 text-sm">Automatically save progress</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
