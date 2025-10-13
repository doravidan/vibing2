import VibingLoader from '@/components/VibingLoader';
import CodeChanges, { CodeChange } from '@/components/CodeChanges';
import { Message } from '@/lib/hooks/useProjectCreation';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  progressStatus: string;
  toolActions: string[];
  codeChanges: CodeChange[];
  lastMetrics: any;
  getSummaryFromResponse: (content: string) => string;
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  progressStatus,
  toolActions,
  codeChanges,
  lastMetrics,
  getSummaryFromResponse,
}: ChatMessagesProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30'
            }`}
          >
            {message.role === 'assistant' ? (
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-semibold text-xl flex-shrink-0">⚡</span>
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-gray-200 leading-relaxed">
                    {getSummaryFromResponse(message.content)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="space-y-2">
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-4 py-3">
              <VibingLoader message={progressStatus} />
            </div>
          </div>

          {/* Tool Actions (Claude Code style) */}
          {toolActions.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-md">
                <div className="text-xs text-gray-600 font-semibold mb-1">Tool Use:</div>
                <div className="space-y-1">
                  {toolActions.slice(-3).map((action, i) => (
                    <div key={i} className="text-xs text-gray-700 font-mono">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Changes (Claude Code style) */}
      {codeChanges.length > 0 && !isLoading && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <CodeChanges changes={codeChanges} />
        </div>
      )}

      {/* Performance Summary (Claude Code style) */}
      {lastMetrics && !isLoading && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-300 pb-2">
            <h4 className="text-sm font-semibold text-gray-900">📊 Performance Summary</h4>
            <span className="text-xs text-gray-500">{new Date(lastMetrics.timestamp).toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Tokens Used</p>
              <p className="text-lg font-bold text-gray-900">{lastMetrics.tokensUsed.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Input: {lastMetrics.inputTokens} • Output: {lastMetrics.outputTokens}</p>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-1">Duration</p>
              <p className="text-lg font-bold text-gray-900">{lastMetrics.duration}s</p>
              <p className="text-xs text-gray-500">{Math.round(lastMetrics.tokensUsed / lastMetrics.duration)} tokens/s</p>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-1">Context Usage</p>
              <p className="text-lg font-bold text-blue-600">{lastMetrics.contextPercentage.toFixed(2)}%</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${lastMetrics.contextPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-1">PFC Saved</p>
              <p className="text-lg font-bold text-green-600">↓ {lastMetrics.pfcSaved.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{Math.round((lastMetrics.pfcSaved / (lastMetrics.tokensUsed + lastMetrics.pfcSaved)) * 100)}% efficiency</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
