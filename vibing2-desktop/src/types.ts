/**
 * Type definitions for Vibing2 Desktop App
 */

export interface ClaudeCredentials {
  api_key: string;
  email?: string;
  subscription_tier?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  source: 'keychain' | 'database' | 'none';
  email?: string;
}

export type AuthState = 'checking' | 'authenticated' | 'not-authenticated';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
