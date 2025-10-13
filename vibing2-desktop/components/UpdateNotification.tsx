import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface UpdateStatus {
  status: 'upToDate' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error';
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloaded?: number;
  total?: number;
  percentage?: number;
  message?: string;
}

interface UpdateConfig {
  checkOnLaunch: boolean;
  launchDelay: number;
  checkIntervalHours: number;
  autoDownload: boolean;
  autoInstall: boolean;
  showNotifications: boolean;
}

export function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'upToDate' });
  const [showNotification, setShowNotification] = useState(false);
  const [config, setConfig] = useState<UpdateConfig | null>(null);
  const [currentVersion, setCurrentVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Get current version
    invoke<string>('get_app_version').then(setCurrentVersion).catch(console.error);

    // Get configuration
    invoke<UpdateConfig>('get_update_config').then(setConfig).catch(console.error);

    // Listen for update events
    const unlistenAvailable = listen<UpdateStatus>('update-available', (event) => {
      setUpdateStatus(event.payload);
      setShowNotification(true);
    });

    const unlistenDownloading = listen<UpdateStatus>('update-download-progress', (event) => {
      setUpdateStatus(event.payload);
    });

    const unlistenDownloaded = listen<UpdateStatus>('update-downloaded', (event) => {
      setUpdateStatus(event.payload);
      setShowNotification(true);
    });

    const unlistenInstalling = listen<UpdateStatus>('update-installing', (event) => {
      setUpdateStatus(event.payload);
      setInstalling(true);
    });

    const unlistenError = listen<UpdateStatus>('update-error', (event) => {
      setUpdateStatus(event.payload);
      setShowNotification(true);
    });

    const unlistenNotAvailable = listen<UpdateStatus>('update-not-available', (event) => {
      setUpdateStatus(event.payload);
    });

    return () => {
      unlistenAvailable.then((fn) => fn());
      unlistenDownloading.then((fn) => fn());
      unlistenDownloaded.then((fn) => fn());
      unlistenInstalling.then((fn) => fn());
      unlistenError.then((fn) => fn());
      unlistenNotAvailable.then((fn) => fn());
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      await invoke('check_for_updates');
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstalling(true);
    try {
      await invoke('install_update');
      // App will restart automatically after installation
    } catch (error) {
      console.error('Failed to install update:', error);
      setInstalling(false);
      setUpdateStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Installation failed',
      });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      await invoke('download_update');
    } catch (error) {
      console.error('Failed to download update:', error);
      setUpdateStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Download failed',
      });
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  // Don't show notification if disabled in config
  if (!config?.showNotifications || !showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {/* Update Available */}
      {updateStatus.status === 'available' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-blue-500 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Update Available
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Version {updateStatus.version} is ready to download
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {updateStatus.releaseNotes && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
              {updateStatus.releaseNotes}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDownloadUpdate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Download Update
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {updateStatus.status === 'downloading' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-blue-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Downloading Update
            </h3>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{updateStatus.percentage?.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateStatus.percentage || 0}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatBytes(updateStatus.downloaded || 0)} of {formatBytes(updateStatus.total || 0)}
          </p>
        </div>
      )}

      {/* Downloaded */}
      {updateStatus.status === 'downloaded' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-green-500 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Update Ready
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Version {updateStatus.version} has been downloaded
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInstallUpdate}
              disabled={installing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {installing ? 'Installing...' : 'Install & Restart'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Installing */}
      {updateStatus.status === 'installing' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-blue-500 p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Installing Update
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The app will restart automatically
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {updateStatus.status === 'error' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-500 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Update Failed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {updateStatus.message || 'An error occurred'}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCheckForUpdates}
              disabled={checking}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Try Again'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Settings Panel Component
export function UpdateSettings() {
  const [config, setConfig] = useState<UpdateConfig>({
    checkOnLaunch: true,
    launchDelay: 5,
    checkIntervalHours: 6,
    autoDownload: true,
    autoInstall: false,
    showNotifications: true,
  });
  const [currentVersion, setCurrentVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Load configuration
    invoke<UpdateConfig>('get_update_config')
      .then(setConfig)
      .catch(console.error);

    // Get current version
    invoke<string>('get_app_version')
      .then(setCurrentVersion)
      .catch(console.error);
  }, []);

  const handleSaveConfig = async () => {
    try {
      await invoke('set_update_config', { config });
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      const available = await invoke<boolean>('is_update_available');
      setUpdateAvailable(available);

      if (available) {
        await invoke('check_for_updates');
      } else {
        alert('You are running the latest version!');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      alert('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Update Settings
      </h2>

      <div className="space-y-6">
        {/* Current Version */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Version</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentVersion}
            </p>
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={checking}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Check for updates on launch</span>
            <input
              type="checkbox"
              checked={config.checkOnLaunch}
              onChange={(e) => setConfig({ ...config, checkOnLaunch: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Auto-download updates</span>
            <input
              type="checkbox"
              checked={config.autoDownload}
              onChange={(e) => setConfig({ ...config, autoDownload: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Auto-install updates</span>
            <input
              type="checkbox"
              checked={config.autoInstall}
              onChange={(e) => setConfig({ ...config, autoInstall: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Show notifications</span>
            <input
              type="checkbox"
              checked={config.showNotifications}
              onChange={(e) => setConfig({ ...config, showNotifications: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Check interval (hours)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={config.checkIntervalHours}
              onChange={(e) =>
                setConfig({ ...config, checkIntervalHours: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveConfig}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
