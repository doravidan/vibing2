'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Something went wrong!</h1>
          <p className="text-white/60 mb-4">
            We encountered an unexpected error. Don't worry, your work is safe.
          </p>

          {error.message && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-mono text-red-300 break-all">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-red-400/60 mt-2">Error ID: {error.digest}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
          >
            Go to Dashboard
          </a>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <h3 className="text-white font-semibold mb-2">Need help?</h3>
          <p className="text-white/60 text-sm">
            If this problem persists, please contact support with the error ID above.
          </p>
        </div>
      </div>
    </div>
  );
}
