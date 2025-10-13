import prisma from '@/lib/db';

export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileOperation {
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  language?: string;
  search?: string;
  replace?: string;
}

/**
 * Get all files for a project
 */
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { path: 'asc' },
  });

  return files;
}

/**
 * Get a single file by path
 */
export async function getFile(projectId: string, path: string): Promise<ProjectFile | null> {
  const file = await prisma.projectFile.findUnique({
    where: {
      projectId_path: {
        projectId,
        path,
      },
    },
  });

  return file;
}

/**
 * Create a new file
 */
export async function createFile(
  projectId: string,
  path: string,
  content: string,
  language: string
): Promise<ProjectFile> {
  const file = await prisma.projectFile.create({
    data: {
      projectId,
      path,
      content,
      language,
    },
  });

  return file;
}

/**
 * Update an existing file
 */
export async function updateFile(
  projectId: string,
  path: string,
  content: string
): Promise<ProjectFile> {
  const file = await prisma.projectFile.update({
    where: {
      projectId_path: {
        projectId,
        path,
      },
    },
    data: {
      content,
      updatedAt: new Date(),
    },
  });

  return file;
}

/**
 * Update a file using search/replace
 */
export async function updateFileWithReplace(
  projectId: string,
  path: string,
  search: string,
  replace: string
): Promise<{ success: boolean; file?: ProjectFile; error?: string }> {
  const existingFile = await getFile(projectId, path);

  if (!existingFile) {
    return { success: false, error: `File not found: ${path}` };
  }

  const searchCount = (existingFile.content.match(new RegExp(escapeRegExp(search), 'g')) || []).length;

  if (searchCount === 0) {
    return { success: false, error: `Search string not found in ${path}` };
  }

  if (searchCount > 1) {
    return { success: false, error: `Search string found ${searchCount} times in ${path}. Please be more specific.` };
  }

  const newContent = existingFile.content.replace(search, replace);

  const updatedFile = await updateFile(projectId, path, newContent);

  return { success: true, file: updatedFile };
}

/**
 * Delete a file
 */
export async function deleteFile(projectId: string, path: string): Promise<void> {
  await prisma.projectFile.delete({
    where: {
      projectId_path: {
        projectId,
        path,
      },
    },
  });
}

/**
 * Apply multiple file operations atomically using Prisma transaction
 * All operations succeed together or fail together (no partial updates)
 */
export async function applyFileOperations(
  projectId: string,
  operations: FileOperation[]
): Promise<{
  success: boolean;
  files: ProjectFile[];
  errors: string[];
}> {
  const files: ProjectFile[] = [];
  const errors: string[] = [];

  try {
    // Execute all operations within a single transaction
    await prisma.$transaction(async (tx) => {
      for (const op of operations) {
        switch (op.type) {
          case 'create':
            if (!op.content || !op.language) {
              throw new Error(`Create operation missing content or language for ${op.path}`);
            }

            // Check if file already exists
            const existing = await tx.projectFile.findUnique({
              where: {
                projectId_path: {
                  projectId,
                  path: op.path,
                },
              },
            });

            if (existing) {
              // Update instead of create
              const updated = await tx.projectFile.update({
                where: {
                  projectId_path: {
                    projectId,
                    path: op.path,
                  },
                },
                data: {
                  content: op.content,
                  updatedAt: new Date(),
                },
              });
              files.push(updated);
            } else {
              // Create new file
              const created = await tx.projectFile.create({
                data: {
                  projectId,
                  path: op.path,
                  content: op.content,
                  language: op.language,
                },
              });
              files.push(created);
            }
            break;

          case 'update':
            if (op.search && op.replace) {
              // Search and replace operation
              const file = await tx.projectFile.findUnique({
                where: {
                  projectId_path: {
                    projectId,
                    path: op.path,
                  },
                },
              });

              if (!file) {
                throw new Error(`File not found: ${op.path}`);
              }

              const newContent = file.content.replace(
                new RegExp(op.search, 'g'),
                op.replace
              );

              const updated = await tx.projectFile.update({
                where: {
                  projectId_path: {
                    projectId,
                    path: op.path,
                  },
                },
                data: {
                  content: newContent,
                  updatedAt: new Date(),
                },
              });
              files.push(updated);
            } else if (op.content) {
              // Direct content update
              const updated = await tx.projectFile.update({
                where: {
                  projectId_path: {
                    projectId,
                    path: op.path,
                  },
                },
                data: {
                  content: op.content,
                  updatedAt: new Date(),
                },
              });
              files.push(updated);
            } else {
              throw new Error(`Update operation missing search/replace or content for ${op.path}`);
            }
            break;

          case 'delete':
            await tx.projectFile.delete({
              where: {
                projectId_path: {
                  projectId,
                  path: op.path,
                },
              },
            });
            break;
        }
      }
    });

    return {
      success: true,
      files,
      errors: [],
    };
  } catch (error: any) {
    // Transaction failed - all changes rolled back
    console.error('File operations transaction failed:', error);
    errors.push(error.message || 'Transaction failed');

    return {
      success: false,
      files: [],
      errors,
    };
  }
}

/**
 * Build a virtual file tree for display
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  language?: string;
}

export function buildFileTree(files: ProjectFile[]): FileTreeNode {
  const root: FileTreeNode = {
    name: 'project',
    path: '',
    type: 'folder',
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/').filter(p => p);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          ...(isFile && { language: file.language }),
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort children: folders first, then files, both alphabetically
  function sortChildren(node: FileTreeNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  }

  sortChildren(root);

  return root;
}

/**
 * Generate HTML preview from project files
 */
export function generatePreview(files: ProjectFile[]): string {
  const htmlFile = files.find(f => f.path.endsWith('.html'));

  if (!htmlFile) {
    return '<html><body><h1>No HTML file found</h1><p>Create an index.html file to see a preview.</p></body></html>';
  }

  let html = htmlFile.content;

  // Inline CSS files
  const cssFiles = files.filter(f => f.language === 'css');
  if (cssFiles.length > 0) {
    const cssContent = cssFiles.map(f => f.content).join('\n\n');
    const styleTag = `<style>\n${cssContent}\n</style>`;

    // Try to insert before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${styleTag}\n</head>`);
    } else {
      html = styleTag + html;
    }
  }

  // Inline JS files
  const jsFiles = files.filter(f => f.language === 'javascript' || f.language === 'typescript');
  if (jsFiles.length > 0) {
    const jsContent = jsFiles.map(f => f.content).join('\n\n');
    const scriptTag = `<script>\n${jsContent}\n</script>`;

    // Try to insert before </body>
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      html = html + scriptTag;
    }
  }

  return html;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect language from file extension
 */
export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    html: 'html',
    htm: 'html',
    css: 'css',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    txt: 'plaintext',
  };
  return languageMap[ext || ''] || 'plaintext';
}
