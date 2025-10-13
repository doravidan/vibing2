'use client';

import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  path: string;
  content: string;
  language: string;
}

export default function CodeViewer({ path, content, language }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting would be added here with a library like Prism or Monaco
  // For now, we'll display plain text with line numbers

  const lines = content.split('\n');

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{path}</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Line Numbers */}
          <div className="bg-gray-800 text-gray-500 text-right px-3 py-4 select-none">
            {lines.map((_, index) => (
              <div key={index} className="text-xs leading-6">
                {index + 1}
              </div>
            ))}
          </div>

          {/* Code */}
          <pre className="flex-1 p-4 overflow-x-auto">
            <code className="text-xs leading-6 font-mono">
              {lines.map((line, index) => (
                <div key={index}>{line || '\n'}</div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
