import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AuthStatus, ClaudeCredentials, AuthState, ToastMessage } from '../types';

interface AuthenticationModalProps {
  onAuthComplete?: () => void;
}

export const AuthenticationModal: React.FC<AuthenticationModalProps> = ({ onAuthComplete }) => {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [credentials, setCredentials] = useState<ClaudeCredentials | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setAuthState('checking');
      setError(null);

      const status = await invoke<AuthStatus>('check_claude_auth');
      setAuthStatus(status);

      if (status.authenticated) {
        // Load full credentials
        try {
          const creds = await invoke<ClaudeCredentials>('get_credentials');
          setCredentials(creds);
          setAuthState('authenticated');
          showToast('success', 'Authentication successful!');
          onAuthComplete?.();
        } catch (err) {
          console.error('Failed to load credentials:', err);
          setAuthState('not-authenticated');
        }
      } else {
        setAuthState('not-authenticated');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Failed to check authentication status');
      setAuthState('not-authenticated');
      showToast('error', 'Failed to check authentication status');
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Claude API keys start with "sk-ant-"');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      await invoke('save_api_key', {
        apiKey: apiKey.trim(),
        email: email.trim() || null,
      });

      showToast('success', 'API key validated and saved successfully!');

      // Refresh auth status
      await checkAuthStatus();

      // Clear form
      setApiKey('');
      setEmail('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      showToast('error', `Failed to save API key: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  const showToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(7);
    const toast: ToastMessage = { id, type, message };
    setToasts((prev) => [...prev, toast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getSubscriptionTierColor = (tier?: string) => {
    if (!tier) return 'bg-gray-500';
    const lowerTier = tier.toLowerCase();
    if (lowerTier.includes('pro')) return 'bg-purple-500';
    if (lowerTier.includes('team')) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (authState === 'checking') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Checking Authentication
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Looking for Claude Code credentials...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'authenticated' && credentials) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
            <div className="flex flex-col items-center space-y-6">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="text-center w-full">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Successfully Authenticated
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connected to Claude Code
                </p>

                {/* Auth Details */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  {/* Source */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Source</span>
                    <div className="flex items-center space-x-2">
                      {authStatus?.source === 'keychain' && (
                        <>
                          <svg
                            className="w-4 h-4 text-green-600 dark:text-green-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            macOS Keychain
                          </span>
                        </>
                      )}
                      {authStatus?.source === 'database' && (
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Manual Entry
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  {credentials.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {credentials.email}
                      </span>
                    </div>
                  )}

                  {/* Subscription Tier */}
                  {credentials.subscription_tier && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${getSubscriptionTierColor(
                          credentials.subscription_tier
                        )}`}
                      >
                        {credentials.subscription_tier}
                      </span>
                    </div>
                  )}

                  {/* API Key (masked) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">API Key</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {credentials.api_key.substring(0, 10)}...
                      {credentials.api_key.substring(credentials.api_key.length - 4)}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    setAuthState('not-authenticated');
                    setCredentials(null);
                    setAuthStatus(null);
                  }}
                  className="mt-6 w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  aria-label="Use different API key"
                >
                  Use Different API Key
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderToasts()}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
          <div className="flex flex-col space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Connect to Claude Code
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your Anthropic API key to get started
              </p>
            </div>

            {/* Keychain Status */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    macOS Keychain
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                  Not Found
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveApiKey();
              }}
              className="space-y-4"
            >
              {/* API Key Input */}
              <div>
                <label
                  htmlFor="api-key"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError(null);
                  }}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={isValidating}
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'api-key-error' : undefined}
                />
              </div>

              {/* Email Input (Optional) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={isValidating}
                  aria-label="Email address (optional)"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  id="api-key-error"
                  className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-shake"
                  role="alert"
                  aria-live="assertive"
                >
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isValidating}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                aria-label={isValidating ? 'Validating API key' : 'Connect to Claude Code'}
              >
                {isValidating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validating...</span>
                  </div>
                ) : (
                  'Connect to Claude Code'
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your API key is validated with Anthropic and stored securely locally
              </p>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium inline-flex items-center space-x-1 transition-colors"
              >
                <span>Get your API key from Anthropic Console</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      {renderToasts()}
    </>
  );

  function renderToasts() {
    return (
      <div
        className="fixed top-4 right-4 z-[60] space-y-2"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start space-x-3 p-4 rounded-xl shadow-lg backdrop-blur-sm animate-slideIn ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
            }`}
            role="alert"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Message */}
            <p
              className={`text-sm font-medium flex-1 ${
                toast.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : toast.type === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}
            >
              {toast.message}
            </p>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors ${
                toast.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : toast.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
              aria-label="Dismiss notification"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  }
};
