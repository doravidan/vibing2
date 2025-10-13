import { WebContainer } from '@webcontainer/api';

/**
 * WebContainer Client - Browser-based sandbox
 *
 * Benefits over Daytona:
 * - 100% FREE (runs in browser)
 * - Instant startup (< 1s vs 10s)
 * - No API costs
 * - Full Node.js environment
 * - npm install support
 *
 * Use for: HTML/CSS/JS, React, Vue, simple Node apps
 * Use Daytona for: Complex builds, backend APIs, databases
 */

export interface WebContainerFile {
  directory?: {
    [key: string]: WebContainerFile;
  };
  file?: {
    contents: string;
  };
}

export class WebContainerClient {
  private container: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;

  /**
   * Boot WebContainer (call once per app lifecycle)
   */
  async boot(): Promise<WebContainer> {
    if (this.container) {
      return this.container;
    }

    if (this.bootPromise) {
      return this.bootPromise;
    }

    this.bootPromise = WebContainer.boot();
    this.container = await this.bootPromise;
    return this.container;
  }

  /**
   * Check if WebContainer is supported in this browser
   */
  static isSupported(): boolean {
    // WebContainer requires SharedArrayBuffer which needs these headers:
    // Cross-Origin-Embedder-Policy: require-corp
    // Cross-Origin-Opener-Policy: same-origin
    return typeof SharedArrayBuffer !== 'undefined';
  }

  /**
   * Mount files to the container
   */
  async mountFiles(files: Record<string, string>): Promise<void> {
    const container = await this.boot();

    // Convert flat file structure to WebContainer format
    const fileTree: WebContainerFile = {
      directory: {},
    };

    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let current = fileTree.directory!;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          current[part] = {
            file: { contents: content },
          };
        } else {
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = current[part].directory!;
        }
      }
    }

    await container.mount(fileTree);
  }

  /**
   * Write a single file
   */
  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.boot();
    await container.fs.writeFile(path, content);
  }

  /**
   * Read a file
   */
  async readFile(path: string): Promise<string> {
    const container = await this.boot();
    const content = await container.fs.readFile(path, 'utf-8');
    return content;
  }

  /**
   * Install npm dependencies
   */
  async installDependencies(): Promise<void> {
    const container = await this.boot();

    const installProcess = await container.spawn('npm', ['install']);

    return new Promise((resolve, reject) => {
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log('npm install:', data);
          },
        })
      );

      installProcess.exit.then((code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Run a command in the container
   */
  async runCommand(
    command: string,
    args: string[] = []
  ): Promise<{ code: number; output: string }> {
    const container = await this.boot();

    const process = await container.spawn(command, args);
    let output = '';

    process.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      })
    );

    const code = await process.exit;
    return { code, output };
  }

  /**
   * Start a dev server (e.g., Vite, Next.js, etc.)
   */
  async startDevServer(
    command: string = 'npm',
    args: string[] = ['run', 'dev']
  ): Promise<string> {
    const container = await this.boot();

    const serverProcess = await container.spawn(command, args);

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      container.on('server-ready', (port, url) => {
        clearTimeout(timeout);
        resolve(url);
      });

      serverProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log('Dev server:', data);
          },
        })
      );

      serverProcess.exit.then((code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Get URL for a running server
   */
  getServerUrl(port: number = 3000): string | null {
    if (!this.container) {
      return null;
    }

    // WebContainer provides preview URLs
    // Format: https://{session-id}.preview.webcontainer.io
    return `preview://localhost:${port}`;
  }

  /**
   * Cleanup container
   */
  async teardown(): Promise<void> {
    if (this.container) {
      await this.container.teardown();
      this.container = null;
      this.bootPromise = null;
    }
  }
}

/**
 * Create a simple HTML/CSS/JS project in WebContainer
 */
export async function createSimpleProject(
  html: string,
  css?: string,
  js?: string
): Promise<WebContainerClient> {
  const client = new WebContainerClient();
  await client.boot();

  const files: Record<string, string> = {
    'index.html': html,
  };

  if (css) {
    files['style.css'] = css;
  }

  if (js) {
    files['script.js'] = js;
  }

  // Add package.json for http-server
  files['package.json'] = JSON.stringify({
    name: 'webcontainer-project',
    version: '1.0.0',
    scripts: {
      dev: 'npx http-server -p 3000',
    },
  });

  await client.mountFiles(files);
  return client;
}

/**
 * Create a React project in WebContainer
 */
export async function createReactProject(
  componentCode: string
): Promise<WebContainerClient> {
  const client = new WebContainerClient();
  await client.boot();

  const files = {
    'package.json': JSON.stringify({
      name: 'react-webcontainer',
      version: '1.0.0',
      scripts: {
        dev: 'vite',
        build: 'vite build',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.3.0',
      },
    }),
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
    'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    'src/App.jsx': componentCode,
  };

  await client.mountFiles(files);
  return client;
}

/**
 * Singleton instance for the entire app
 */
let globalWebContainer: WebContainerClient | null = null;

export function getGlobalWebContainer(): WebContainerClient {
  if (!globalWebContainer) {
    globalWebContainer = new WebContainerClient();
  }
  return globalWebContainer;
}
