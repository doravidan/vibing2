/**
 * Agent Parser - Parses markdown files with YAML frontmatter
 * Handles agent definitions from the wshobson/agents repository
 */

export interface AgentMetadata {
  name: string;
  description: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  tools?: string[];
  category?: string;
  type?: 'agent' | 'workflow' | 'tool';
}

export interface ParsedAgent {
  metadata: AgentMetadata;
  systemPrompt: string;
  filePath: string;
  fileName: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseYAMLFrontmatter(content: string): { metadata: Partial<AgentMetadata>, body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, yamlContent, body] = match;
  const metadata: Partial<AgentMetadata> = {};

  // Parse YAML manually (simple key: value pairs)
  yamlContent.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle array values (tools)
    if (key === 'tools' && value) {
      metadata.tools = value.split(',').map(t => t.trim()).filter(Boolean);
    } else if (key === 'model') {
      const modelValue = value.toLowerCase();
      if (modelValue === 'haiku' || modelValue === 'sonnet' || modelValue === 'opus') {
        metadata.model = modelValue;
      }
    } else {
      (metadata as any)[key] = value;
    }
  });

  return { metadata, body: body.trim() };
}

/**
 * Parse an agent markdown file
 */
export function parseAgentFile(content: string, filePath: string): ParsedAgent {
  const { metadata, body } = parseYAMLFrontmatter(content);

  // Extract category from file path
  const pathParts = filePath.split('/');
  const category = pathParts.includes('workflows') ? 'workflows' :
                   pathParts.includes('tools') ? 'tools' : 'agents';

  // Determine type
  const type = category === 'workflows' ? 'workflow' :
               category === 'tools' ? 'tool' : 'agent';

  const fileName = filePath.split('/').pop() || '';

  return {
    metadata: {
      name: metadata.name || fileName.replace('.md', ''),
      description: metadata.description || '',
      model: metadata.model || 'sonnet',
      tools: metadata.tools || [],
      category,
      type,
    },
    systemPrompt: body,
    filePath,
    fileName,
  };
}

/**
 * Validate agent metadata
 */
export function validateAgentMetadata(metadata: AgentMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metadata.name) {
    errors.push('Agent name is required');
  }

  if (!metadata.description) {
    errors.push('Agent description is required');
  }

  if (metadata.model && !['haiku', 'sonnet', 'opus'].includes(metadata.model)) {
    errors.push(`Invalid model tier: ${metadata.model}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
