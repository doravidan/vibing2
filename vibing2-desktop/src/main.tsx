import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthenticationModal } from './components/AuthenticationModal';
import './styles.css';

function App() {
  const [showAuth, setShowAuth] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600">
      {/* Show Authentication Modal */}
      {showAuth && <AuthenticationModal onAuthComplete={handleAuthComplete} />}

      {/* Main App Content */}
      {isAuthenticated && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                  Welcome to Vibing2 Desktop
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Your self-contained AI development platform
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">154</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Agents</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">100%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Local</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">70%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Savings</div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Manage Authentication
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
                This is a demo interface. The actual Vibing2 app will load here after authentication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state while not authenticated */}
      {!showAuth && !isAuthenticated && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
