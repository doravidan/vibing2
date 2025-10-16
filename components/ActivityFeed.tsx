'use client';

import { useEffect, useRef, useState } from 'react';

interface Activity {
  id: string;
  type: 'thinking' | 'file' | 'progress' | 'complete' | 'error';
  action?: string;
  file?: string;
  message?: string;
  codePreview?: string;
  timestamp: number;
}

interface ActivityFeedProps {
  activities: Activity[];
  isActive: boolean;
}

const funnyThinkingWords = [
  'Splunting through the code matrix',
  'Flingling the quantum bits',
  'Vibing with the algorithms',
  'Schmoogling the data streams',
  'Zonking the neural pathways',
  'Booping the code generators',
  'Whimsifying the functions',
  'Jazzercising the variables',
  'Noodling the logic flows',
  'Wiggling the syntax trees',
  'Bamboozling the compilers',
  'Flibbertigibbeting ideas',
  'Discombobulating patterns',
  'Hodgepodging solutions',
  'Cattywampusing the code',
  'Lollygagging creatively',
  'Shenaniganing brilliantly',
  'Whippersnapping code blocks',
  'Gobbledygooked insights',
  'Kerfuffling the possibilities',
];

const getRandomThinkingWord = () => {
  return funnyThinkingWords[Math.floor(Math.random() * funnyThinkingWords.length)];
};

export default function ActivityFeed({ activities, isActive }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentThinking, setCurrentThinking] = useState(getRandomThinkingWord());

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  // Change thinking message every 2 seconds when active
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setCurrentThinking(getRandomThinkingWord());
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'thinking':
        return '🧠';
      case 'file':
        return '📄';
      case 'progress':
        return '⚡';
      case 'complete':
        return '✨';
      case 'error':
        return '⚠️';
      default:
        return '•';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'thinking':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/40';
      case 'file':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/40';
      case 'progress':
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40';
      case 'complete':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/40';
      case 'error':
        return 'from-red-500/20 to-rose-500/20 border-red-500/40';
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/40';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950/50 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <h3 className="text-sm font-semibold text-white">Activity Feed</h3>
          {isActive && (
            <span className="text-xs text-purple-400 animate-pulse">● Live</span>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length === 0 && !isActive && (
          <div className="text-center text-white/40 text-sm py-8">
            <div className="text-4xl mb-2">🎯</div>
            <p>Waiting for your prompt...</p>
          </div>
        )}

        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`relative bg-gradient-to-r ${getActivityColor(activity.type)} border rounded-lg p-3 animate-fadeIn`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</span>
              <div className="flex-1 min-w-0">
                {activity.action && activity.file && (
                  <div className="text-sm font-medium text-white mb-1">
                    {activity.action}: <span className="text-cyan-400 font-mono text-xs">{activity.file}</span>
                  </div>
                )}
                {activity.message && (
                  <div className="text-sm text-white/80">{activity.message}</div>
                )}
                {activity.codePreview && (
                  <div className="mt-2 bg-black/30 rounded p-2 border border-white/10">
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                      {activity.codePreview}
                    </pre>
                  </div>
                )}
                <div className="text-xs text-white/40 mt-1">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Live Thinking Indicator */}
        {isActive && (
          <div className="relative bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-lg p-3 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="relative">
                <span className="text-2xl">🧠</span>
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping" />
                  <div className="relative w-3 h-3 bg-purple-500 rounded-full" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-purple-300 animate-pulse">
                  {currentThinking}...
                </div>
                <div className="flex gap-1 mt-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {activities.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-gray-950/50">
          <div className="text-xs text-white/60 flex items-center justify-between">
            <span>{activities.length} operations</span>
            {!isActive && activities[activities.length - 1]?.type === 'complete' && (
              <span className="text-green-400 flex items-center gap-1">
                <span>✓</span> Complete
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
