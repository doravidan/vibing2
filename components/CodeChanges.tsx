'use client';

import { useState } from 'react';

export interface CodeChange {
  type: 'create' | 'edit' | 'read' | 'delete';
  file: string;
  language?: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
  linesAdded?: number;
  linesRemoved?: number;
  timestamp: string;
}

interface CodeChangesProps {
  changes: CodeChange[];
}

export default function CodeChanges({ changes }: CodeChangesProps) {
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set());

  const toggleChange = (index: number) => {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChanges(newExpanded);
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'create':
        return '📄';
      case 'edit':
        return '✏️';
      case 'read':
        return '👁️';
      case 'delete':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'border-green-300 bg-green-50';
      case 'edit':
        return 'border-blue-300 bg-blue-50';
      case 'read':
        return 'border-gray-300 bg-gray-50';
      case 'delete':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getChangeBadgeColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'edit':
        return 'bg-blue-100 text-blue-700';
      case 'read':
        return 'bg-gray-100 text-gray-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const highlightCode = (code: string, language?: string) => {
    // Simple syntax highlighting with basic patterns
    let highlighted = code;

    // HTML/JSX tags
    highlighted = highlighted.replace(/(&lt;\/?)(\w+)(.*?&gt;|>)/g,
      '<span class="text-pink-400">$1</span><span class="text-blue-400">$2</span><span class="text-pink-400">$3</span>');

    // Strings
    highlighted = highlighted.replace(/(['"`])(.*?)\1/g, '<span class="text-green-400">$1$2$1</span>');

    // Comments
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-gray-500 italic">$1</span>');

    // Keywords
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'return', 'import', 'export', 'from', 'class', 'extends', 'async', 'await'];
    keywords.forEach(keyword => {
      highlighted = highlighted.replace(new RegExp(`\\b(${keyword})\\b`, 'g'), '<span class="text-purple-400">$1</span>');
    });

    return highlighted;
  };

  const renderDiff = (change: CodeChange) => {
    if (change.type === 'edit' && change.oldContent && change.newContent) {
      // Simple line-based diff
      const oldLines = change.oldContent.split('\n');
      const newLines = change.newContent.split('\n');

      return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-800 text-gray-400 text-xs font-semibold border-b border-gray-700">
            Changes
          </div>
          <div className="max-h-96 overflow-y-auto">
            {oldLines.map((line, i) => (
              <div key={`old-${i}`} className="flex bg-red-900/20 border-l-2 border-red-500">
                <span className="inline-block w-12 text-right pr-2 text-gray-500 text-xs select-none">{i + 1}</span>
                <div className="flex-1 px-2 py-0.5 font-mono text-xs">
                  <span className="text-red-400 mr-2">-</span>
                  <span className="text-red-200">{line}</span>
                </div>
              </div>
            ))}
            {newLines.map((line, i) => (
              <div key={`new-${i}`} className="flex bg-green-900/20 border-l-2 border-green-500">
                <span className="inline-block w-12 text-right pr-2 text-gray-500 text-xs select-none">{i + 1}</span>
                <div className="flex-1 px-2 py-0.5 font-mono text-xs">
                  <span className="text-green-400 mr-2">+</span>
                  <span className="text-green-200">{line}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (change.content) {
      const lines = change.content.split('\n');
      return (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-800 text-gray-400 text-xs font-semibold border-b border-gray-700 flex items-center justify-between">
            <span>{change.file}</span>
            {change.language && (
              <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">{change.language}</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className="flex hover:bg-gray-800/50">
                <span className="inline-block w-12 text-right pr-2 text-gray-500 text-xs select-none border-r border-gray-800">
                  {i + 1}
                </span>
                <pre className="flex-1 px-3 py-0.5 font-mono text-xs text-gray-200 overflow-x-auto">
                  {line || ' '}
                </pre>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span>🔧</span>
        <span>Code Changes ({changes.length})</span>
      </h4>

      <div className="space-y-2">
        {changes.map((change, index) => {
          const isExpanded = expandedChanges.has(index);

          return (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden ${getChangeColor(change.type)}`}
            >
              <button
                onClick={() => toggleChange(index)}
                className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getChangeIcon(change.type)}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-900">{change.file}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getChangeBadgeColor(change.type)}`}>
                        {change.type}
                      </span>
                    </div>
                    {change.linesAdded !== undefined && change.linesRemoved !== undefined && (
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="text-green-600">+{change.linesAdded}</span>
                        {' / '}
                        <span className="text-red-600">-{change.linesRemoved}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-300">
                  <div className="mt-2">
                    {renderDiff(change)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
