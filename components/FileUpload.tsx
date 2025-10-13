'use client';

import { useState, useRef } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 for images, text content for text files
  preview?: string; // URL for image preview
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/*', 'text/*', '.pdf', '.json', '.csv', '.md', '.txt']
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = async (fileList: File[]) => {
    setError(null);

    // Check max files limit
    if (files.length + fileList.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const newFiles: UploadedFile[] = [];

    for (const file of fileList) {
      // Check file size
      if (file.size > maxSizeBytes) {
        setError(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      try {
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: '',
        };

        // Process based on file type
        if (file.type.startsWith('image/')) {
          // Read image as base64
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploadedFile.data = dataUrl;
          uploadedFile.preview = dataUrl;
        } else if (file.type.startsWith('text/') ||
                   file.name.endsWith('.json') ||
                   file.name.endsWith('.md') ||
                   file.name.endsWith('.txt') ||
                   file.name.endsWith('.csv')) {
          // Read text files as text
          const text = await file.text();
          uploadedFile.data = text;
        } else {
          // For other files, read as base64
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploadedFile.data = dataUrl;
        }

        newFiles.push(uploadedFile);
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        setError(`Failed to process ${file.name}`);
      }
    }

    onFilesChange([...files, ...newFiles]);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-4 cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-sm">
            <span className="text-purple-400 font-medium">Click to upload</span>
            <span className="text-gray-400"> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500">
            Images, text files, JSON, PDF (max {maxSizeMB}MB, up to {maxFiles} files)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-3"
            >
              {/* File Preview/Icon */}
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
