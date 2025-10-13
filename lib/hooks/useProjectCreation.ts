import { useReducer, useCallback } from 'react';
import { ProjectType } from '@/lib/project-types';

export interface Message {
  id: string;
  role: string;
  content: string;
}

export interface CodeChange {
  file: string;
  action: string;
  linesAdded?: number;
}

export interface PFCMetrics {
  tokenBalance: number;
  contextPercentage: number;
  tokensUsed: number;
  tokensSaved: number;
  plan: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProjectCreationState {
  // Project config
  projectType: ProjectType | null;
  activeAgents: string[];
  currentProjectId: string | null;
  projectName: string;

  // Chat state
  messages: Message[];
  inputValue: string;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  loadingProject: boolean;
  error: string | null;
  progressStatus: string;

  // Preview state
  previewCode: string;
  previewKey: number;
  projectFiles: ProjectFile[];

  // Metrics
  pfcMetrics: PFCMetrics;
  lastMetrics: any;
  codeChanges: CodeChange[];
  toolActions: string[];

  // Collaboration
  showInviteModal: boolean;
}

type ProjectCreationAction =
  | { type: 'SET_PROJECT_TYPE'; payload: { projectType: ProjectType; agents: string[] } }
  | { type: 'SET_ACTIVE_AGENTS'; payload: string[] }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'SET_INPUT_VALUE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LOADING_PROJECT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROGRESS_STATUS'; payload: string }
  | { type: 'SET_PREVIEW_CODE'; payload: string }
  | { type: 'REFRESH_PREVIEW' }
  | { type: 'SET_PROJECT_FILES'; payload: ProjectFile[] }
  | { type: 'SET_PFC_METRICS'; payload: Partial<PFCMetrics> }
  | { type: 'UPDATE_PFC_METRICS'; payload: { tokensUsed: number; tokensSaved: number; contextPercentage: number } }
  | { type: 'SET_LAST_METRICS'; payload: any }
  | { type: 'SET_CODE_CHANGES'; payload: CodeChange[] }
  | { type: 'ADD_TOOL_ACTION'; payload: string }
  | { type: 'CLEAR_TOOL_ACTIONS' }
  | { type: 'SET_PROJECT_ID'; payload: string }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'TOGGLE_INVITE_MODAL'; payload: boolean }
  | { type: 'LOAD_PROJECT'; payload: {
      projectId: string;
      projectName: string;
      projectType: ProjectType;
      activeAgents: string[];
      messages: Message[];
      previewCode: string;
    } }
  | { type: 'RESET_STATE' };

const initialState: ProjectCreationState = {
  projectType: null,
  activeAgents: [],
  currentProjectId: null,
  projectName: '',
  messages: [],
  inputValue: '',
  isLoading: false,
  isSaving: false,
  loadingProject: false,
  error: null,
  progressStatus: '',
  previewCode: '',
  previewKey: 0,
  projectFiles: [],
  pfcMetrics: {
    tokenBalance: 10000,
    contextPercentage: 0,
    tokensUsed: 0,
    tokensSaved: 0,
    plan: 'FREE'
  },
  lastMetrics: null,
  codeChanges: [],
  toolActions: [],
  showInviteModal: false,
};

function projectCreationReducer(
  state: ProjectCreationState,
  action: ProjectCreationAction
): ProjectCreationState {
  switch (action.type) {
    case 'SET_PROJECT_TYPE':
      return {
        ...state,
        projectType: action.payload.projectType,
        activeAgents: action.payload.agents,
      };

    case 'SET_ACTIVE_AGENTS':
      return { ...state, activeAgents: action.payload };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        ),
      };

    case 'SET_INPUT_VALUE':
      return { ...state, inputValue: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_LOADING_PROJECT':
      return { ...state, loadingProject: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_PROGRESS_STATUS':
      return { ...state, progressStatus: action.payload };

    case 'SET_PREVIEW_CODE':
      return { ...state, previewCode: action.payload };

    case 'REFRESH_PREVIEW':
      return { ...state, previewKey: state.previewKey + 1 };

    case 'SET_PROJECT_FILES':
      return { ...state, projectFiles: action.payload };

    case 'SET_PFC_METRICS':
      return { ...state, pfcMetrics: { ...state.pfcMetrics, ...action.payload } };

    case 'UPDATE_PFC_METRICS':
      return {
        ...state,
        pfcMetrics: {
          ...state.pfcMetrics,
          tokensUsed: state.pfcMetrics.tokensUsed + action.payload.tokensUsed,
          tokensSaved: state.pfcMetrics.tokensSaved + action.payload.tokensSaved,
          contextPercentage: action.payload.contextPercentage,
          tokenBalance: Math.max(0, state.pfcMetrics.tokenBalance - action.payload.tokensUsed),
        },
      };

    case 'SET_LAST_METRICS':
      return { ...state, lastMetrics: action.payload };

    case 'SET_CODE_CHANGES':
      return { ...state, codeChanges: action.payload };

    case 'ADD_TOOL_ACTION':
      return { ...state, toolActions: [...state.toolActions, action.payload] };

    case 'CLEAR_TOOL_ACTIONS':
      return { ...state, toolActions: [] };

    case 'SET_PROJECT_ID':
      return { ...state, currentProjectId: action.payload };

    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };

    case 'TOGGLE_INVITE_MODAL':
      return { ...state, showInviteModal: action.payload };

    case 'LOAD_PROJECT':
      return {
        ...state,
        currentProjectId: action.payload.projectId,
        projectName: action.payload.projectName,
        projectType: action.payload.projectType,
        activeAgents: action.payload.activeAgents,
        messages: action.payload.messages,
        previewCode: action.payload.previewCode,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

export function useProjectCreation() {
  const [state, dispatch] = useReducer(projectCreationReducer, initialState);

  const actions = {
    setProjectType: useCallback((projectType: ProjectType, agents: string[]) => {
      dispatch({ type: 'SET_PROJECT_TYPE', payload: { projectType, agents } });
    }, []),

    setActiveAgents: useCallback((agents: string[]) => {
      dispatch({ type: 'SET_ACTIVE_AGENTS', payload: agents });
    }, []),

    setMessages: useCallback((messages: Message[]) => {
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    }, []),

    addMessage: useCallback((message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []),

    updateMessage: useCallback((id: string, content: string) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { id, content } });
    }, []),

    setInputValue: useCallback((value: string) => {
      dispatch({ type: 'SET_INPUT_VALUE', payload: value });
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),

    setSaving: useCallback((saving: boolean) => {
      dispatch({ type: 'SET_SAVING', payload: saving });
    }, []),

    setLoadingProject: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING_PROJECT', payload: loading });
    }, []),

    setError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),

    setProgressStatus: useCallback((status: string) => {
      dispatch({ type: 'SET_PROGRESS_STATUS', payload: status });
    }, []),

    setPreviewCode: useCallback((code: string) => {
      dispatch({ type: 'SET_PREVIEW_CODE', payload: code });
    }, []),

    refreshPreview: useCallback(() => {
      dispatch({ type: 'REFRESH_PREVIEW' });
    }, []),

    setProjectFiles: useCallback((files: ProjectFile[]) => {
      dispatch({ type: 'SET_PROJECT_FILES', payload: files });
    }, []),

    setPFCMetrics: useCallback((metrics: Partial<PFCMetrics>) => {
      dispatch({ type: 'SET_PFC_METRICS', payload: metrics });
    }, []),

    updatePFCMetrics: useCallback((tokensUsed: number, tokensSaved: number, contextPercentage: number) => {
      dispatch({ type: 'UPDATE_PFC_METRICS', payload: { tokensUsed, tokensSaved, contextPercentage } });
    }, []),

    setLastMetrics: useCallback((metrics: any) => {
      dispatch({ type: 'SET_LAST_METRICS', payload: metrics });
    }, []),

    setCodeChanges: useCallback((changes: CodeChange[]) => {
      dispatch({ type: 'SET_CODE_CHANGES', payload: changes });
    }, []),

    addToolAction: useCallback((action: string) => {
      dispatch({ type: 'ADD_TOOL_ACTION', payload: action });
    }, []),

    clearToolActions: useCallback(() => {
      dispatch({ type: 'CLEAR_TOOL_ACTIONS' });
    }, []),

    setProjectId: useCallback((id: string) => {
      dispatch({ type: 'SET_PROJECT_ID', payload: id });
    }, []),

    setProjectName: useCallback((name: string) => {
      dispatch({ type: 'SET_PROJECT_NAME', payload: name });
    }, []),

    toggleInviteModal: useCallback((show: boolean) => {
      dispatch({ type: 'TOGGLE_INVITE_MODAL', payload: show });
    }, []),

    loadProject: useCallback((projectData: {
      projectId: string;
      projectName: string;
      projectType: ProjectType;
      activeAgents: string[];
      messages: Message[];
      previewCode: string;
    }) => {
      dispatch({ type: 'LOAD_PROJECT', payload: projectData });
    }, []),

    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []),
  };

  return { state, actions };
}
