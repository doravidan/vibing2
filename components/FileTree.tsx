'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

export interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path?: string;
  language?: string;
  children?: FileTreeNode[];
}

interface FileTreeProps {
  tree: FileTreeNode[];
  selectedFile?: string;
  onFileSelect: (path: string) => void;
}

export default function FileTree({ tree, selectedFile, onFileSelect }: FileTreeProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-900 text-gray-100 p-2">
      <div className="text-xs font-semibold text-gray-400 mb-2 px-2">FILES</div>
      {tree.map((node, index) => (
        <TreeNode
          key={index}
          node={node}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          level={0}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  selectedFile,
  onFileSelect,
  level,
}: {
  node: FileTreeNode;
  selectedFile?: string;
  onFileSelect: (path: string) => void;
  level: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else if (node.path) {
      onFileSelect(node.path);
    }
  };

  const isSelected = node.path === selectedFile;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-gray-800 rounded transition-colors ${
          isSelected ? 'bg-blue-600/20 text-blue-400' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </span>
        )}
        {node.type === 'folder' ? (
          <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
        ) : (
          <File className="w-4 h-4 text-gray-400 flex-shrink-0 ml-4" />
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={index}
              node={child}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
