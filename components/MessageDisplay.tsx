import React from 'react';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'tool' | 'progress' | 'error';
  content?: string;
  action?: string;
  file?: string;
  linesAdded?: number;
  status?: string;
  message?: string;
}

interface MessageDisplayProps {
  messages: Message[];
}

export default function MessageDisplay({ messages }: MessageDisplayProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        // User message
        if (msg.type === 'user') {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl px-4 py-3 shadow-lg">
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          );
        }

        // Assistant message
        if (msg.type === 'assistant') {
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[80%] backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-green-400 font-semibold text-xl flex-shrink-0">⚡</span>
                  <div className="flex-1 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Tool usage message (compact Claude Code style)
        if (msg.type === 'tool') {
          const icon = msg.action === 'read' ? '👁️' : msg.action === 'create' ? '📄' : '✏️';
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs text-blue-400 font-medium">
                    {icon} {msg.file}
                    {msg.linesAdded && <span className="text-blue-300 ml-1">+{msg.linesAdded} lines</span>}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // Progress message
        if (msg.type === 'progress') {
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-700 font-medium">{msg.message}</span>
                </div>
              </div>
            </div>
          );
        }

        // Error message
        if (msg.type === 'error') {
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 max-w-[80%]">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-semibold text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm text-red-400 font-semibold">Error</p>
                    <p className="text-sm text-red-300 mt-1">{msg.content || msg.message}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
