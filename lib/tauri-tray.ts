/**
 * Tauri System Tray Integration
 *
 * Provides helper functions to interact with the system tray from the frontend.
 * This module handles tray menu updates and badge notifications.
 *
 * Usage:
 * ```typescript
 * import { updateTrayMenu, setTrayBadge, listenForProjectLoad } from '@/lib/tauri-tray';
 *
 * // Update tray menu after creating/updating a project
 * await updateTrayMenu();
 *
 * // Set notification badge
 * await setTrayBadge(5); // Shows "5" on tray icon
 *
 * // Listen for project load events from tray
 * const unlisten = await listenForProjectLoad((projectId) => {
 *   console.log('Loading project from tray:', projectId);
 *   // Handle project loading
 * });
 * ```
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Update the system tray menu with current recent projects
 *
 * Call this function whenever:
 * - A new project is created
 * - An existing project is updated
 * - A project is deleted
 *
 * This ensures the "Recent Projects" submenu stays in sync with the database.
 *
 * @returns Promise that resolves when menu is updated
 * @throws Error if not running in Tauri or update fails
 */
export async function updateTrayMenu(): Promise<void> {
  if (!isTauri()) {
    console.warn('updateTrayMenu: Not running in Tauri environment');
    return;
  }

  try {
    await invoke('update_tray_menu');
    console.log('✅ Tray menu updated successfully');
  } catch (error) {
    console.error('❌ Failed to update tray menu:', error);
    throw error;
  }
}

/**
 * Set a badge on the system tray icon (macOS only)
 *
 * Displays a notification badge on the tray icon. This is useful for:
 * - Showing unread message counts
 * - Indicating pending tasks
 * - Alerting user to important events
 *
 * Note: Badge display is platform-specific. macOS shows badges prominently,
 * other platforms may use the tooltip instead.
 *
 * @param count - Number to display on badge, or null to remove badge
 * @returns Promise that resolves when badge is set
 * @throws Error if not running in Tauri or update fails
 *
 * @example
 * // Show badge with count
 * await setTrayBadge(3);
 *
 * // Remove badge
 * await setTrayBadge(null);
 */
export async function setTrayBadge(count: number | null): Promise<void> {
  if (!isTauri()) {
    console.warn('setTrayBadge: Not running in Tauri environment');
    return;
  }

  try {
    const badge = count !== null && count > 0 ? String(count) : null;
    await invoke('set_tray_badge', { badge });
    console.log(`✅ Tray badge ${badge ? `set to ${badge}` : 'cleared'}`);
  } catch (error) {
    console.error('❌ Failed to set tray badge:', error);
    throw error;
  }
}

/**
 * Listen for project load events from the tray menu
 *
 * When a user clicks on a recent project in the tray menu,
 * a "load-project" event is emitted with the project ID.
 *
 * Use this to handle project loading from the tray.
 *
 * @param callback - Function to call when project should be loaded
 * @returns Promise<UnlistenFn> - Function to call to stop listening
 *
 * @example
 * const unlisten = await listenForProjectLoad((projectId) => {
 *   router.push(`/dashboard?project=${projectId}`);
 * });
 *
 * // Later, when component unmounts:
 * unlisten();
 */
export async function listenForProjectLoad(
  callback: (projectId: string) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    console.warn('listenForProjectLoad: Not running in Tauri environment');
    return () => {}; // Return no-op unlistener
  }

  return await listen<string>('load-project', (event) => {
    console.log('📂 Load project event from tray:', event.payload);
    callback(event.payload);
  });
}

/**
 * Tray Integration Hook for React Components
 *
 * This hook provides automatic tray integration for your React components.
 * It handles menu updates and project loading events.
 *
 * @example
 * ```tsx
 * import { useTrayIntegration } from '@/lib/tauri-tray';
 *
 * function ProjectManager() {
 *   const { updateMenu, setBadge } = useTrayIntegration((projectId) => {
 *     // Handle project load from tray
 *     loadProject(projectId);
 *   });
 *
 *   const handleSaveProject = async () => {
 *     await saveProject(projectData);
 *     await updateMenu(); // Update tray after save
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export interface TrayIntegration {
  updateMenu: () => Promise<void>;
  setBadge: (count: number | null) => Promise<void>;
  isTauriEnv: boolean;
}

/**
 * React hook for tray integration
 * Only import this in components, not in server-side code
 */
export function createUseTrayIntegration() {
  // This should only be used on the client side
  if (typeof window === 'undefined') {
    throw new Error('useTrayIntegration can only be used in client components');
  }

  return function useTrayIntegration(
    onProjectLoad?: (projectId: string) => void
  ): TrayIntegration {
    // Use React hooks here when imported in a component
    const isTauriEnv = isTauri();

    // Setup listener for project load events
    if (typeof window !== 'undefined' && onProjectLoad && isTauriEnv) {
      listenForProjectLoad(onProjectLoad).catch(console.error);
    }

    return {
      updateMenu: updateTrayMenu,
      setBadge: setTrayBadge,
      isTauriEnv,
    };
  };
}

/**
 * Auto-update tray menu after project operations
 *
 * This is a convenience wrapper that automatically updates the tray menu
 * after successful project operations.
 *
 * @param operation - Async function that performs project operation
 * @returns Result of the operation
 *
 * @example
 * const projectId = await withTrayUpdate(async () => {
 *   return await saveProject(projectData);
 * });
 */
export async function withTrayUpdate<T>(
  operation: () => Promise<T>
): Promise<T> {
  const result = await operation();

  // Update tray menu after successful operation
  if (isTauri()) {
    updateTrayMenu().catch((error) => {
      console.error('Failed to update tray menu after operation:', error);
      // Don't throw - operation succeeded, tray update is not critical
    });
  }

  return result;
}

/**
 * Initialize tray integration
 *
 * Call this once during app initialization to set up tray integration.
 * This ensures the tray menu is up-to-date when the app starts.
 *
 * @example
 * // In your _app.tsx or root layout:
 * useEffect(() => {
 *   initializeTray().catch(console.error);
 * }, []);
 */
export async function initializeTray(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await updateTrayMenu();
    console.log('✅ Tray integration initialized');
  } catch (error) {
    console.error('❌ Failed to initialize tray integration:', error);
    // Don't throw - app should still work without tray
  }
}

export default {
  isTauri,
  updateTrayMenu,
  setTrayBadge,
  listenForProjectLoad,
  withTrayUpdate,
  initializeTray,
};
