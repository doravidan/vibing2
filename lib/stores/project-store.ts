import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Project Store - Global state management with Zustand
 *
 * Replaces the messy 9 useState hooks in create page
 * Provides single source of truth for project state
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface ProjectState {
  // Core state
  projectId: string | null;
  projectType: string | null;
  messages: Message[];
  projectFiles: ProjectFile[];
  activeAgents: string[];

  // UI state
  isLoading: boolean;
  error: string | null;
  progress: string;

  // Sandbox state
  sandboxId: string | null;
  sandboxProvider: 'webcontainer' | 'daytona' | null;
  previewUrl: string | null;
  previewCode: string | null;

  // Actions
  setProjectId: (id: string | null) => void;
  setProjectType: (type: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
  setActiveAgents: (agents: string[]) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: string) => void;

  setSandboxId: (id: string | null) => void;
  setSandboxProvider: (provider: 'webcontainer' | 'daytona' | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setPreviewCode: (code: string | null) => void;

  reset: () => void;
}

const initialState = {
  projectId: null,
  projectType: null,
  messages: [],
  projectFiles: [],
  activeAgents: [],
  isLoading: false,
  error: null,
  progress: '',
  sandboxId: null,
  sandboxProvider: null,
  previewUrl: null,
  previewCode: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,

      // Setters
      setProjectId: (id) => set({ projectId: id }),
      setProjectType: (type) => set({ projectType: type }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setMessages: (messages) => set({ messages }),
      setProjectFiles: (files) => set({ projectFiles: files }),
      setActiveAgents: (agents) => set({ activeAgents: agents }),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setProgress: (progress) => set({ progress }),

      setSandboxId: (id) => set({ sandboxId: id }),
      setSandboxProvider: (provider) => set({ sandboxProvider: provider }),
      setPreviewUrl: (url) => set({ previewUrl: url }),
      setPreviewCode: (code) => set({ previewCode: code }),

      reset: () => set(initialState),
    }),
    {
      name: 'project-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        projectId: state.projectId,
        projectType: state.projectType,
        messages: state.messages,
        projectFiles: state.projectFiles,
        activeAgents: state.activeAgents,
        previewUrl: state.previewUrl,
      }),
    }
  )
);

/**
 * Selectors for optimized re-renders
 */
export const useMessages = () => useProjectStore((state) => state.messages);
export const useIsLoading = () => useProjectStore((state) => state.isLoading);
export const useError = () => useProjectStore((state) => state.error);
export const useProgress = () => useProjectStore((state) => state.progress);
export const usePreviewUrl = () => useProjectStore((state) => state.previewUrl);
export const useSandboxInfo = () =>
  useProjectStore((state) => ({
    sandboxId: state.sandboxId,
    provider: state.sandboxProvider,
  }));
