'use client';

import { useState, useEffect } from 'react';
import FileTree, { FileTreeNode } from './FileTree';
import CodeViewer from './CodeViewer';
import { buildFileTree, generatePreview } from '@/lib/file-manager';
import { Code2, Eye } from 'lucide-react';

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
}

interface MultiFileViewProps {
  files: ProjectFile[];
  onPreviewUpdate?: (html: string) => void;
}

export default function MultiFileView({ files, onPreviewUpdate }: MultiFileViewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [previewHtml, setPreviewHtml] = useState('');

  // Build file tree when files change
  useEffect(() => {
    if (files && files.length > 0) {
      const tree = buildFileTree(files);
      setFileTree(tree);

      // Generate preview HTML
      const html = generatePreview(files);
      setPreviewHtml(html);

      if (onPreviewUpdate) {
        onPreviewUpdate(html);
      }

      // Select first file by default
      if (!selectedFile && files.length > 0) {
        setSelectedFile(files[0].path);
      }
    }
  }, [files]);

  const selectedFileData = files.find(f => f.path === selectedFile);

  if (!files || files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>No files to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setViewMode('preview')}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
            viewMode === 'preview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={() => setViewMode('code')}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
            viewMode === 'code'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Code
        </button>
        <div className="ml-auto text-xs text-gray-400">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'code' ? (
          <>
            {/* File Tree Sidebar */}
            <div className="w-64 border-r border-gray-700 overflow-hidden">
              <FileTree
                tree={fileTree}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />
            </div>

            {/* Code Viewer */}
            <div className="flex-1 overflow-hidden">
              {selectedFileData ? (
                <CodeViewer
                  path={selectedFileData.path}
                  content={selectedFileData.content}
                  language={selectedFileData.language}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Select a file to view</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Preview iframe */
          <div className="flex-1 bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
