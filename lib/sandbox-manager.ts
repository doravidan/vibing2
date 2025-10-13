/**
 * Sandbox Manager - Daytona-like SDK without Daytona
 * Provides isolated preview environments using iframes and blob URLs
 */

export interface SandboxInfo {
  id: string;
  projectName: string;
  files: Map<string, string>;
  createdAt: Date;
  previewUrl?: string;
}

export interface FileOperation {
  path: string;
  content: string;
  language: string;
}

class SandboxManager {
  private sandboxes: Map<string, SandboxInfo> = new Map();

  /**
   * Create a new sandbox environment
   */
  async createSandbox(projectName: string): Promise<SandboxInfo> {
    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sandbox: SandboxInfo = {
      id: sandboxId,
      projectName,
      files: new Map(),
      createdAt: new Date(),
    };

    this.sandboxes.set(sandboxId, sandbox);

    return sandbox;
  }

  /**
   * Write a file to the sandbox
   */
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    sandbox.files.set(path, content);
  }

  /**
   * Read a file from the sandbox
   */
  async readFile(sandboxId: string, path: string): Promise<string | null> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    return sandbox.files.get(path) || null;
  }

  /**
   * Generate a preview HTML combining all files
   */
  async generatePreview(sandboxId: string): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    // Get index.html or create a basic one
    let html = sandbox.files.get('index.html') ||
               sandbox.files.get('src/index.html') ||
               '';

    if (!html) {
      // If no HTML file, create a basic template
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sandbox.projectName}</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;
    }

    // Inject CSS files
    const cssFiles = Array.from(sandbox.files.entries())
      .filter(([path]) => path.endsWith('.css'));

    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(([, content]) => content).join('\n\n');
      const styleTag = `<style>\n${cssContent}\n</style>`;

      // Insert before </head> or at the end
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = styleTag + html;
      }
    }

    // Inject JavaScript files
    const jsFiles = Array.from(sandbox.files.entries())
      .filter(([path]) => path.endsWith('.js') && !path.endsWith('.json'));

    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(([, content]) => content).join('\n\n');
      const scriptTag = `<script>\n${jsContent}\n</script>`;

      // Insert before </body> or at the end
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = html + scriptTag;
      }
    }

    return html;
  }

  /**
   * Get sandbox info
   */
  getSandbox(sandboxId: string): SandboxInfo | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * List all files in sandbox
   */
  listFiles(sandboxId: string): string[] {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    return Array.from(sandbox.files.keys());
  }

  /**
   * Remove a sandbox
   */
  async removeSandbox(sandboxId: string): Promise<void> {
    this.sandboxes.delete(sandboxId);
  }

  /**
   * Get all sandboxes
   */
  getAllSandboxes(): SandboxInfo[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Create a shareable URL for the sandbox (using data URI)
   */
  async createShareableUrl(sandboxId: string): Promise<string> {
    const html = await this.generatePreview(sandboxId);

    // Create a data URI (works like a shareable URL)
    const encodedHtml = encodeURIComponent(html);
    return `data:text/html;charset=utf-8,${encodedHtml}`;
  }

  /**
   * Export sandbox as ZIP-ready structure
   */
  async exportSandbox(sandboxId: string): Promise<{ [key: string]: string }> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const files: { [key: string]: string } = {};
    sandbox.files.forEach((content, path) => {
      files[path] = content;
    });

    return files;
  }
}

// Singleton instance
const sandboxManager = new SandboxManager();

export default sandboxManager;

// Helper functions for easier API
export async function createSandbox(projectName: string) {
  return sandboxManager.createSandbox(projectName);
}

export async function writeFile(sandboxId: string, path: string, content: string) {
  return sandboxManager.writeFile(sandboxId, path, content);
}

export async function generatePreview(sandboxId: string) {
  return sandboxManager.generatePreview(sandboxId);
}

export async function createShareableUrl(sandboxId: string) {
  return sandboxManager.createShareableUrl(sandboxId);
}

export async function removeSandbox(sandboxId: string) {
  return sandboxManager.removeSandbox(sandboxId);
}

export function getSandbox(sandboxId: string) {
  return sandboxManager.getSandbox(sandboxId);
}

export function listFiles(sandboxId: string) {
  return sandboxManager.listFiles(sandboxId);
}

export async function exportSandbox(sandboxId: string) {
  return sandboxManager.exportSandbox(sandboxId);
}
