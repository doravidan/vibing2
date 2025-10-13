import { ProjectCreationStrategy, StreamCallbacks } from './ProjectCreationStrategy';
import { ProjectType } from '@/lib/project-types';
import { Message } from '@/lib/hooks/useProjectCreation';

export class StandardCreationStrategy implements ProjectCreationStrategy {
  getEndpoint(): string {
    return '/api/agent/stream';
  }

  getName(): string {
    return 'Standard';
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
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;

      // Parse progress updates
      const progressMatches = buffer.matchAll(/__PROGRESS__(.+?)__END__/g);
      for (const match of progressMatches) {
        try {
          const progress = JSON.parse(match[1]);
          if (callbacks.onProgress) {
            callbacks.onProgress(progress.message);
          }
        } catch (e) {
          console.error('Failed to parse progress:', e);
        }
      }

      // Parse tool actions
      const toolMatches = buffer.matchAll(/__TOOL__(.+?)__END__/g);
      for (const match of toolMatches) {
        try {
          const tool = JSON.parse(match[1]);
          if (callbacks.onTool) {
            callbacks.onTool(tool.action, tool.file);
          }
        } catch (e) {
          console.error('Failed to parse tool:', e);
        }
      }

      // Parse code changes
      const changesMatch = buffer.match(/__CHANGES__(.+?)__END__/);
      if (changesMatch) {
        try {
          const changesData = JSON.parse(changesMatch[1]);
          if (callbacks.onCodeChange) {
            callbacks.onCodeChange(changesData.changes);
          }
          buffer = buffer.replace(/__CHANGES__.+?__END__/, '');
        } catch (e) {
          console.error('Failed to parse changes:', e);
        }
      }

      // Parse metrics
      const metricsMatch = buffer.match(/__METRICS__(.+?)__END__/);
      if (metricsMatch) {
        try {
          const metrics = JSON.parse(metricsMatch[1]);
          if (callbacks.onMetrics) {
            callbacks.onMetrics(metrics);
          }
          buffer = buffer.replace(/__METRICS__.+?__END__/, '');
        } catch (e) {
          console.error('Failed to parse metrics:', e);
        }
      }

      // Clean content from markers
      const cleanContent = buffer
        .replace(/__PROGRESS__.+?__END__/g, '')
        .replace(/__TOOL__.+?__END__/g, '')
        .replace(/__CHANGES__.+?__END__/g, '');

      fullContent = cleanContent;

      if (callbacks.onContent) {
        callbacks.onContent(fullContent);
      }

      // Extract code from response
      const code = this.extractCodeFromResponse(fullContent);
      if (code && callbacks.onCode) {
        callbacks.onCode(code);

        // Extract files from HTML
        const files = this.extractFilesFromHTML(code);
        if (callbacks.onFiles) {
          callbacks.onFiles(files);
        }
      }
    }
  }

  private extractCodeFromResponse(content: string): string {
    const patterns = [
      /```html\s*([\s\S]*?)```/i,
      /```jsx\s*([\s\S]*?)```/i,
      /```tsx\s*([\s\S]*?)```/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
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
