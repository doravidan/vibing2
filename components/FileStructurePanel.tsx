'use client';

import { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

interface FileStructurePanelProps {
  files: Array<{ path: string; content: string }>;
}

export default function FileStructurePanel({ files }: FileStructurePanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const buildTree = (): FileNode => {
    const root: FileNode = { name: 'project', type: 'folder', path: '', children: [] };

    files.forEach(file => {
      const parts = file.path.split('/').filter(p => p);
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');

        if (!current.children) current.children = [];

        let existing = current.children.find(c => c.name === part);
        if (!existing) {
          existing = {
            name: part,
            type: isFile ? 'file' : 'folder',
            path,
            children: isFile ? undefined : []
          };
          current.children.push(existing);
        }

        if (!isFile) current = existing;
      });
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path || 'root');
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path || 'root'}>
        <div
          className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-gray-700 rounded transition-colors ${
            node.type === 'file' ? 'text-gray-300' : 'text-blue-400'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => node.type === 'folder' && toggleFolder(node.path || 'root')}
        >
          {node.type === 'folder' && (
            <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}
          {node.type === 'folder' ? (
            <Folder className="w-3 h-3 flex-shrink-0" />
          ) : (
            <File className="w-3 h-3 flex-shrink-0 ml-3" />
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {node.type === 'folder' && isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  if (files.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 h-full">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
          <Folder className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-gray-300">Files</span>
        </div>
        <div className="text-xs text-gray-500 text-center py-4">
          No files yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        <Folder className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-gray-300">Files</span>
        <span className="text-xs text-gray-500 ml-auto">{files.length}</span>
      </div>
      <div className="space-y-0.5">
        {tree.children && tree.children.map(child => renderNode(child, 0))}
      </div>
    </div>
  );
}
