import { ProjectType } from '@/lib/project-types';
import { Message } from '@/lib/hooks/useProjectCreation';

export interface StreamCallbacks {
  onProgress?: (message: string) => void;
  onTool?: (action: string, file: string) => void;
  onCodeChange?: (changes: any[]) => void;
  onMetrics?: (metrics: any) => void;
  onContent?: (content: string) => void;
  onCode?: (code: string) => void;
  onFiles?: (files: Array<{ path: string; content: string }>) => void;
}

export interface ProjectCreationStrategy {
  /**
   * Generates a project based on the user's messages and project type
   */
  generate(
    messages: Message[],
    projectType: ProjectType,
    agents: string[],
    projectName: string,
    callbacks: StreamCallbacks
  ): Promise<void>;

  /**
   * Returns the API endpoint for this strategy
   */
  getEndpoint(): string;

  /**
   * Returns a display name for this strategy
   */
  getName(): string;
}
