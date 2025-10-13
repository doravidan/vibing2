/**
 * API Adapter for Web and Desktop (Tauri) environments
 *
 * This adapter automatically detects the environment and routes API calls
 * to either fetch (web) or Tauri IPC commands (desktop).
 */

// Type definitions for Tauri
interface TauriWindow {
  __TAURI__?: {
    invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
}

declare const window: TauriWindow;

/**
 * Checks if the app is running in Tauri desktop environment
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

/**
 * Maps API endpoints to Tauri IPC command names
 */
const API_TO_TAURI_MAP: Record<string, string> = {
  // Authentication
  '/api/auth/signup': 'auth_signup',
  '/api/auth/signin': 'auth_signin',
  '/api/auth/signout': 'auth_signout',

  // Projects
  '/api/projects/save': 'project_save',
  '/api/projects/load': 'project_load',
  '/api/projects/list': 'project_list',
  '/api/projects/delete': 'project_delete',
  '/api/projects/fork': 'project_fork',
  '/api/projects/like': 'project_like',

  // AI Agent
  '/api/agent/stream': 'agent_stream',
  '/api/agents/list': 'agent_list',
  '/api/agents/auto-select': 'agent_auto_select',

  // Workflows
  '/api/workflows/execute': 'workflow_execute',
  '/api/workflows/list': 'workflow_list',

  // Collaboration (requires backend or P2P)
  '/api/collab/invite': 'collab_invite',
  '/api/collab/members': 'collab_members',
  '/api/collab/respond': 'collab_respond',
};

/**
 * Converts a fetch request to Tauri IPC command
 */
function getTauriCommand(endpoint: string): string | null {
  // Remove query parameters for mapping
  const cleanEndpoint = endpoint.split('?')[0];

  // Handle dynamic routes like /api/projects/[projectId]
  for (const [apiRoute, tauriCmd] of Object.entries(API_TO_TAURI_MAP)) {
    if (cleanEndpoint === apiRoute || cleanEndpoint.startsWith(apiRoute)) {
      return tauriCmd;
    }
  }

  return null;
}

/**
 * Parses the request body based on content type
 */
async function parseRequestBody(options?: RequestInit): Promise<unknown> {
  if (!options?.body) {
    return {};
  }

  if (typeof options.body === 'string') {
    try {
      return JSON.parse(options.body);
    } catch {
      return { data: options.body };
    }
  }

  return options.body;
}

/**
 * Unified API call function that works in both web and desktop
 */
export async function apiCall<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Desktop environment - use Tauri IPC
  if (isDesktop()) {
    const command = getTauriCommand(endpoint);

    if (!command) {
      throw new Error(`No Tauri command mapping for endpoint: ${endpoint}`);
    }

    try {
      const body = await parseRequestBody(options);
      const result = await window.__TAURI__!.invoke(command, body as Record<string, unknown>);
      return result as T;
    } catch (error) {
      console.error(`Tauri IPC error for ${command}:`, error);
      throw error;
    }
  }

  // Web environment - use standard fetch
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let url = endpoint;

  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ).toString();
    url += `?${queryString}`;
  }

  return apiCall<T>(url, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(
  endpoint: string
): Promise<T> {
  return apiCall<T>(endpoint, { method: 'DELETE' });
}

/**
 * Streaming API call for AI responses
 * Returns a ReadableStream in web, and simulates streaming in Tauri
 */
export async function apiStream(
  endpoint: string,
  data?: unknown
): Promise<ReadableStream<Uint8Array>> {
  // Desktop environment - implement custom streaming via Tauri events
  if (isDesktop()) {
    // TODO: Implement Tauri event-based streaming
    throw new Error('Streaming not yet implemented for desktop. Use Tauri events.');
  }

  // Web environment - use standard fetch with streaming
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
}

/**
 * File upload helper (multipart/form-data)
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  // Desktop environment - use Tauri file system APIs
  if (isDesktop()) {
    // TODO: Implement file upload via Tauri FS APIs
    throw new Error('File upload not yet implemented for desktop');
  }

  // Web environment - use standard fetch with FormData
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Download file helper
 */
export async function apiDownload(
  endpoint: string,
  filename: string
): Promise<void> {
  // Desktop environment - use Tauri file system APIs
  if (isDesktop()) {
    // TODO: Implement file download via Tauri FS APIs
    throw new Error('File download not yet implemented for desktop');
  }

  // Web environment - trigger browser download
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Download error (${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Example usage:
 *
 * // Simple GET request
 * const projects = await apiGet<Project[]>('/api/projects/list');
 *
 * // POST with data
 * const result = await apiPost('/api/projects/save', { name: 'My Project', code: '...' });
 *
 * // Streaming response
 * const stream = await apiStream('/api/agent/stream', { prompt: 'Create a todo app' });
 *
 * // File upload
 * const formData = new FormData();
 * formData.append('file', file);
 * await apiUpload('/api/upload', formData);
 */
