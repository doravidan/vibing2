import { Daytona } from '@daytonaio/sdk';

// Initialize Daytona client with API key
export function getDaytonaClient() {
  const apiKey = process.env.DAYTONA_API_KEY;

  if (!apiKey) {
    throw new Error('DAYTONA_API_KEY environment variable is not set');
  }

  return new Daytona({
    apiKey,
    baseUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
  });
}

/**
 * Create a new sandbox for running code
 */
export async function createSandbox(options?: {
  language?: string;
  autoStopInterval?: number;
}) {
  const daytona = getDaytonaClient();

  const sandbox = await daytona.create({
    language: options?.language || 'javascript', // Supported: python, typescript, javascript
    autoStopInterval: options?.autoStopInterval || 3600, // 1 hour default
  });

  return sandbox;
}

/**
 * Write a file to the sandbox
 */
export async function writeFileToSandbox(
  sandbox: { fs: { uploadFile: (buffer: Buffer, path: string) => Promise<void> } },
  filePath: string,
  content: string
) {
  await sandbox.fs.uploadFile(Buffer.from(content), filePath);
}

/**
 * Read a file from the sandbox
 */
export async function readFileFromSandbox(
  sandbox: { fs: { downloadFile: (path: string) => Promise<Buffer> } },
  filePath: string
): Promise<string> {
  const content = await sandbox.fs.downloadFile(filePath);
  return content.toString();
}

/**
 * Execute code in the sandbox
 */
export async function executeInSandbox(
  sandbox: { process: { codeRun: (code: string, params?: { env?: Record<string, string>; argv?: string[] }, timeout?: number) => Promise<unknown> } },
  code: string,
  options?: {
    language?: string;
    timeout?: number;
  }
) {
  const result = await sandbox.process.codeRun(code, undefined, options?.timeout || 30);

  return result;
}

/**
 * Start an HTTP server in the sandbox
 */
export async function startServerInSandbox(
  sandbox: { id: string; process: { executeCommand: (command: string) => Promise<unknown> } },
  port: number = 3000
) {
  // Start HTTP server in background
  await sandbox.process.executeCommand(`npx http-server -p ${port} &`);

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get the preview URL (Daytona format: sandbox-id-port.daytona.app)
  const previewUrl = `https://${sandbox.id}-${port}.daytona.app`;

  return previewUrl;
}

/**
 * Delete a sandbox
 */
export async function deleteSandbox(sandboxId: string) {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  await sandbox.stop();
}

/**
 * Get sandbox info
 */
export async function getSandboxInfo(sandboxId: string) {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  return sandbox;
}

/**
 * List all sandboxes
 */
export async function listSandboxes() {
  const daytona = getDaytonaClient();
  const sandboxes = await daytona.list();
  return sandboxes;
}
