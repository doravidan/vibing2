'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROJECT_TYPES, ProjectType, selectAdditionalAgents, getProjectTypeConfig } from '@/lib/project-types';
import PFCMetrics from '@/components/PFCMetrics';
import PresenceIndicator from '@/components/PresenceIndicator';
import InviteModal from '@/components/InviteModal';
import CodeChanges, { CodeChange } from '@/components/CodeChanges';
import VibingLoader from '@/components/VibingLoader';
import { useCollaboration } from '@/hooks/useCollaboration';

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [lastMetrics, setLastMetrics] = useState<any>(null);
  const [codeChanges, setCodeChanges] = useState<CodeChange[]>([]);
  const [toolActions, setToolActions] = useState<string[]>([]);

  // PFC Metrics
  const [pfcMetrics, setPfcMetrics] = useState({
    tokenBalance: 10000,
    contextPercentage: 0,
    tokensUsed: 0,
    tokensSaved: 0,
    plan: 'FREE'
  });

  // Project management
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Collaboration
  const [showInviteModal, setShowInviteModal] = useState(false);
  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || session?.user?.email || 'You';

  // Load existing project if projectId is in URL
  useEffect(() => {
    if (!projectIdParam || !session?.user?.id) return;

    const loadProject = async () => {
      setLoadingProject(true);
      try {
        const res = await fetch(`/api/projects/${projectIdParam}`);
        const data = await res.json();

        if (data.success && data.project) {
          const project = data.project;
          setCurrentProjectId(project.id);
          setProjectName(project.name);
          setProjectType(project.projectType);
          setActiveAgents(JSON.parse(project.activeAgents || '[]'));
          setMessages(project.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));

          // Set preview code from project.currentCode or latest message
          console.log('📁 Loading project:', {
            hasCurrentCode: !!project.currentCode,
            messageCount: project.messages.length
          });

          if (project.currentCode) {
            console.log('✅ Using currentCode from database');
            setPreviewCode(project.currentCode);
          } else {
            console.log('⚠️ No currentCode, extracting from messages...');

            // Search through all assistant messages from newest to oldest to find code
            let foundCode = '';
            for (let i = project.messages.length - 1; i >= 0; i--) {
              const message = project.messages[i];
              if (message.role === 'assistant') {
                const code = extractCodeFromResponse(message.content);
                if (code) {
                  foundCode = code;
                  console.log(`✅ Found code in message ${i + 1}/${project.messages.length}, length: ${code.length}`);
                  break;
                }
              }
            }

            if (foundCode) {
              setPreviewCode(foundCode);
            } else {
              console.error('❌ No code found in any assistant message');
            }
          }
        } else {
          setError('Failed to load project');
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Error loading project');
      } finally {
        setLoadingProject(false);
      }
    };

    loadProject();
  }, [projectIdParam, session]);

  // Use collaboration hook
  const {
    isConnected,
    activeUsers,
    typingUsers,
    broadcastMessage,
    startTyping,
    stopTyping,
    onMessageReceived,
  } = useCollaboration({
    projectId: currentProjectId || 'demo',
    userId: currentUserId,
    userName: currentUserName,
    enabled: !!currentProjectId,
  });

  // Listen for incoming messages from collaborators
  useEffect(() => {
    if (!currentProjectId) return;

    return onMessageReceived?.((message: any) => {
      console.log('📨 Received message from collaborator:', message);
      setMessages((prev) => [...prev, message]);

      // Update preview if it contains code
      const code = extractCodeFromResponse(message.content);
      if (code) {
        setPreviewCode(code);
      }
    });
  }, [currentProjectId, onMessageReceived]);

  const extractCodeFromResponse = (content: string): string => {
    const patterns = [
      /```html\s*([\s\S]*?)```/i,
      /```jsx\s*([\s\S]*?)```/i,
      /```tsx\s*([\s\S]*?)```/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  };

  const getSummaryFromResponse = (content: string): string => {
    const codeBlockMatch = content.match(/```(\w+)/);
    const language = codeBlockMatch ? codeBlockMatch[1] : 'html';
    const codeMatch = content.match(/```[\s\S]*?```/);
    const linesOfCode = codeMatch ? codeMatch[0].split('\n').length - 2 : 0;

    if (linesOfCode > 0) {
      return `✓ Generated ${language.toUpperCase()} (${linesOfCode} lines)`;
    }

    return '✓ Code generated';
  };

  const handleProjectTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    const config = getProjectTypeConfig(type);
    if (config) {
      setActiveAgents(config.baseAgents);
    }
  };

  const handleSaveProject = async () => {
    if (!projectType || messages.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId, // Include existing project ID if updating
          name: projectName || `${getProjectTypeConfig(projectType)?.name} - ${new Date().toLocaleDateString()}`,
          description: messages[0]?.content || '',
          projectType,
          activeAgents,
          currentCode: previewCode,
          messages,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentProjectId(data.project.id);
        alert(currentProjectId ? 'Project updated successfully!' : 'Project saved successfully!');
      }
    } catch (err) {
      alert('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || !projectType) return;

    const config = getProjectTypeConfig(projectType);
    if (config) {
      const agents = selectAdditionalAgents(inputValue, config.baseAgents);
      setActiveAgents(agents);
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectType,
          agents: activeAgents
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;

          // Check for progress updates
          const progressMatches = buffer.matchAll(/__PROGRESS__(.+?)__END__/g);
          for (const match of progressMatches) {
            try {
              const progress = JSON.parse(match[1]);
              setProgressStatus(progress.message);
              console.log('🔄 Progress:', progress);
            } catch (e) {
              console.error('Failed to parse progress:', e);
            }
          }

          // Check for tool actions
          const toolMatches = buffer.matchAll(/__TOOL__(.+?)__END__/g);
          for (const match of toolMatches) {
            try {
              const tool = JSON.parse(match[1]);
              const actionText = `${tool.action === 'read' ? '👁️' : tool.action === 'create' ? '📄' : '✏️'} ${tool.file}`;
              setToolActions(prev => [...prev, actionText]);
              console.log('🔧 Tool:', tool);
            } catch (e) {
              console.error('Failed to parse tool:', e);
            }
          }

          // Check for code changes
          const changesMatch = buffer.match(/__CHANGES__(.+?)__END__/);
          if (changesMatch) {
            try {
              const changesData = JSON.parse(changesMatch[1]);
              setCodeChanges(changesData.changes);
              console.log('📝 Code changes:', changesData.changes);
              buffer = buffer.replace(/__CHANGES__.+?__END__/, '');
            } catch (e) {
              console.error('Failed to parse changes:', e);
            }
          }

          // Check for metrics
          const metricsMatch = buffer.match(/__METRICS__(.+?)__END__/);
          if (metricsMatch) {
            try {
              const metrics = JSON.parse(metricsMatch[1]);
              console.log('📊 PFC Metrics received:', metrics);

              setLastMetrics(metrics);

              setPfcMetrics(prev => {
                const updated = {
                  ...prev,
                  tokensUsed: prev.tokensUsed + metrics.tokensUsed,
                  tokensSaved: prev.tokensSaved + metrics.pfcSaved,
                  contextPercentage: metrics.contextPercentage,
                  tokenBalance: Math.max(0, prev.tokenBalance - metrics.tokensUsed)
                };
                console.log('📊 Updated metrics:', updated);
                return updated;
              });

              // Remove metrics from buffer
              buffer = buffer.replace(/__METRICS__.+?__END__/, '');
            } catch (e) {
              console.error('Failed to parse metrics:', e);
            }
          }

          // Remove all markers from content
          let cleanContent = buffer
            .replace(/__PROGRESS__.+?__END__/g, '')
            .replace(/__TOOL__.+?__END__/g, '')
            .replace(/__CHANGES__.+?__END__/g, '');
          fullContent = cleanContent;

          assistantMessage.content = fullContent;

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: fullContent }
                : msg
            )
          );

          const code = extractCodeFromResponse(fullContent);
          if (code) {
            setPreviewCode(code);
          }
        }

        // Broadcast assistant message to collaborators
        if (broadcastMessage) {
          broadcastMessage(assistantMessage);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setProgressStatus('');
      setToolActions([]);
      if (stopTyping) stopTyping();
    }
  };

  if (!projectType) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                QuickVibe
              </h1>
              <p className="text-sm text-gray-400 mt-1">Choose your project type to get started</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 backdrop-blur-lg bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/20 transition-all"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="max-w-5xl w-full">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  What would you like to build?
                </span>
              </h2>
              <p className="text-xl text-gray-400">
                Select a project type and our AI agents will help you build it
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleProjectTypeSelect(type.id)}
                  className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:scale-105 transition-all text-left"
                >
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{type.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                    {type.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{type.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {type.baseAgents.slice(0, 2).map((agent) => (
                      <span
                        key={agent}
                        className="text-xs px-2 py-1 backdrop-blur-lg bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30"
                      >
                        {agent.replace('-', ' ')}
                      </span>
                    ))}
                    {type.baseAgents.length > 2 && (
                      <span className="text-xs px-2 py-1 backdrop-blur-lg bg-white/10 text-gray-400 rounded-full border border-white/20">
                        +{type.baseAgents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/10 via-pink-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/10 via-cyan-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">QuickVibe</h1>
              <p className="text-sm text-gray-400">
                {getProjectTypeConfig(projectType)?.icon} {getProjectTypeConfig(projectType)?.name}
                {' • '}
                <span className="text-purple-400">{activeAgents.length} agents active</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Collaboration Invite Button */}
              {currentProjectId && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center gap-2 shadow-lg"
                  title="Invite collaborators"
                >
                  <span>👥</span>
                  <span>Invite</span>
                </button>
              )}

              {messages.length > 0 && (
                <button
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? 'Saving...' : currentProjectId ? 'Update' : 'Save Project'}
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm backdrop-blur-lg bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/20 transition-all flex items-center gap-1"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Presence Indicator */}
          {currentProjectId && (
            <div className="flex items-center gap-4 pt-3 border-t border-white/10">
              <PresenceIndicator
                activeUsers={activeUsers}
                typingUsers={typingUsers}
                currentUserId={currentUserId}
              />
              {isConnected && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Connected</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        <div className="w-1/2 flex flex-col border-r border-white/10 backdrop-blur-xl bg-white/5">
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12 backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10">
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Describe your {getProjectTypeConfig(projectType)?.name.toLowerCase()}
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {activeAgents.map((agent) => (
                      <span
                        key={agent}
                        className="text-xs px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full border border-green-500/30"
                      >
                        ⚡ {agent.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 font-semibold">⚡</span>
                        <div className="flex-1 text-sm text-gray-300 font-medium">
                          {getSummaryFromResponse(message.content)}
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
          </main>

          <footer className="backdrop-blur-xl bg-white/5 border-t border-white/10 px-6 py-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (startTyping) startTyping();
                  }}
                  onBlur={() => {
                    if (stopTyping) stopTyping();
                  }}
                  placeholder="Describe your project..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? 'Generating...' : 'Send'}
                </button>
              </div>
            </form>
          </footer>
        </div>

        <div className="w-1/2 flex flex-col backdrop-blur-xl bg-gray-900/50">
          <div className="px-6 py-4 border-b border-white/10 backdrop-blur-xl bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Live Preview</h3>
                <p className="text-sm text-gray-400">{activeAgents.length} AI agents building</p>
              </div>
              {previewCode && (
                <button
                  onClick={() => setPreviewKey(prev => prev + 1)}
                  className="px-3 py-1 text-sm backdrop-blur-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-1 border border-blue-500/30"
                  title="Refresh preview"
                >
                  <span>🔄</span>
                  <span>Refresh</span>
                </button>
              )}
            </div>
            <PFCMetrics initialData={pfcMetrics} compact />
          </div>
          <div className="flex-1 p-6 overflow-auto">
            {previewCode ? (
              <iframe
                key={previewKey}
                srcDoc={previewCode}
                className="w-full h-full border border-white/20 rounded-xl shadow-2xl"
                title="Preview"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10 p-12">
                  <div className="text-6xl mb-4">👁️</div>
                  <p className="text-lg text-gray-400">Preview will appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Start chatting to generate code</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && currentProjectId && (
        <InviteModal
          projectId={currentProjectId}
          projectName={projectName || `${getProjectTypeConfig(projectType)?.name} Project`}
          userId={currentUserId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
