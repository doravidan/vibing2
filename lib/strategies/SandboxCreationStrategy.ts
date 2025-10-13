import { ProjectCreationStrategy, StreamCallbacks } from './ProjectCreationStrategy';
import { ProjectType } from '@/lib/project-types';
import { Message } from '@/lib/hooks/useProjectCreation';

export class SandboxCreationStrategy implements ProjectCreationStrategy {
  getEndpoint(): string {
    return '/api/agent/stream-daytona';
  }

  getName(): string {
    return 'Daytona Sandbox';
  }

  async generate(
    messages: Message[],
    projectType: ProjectType,
    agents: string[],
    projectName: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        projectType,
        agents,
        projectName: projectName || `project-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'progress':
                if (callbacks.onProgress) {
                  callbacks.onProgress(data.message);
                }
                break;

              case 'tool':
                if (callbacks.onTool) {
                  callbacks.onTool(data.action, data.file);
                }
                break;

              case 'code':
                if (callbacks.onCode) {
                  callbacks.onCode(data.html);
                }
                if (callbacks.onFiles) {
                  callbacks.onFiles(this.extractFilesFromHTML(data.html));
                }
                break;

              case 'complete':
                if (callbacks.onCode) {
                  callbacks.onCode(data.previewHtml);
                }
                if (callbacks.onFiles) {
                  callbacks.onFiles(this.extractFilesFromHTML(data.previewHtml));
                }
                if (callbacks.onMetrics) {
                  callbacks.onMetrics({
                    tokensUsed: data.tokensUsed || 0,
                    pfcSaved: 0,
                    contextPercentage: 0,
                    timestamp: Date.now(),
                    duration: 0,
                    inputTokens: 0,
                    outputTokens: data.tokensUsed || 0,
                  });
                }
                break;

              case 'error':
                throw new Error(data.message);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  }

  private extractFilesFromHTML(html: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // Extract CSS from <style> tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    let styleIndex = 1;
    while ((styleMatch = styleRegex.exec(html)) !== null) {
      files.push({
        path: `styles/style${styleIndex > 1 ? styleIndex : ''}.css`,
        content: styleMatch[1].trim()
      });
      styleIndex++;
    }

    // Extract JavaScript from <script> tags
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    let scriptIndex = 1;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const scriptContent = scriptMatch[1].trim();
      if (scriptContent && !scriptMatch[0].includes('src=')) {
        files.push({
          path: `scripts/app${scriptIndex > 1 ? scriptIndex : ''}.js`,
          content: scriptContent
        });
        scriptIndex++;
      }
    }

    // Add the HTML file (without inline styles and scripts)
    let cleanHTML = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Add link tags for CSS files
    if (styleIndex > 1) {
      const headCloseTag = cleanHTML.indexOf('</head>');
      if (headCloseTag !== -1) {
        const linkTags = Array.from({ length: styleIndex - 1 }, (_, i) =>
          `  <link rel="stylesheet" href="styles/style${i + 1 > 1 ? i + 1 : ''}.css">`
        ).join('\n');
        cleanHTML = cleanHTML.slice(0, headCloseTag) + linkTags + '\n' + cleanHTML.slice(headCloseTag);
      }
    }

    // Add script tags for JS files
    if (scriptIndex > 1) {
      const bodyCloseTag = cleanHTML.lastIndexOf('</body>');
      if (bodyCloseTag !== -1) {
        const scriptTags = Array.from({ length: scriptIndex - 1 }, (_, i) =>
          `  <script src="scripts/app${i + 1 > 1 ? i + 1 : ''}.js"></script>`
        ).join('\n');
        cleanHTML = cleanHTML.slice(0, bodyCloseTag) + scriptTags + '\n' + cleanHTML.slice(bodyCloseTag);
      }
    }

    files.unshift({
      path: 'index.html',
      content: cleanHTML.trim()
    });

    return files;
  }
}
