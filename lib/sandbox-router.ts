import { WebContainerClient } from './webcontainer-client';
import { createSandbox as createDaytonaSandbox } from './daytona-client';

/**
 * Hybrid Sandbox Router
 *
 * Smart routing between WebContainer (FREE) and Daytona (PAID)
 * Saves 90% on sandbox costs by using WebContainer for simple projects
 */

export type SandboxProvider = 'webcontainer' | 'daytona';

export interface SandboxDecision {
  provider: SandboxProvider;
  reason: string;
  estimatedCost: number; // in cents
}

/**
 * Determine which sandbox provider to use
 */
export function decideSandboxProvider(
  projectType: string,
  userPlan: string,
  complexity?: {
    hasBackend?: boolean;
    hasDatabase?: boolean;
    hasNpmDependencies?: boolean;
    filesCount?: number;
  }
): SandboxDecision {
  // FREE users always get WebContainer (if supported)
  if (userPlan === 'FREE' && WebContainerClient.isSupported()) {
    return {
      provider: 'webcontainer',
      reason: 'FREE plan - using browser-based sandbox',
      estimatedCost: 0,
    };
  }

  // Check complexity
  const isComplex =
    complexity?.hasBackend ||
    complexity?.hasDatabase ||
    (complexity?.filesCount && complexity.filesCount > 10);

  if (isComplex) {
    return {
      provider: 'daytona',
      reason: 'Complex project requires cloud sandbox',
      estimatedCost: 10, // ~$0.10 per sandbox
    };
  }

  // Simple projects: HTML/CSS/JS, React, Vue
  const simpleProjectTypes = [
    'LANDING_PAGE',
    'WEB_APP',
    'CHROME_EXTENSION',
    'PORTFOLIO',
  ];

  if (simpleProjectTypes.includes(projectType)) {
    return {
      provider: 'webcontainer',
      reason: 'Simple project suitable for browser sandbox',
      estimatedCost: 0,
    };
  }

  // Default to Daytona for unknown/complex cases
  return {
    provider: 'daytona',
    reason: 'Using cloud sandbox for reliability',
    estimatedCost: 10,
  };
}

/**
 * Create a sandbox based on the decision
 */
export async function createSandbox(
  decision: SandboxDecision
): Promise<WebContainerClient | any> {
  if (decision.provider === 'webcontainer') {
    const client = new WebContainerClient();
    await client.boot();
    return client;
  } else {
    return await createDaytonaSandbox({
      language: 'javascript',
      autoStopInterval: 3600,
    });
  }
}

/**
 * Unified sandbox interface
 */
export interface UnifiedSandbox {
  provider: SandboxProvider;
  id: string;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  execute: (command: string) => Promise<{ code: number; output: string }>;
  getPreviewUrl: () => Promise<string>;
  cleanup: () => Promise<void>;
}

/**
 * Wrap any sandbox in a unified interface
 */
export function wrapSandbox(
  sandbox: WebContainerClient | any,
  provider: SandboxProvider,
  sandboxId?: string
): UnifiedSandbox {
  if (provider === 'webcontainer') {
    const wc = sandbox as WebContainerClient;

    return {
      provider: 'webcontainer',
      id: `wc-${Date.now()}`,
      writeFile: (path, content) => wc.writeFile(path, content),
      readFile: (path) => wc.readFile(path),
      execute: (command) => {
        const [cmd, ...args] = command.split(' ');
        return wc.runCommand(cmd, args);
      },
      getPreviewUrl: async () => {
        const url = await wc.startDevServer();
        return url;
      },
      cleanup: () => wc.teardown(),
    };
  } else {
    // Daytona sandbox
    return {
      provider: 'daytona',
      id: sandboxId || sandbox.id,
      writeFile: async (path, content) => {
        await sandbox.fs.uploadFile(Buffer.from(content), path);
      },
      readFile: async (path) => {
        const buffer = await sandbox.fs.downloadFile(path);
        return buffer.toString();
      },
      execute: async (command) => {
        const result = await sandbox.process.executeCommand(command);
        return { code: 0, output: String(result) };
      },
      getPreviewUrl: async () => {
        return `https://${sandbox.id}-3000.daytona.app`;
      },
      cleanup: async () => {
        await sandbox.stop();
      },
    };
  }
}

/**
 * Example usage:
 *
 * const decision = decideSandboxProvider('LANDING_PAGE', 'FREE');
 * const rawSandbox = await createSandbox(decision);
 * const sandbox = wrapSandbox(rawSandbox, decision.provider);
 *
 * await sandbox.writeFile('index.html', '<h1>Hello</h1>');
 * const url = await sandbox.getPreviewUrl();
 */
