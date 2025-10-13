'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROJECT_TYPES, ProjectType, selectAdditionalAgents, getProjectTypeConfig } from '@/lib/project-types';
import { streamSSE, createTimeoutSignal } from '@/lib/sse-parser';
import FileUpload, { UploadedFile } from '@/components/FileUpload';
import VoiceRecorder from '@/components/VoiceRecorder';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface VersionSnapshot {
  id: string;
  timestamp: Date;
  previewCode: string;
  messages: Message[];
  label?: string;
}

// Helper function to extract summary from assistant message (text before first code block)
const extractSummary = (content: string) => {
  const codeBlockStart = content.indexOf('```');
  if (codeBlockStart > 0) {
    return content.slice(0, codeBlockStart).trim();
  }
  return content.slice(0, 300).trim() + (content.length > 300 ? '...' : '');
};

// Helper function to format assistant messages (HIDE CODE BLOCKS, ONLY SHOW SUMMARY)
const formatAssistantMessage = (content: string) => {
  const sections: { type: string; content: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let codeBlockCount = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) sections.push({ type: 'text', content: text });
    }
    // Instead of showing code, just show a placeholder
    codeBlockCount++;
    sections.push({
      type: 'code_hidden',
      content: `Code block ${codeBlockCount} (${match[1] || 'text'}) - ${match[2].split('\n').length} lines`,
      language: match[1] || 'text'
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) sections.push({ type: 'text', content: text });
  }

  return sections.length > 0 ? sections : [{ type: 'text', content }];
};

export default function CreatePageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams() || { get: () => null };
  const projectIdParam = searchParams.get('projectId');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestPreviewCodeRef = useRef<string>('');
  const latestMessagesRef = useRef<Message[]>([]);
  const latestProjectIdRef = useRef<string | null>(projectIdParam);

  // State
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectIdParam);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [sandboxId, setSandboxId] = useState('');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [selectedSpecializedAgent, setSelectedSpecializedAgent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [metrics, setMetrics] = useState<{
    tokensUsed?: number;
    inputTokens?: number;
    outputTokens?: number;
    contextPercentage?: number;
    duration?: number;
  } | null>(null);
  const [lastPromptMetrics, setLastPromptMetrics] = useState<{
    tokensUsed?: number;
    inputTokens?: number;
    outputTokens?: number;
    contextPercentage?: number;
    duration?: number;
  } | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Auto-scroll to bottom when messages or progress change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, progress, error]);

  // Handle clipboard paste for images and files
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Handle pasted images
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            newFiles.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `pasted-image-${Date.now()}.${file.type.split('/')[1]}`,
              type: file.type,
              size: file.size,
              data: dataUrl,
              preview: dataUrl,
            });
          } catch (err) {
            console.error('Error processing pasted image:', err);
          }
        }
        // Handle pasted files
        else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (!file) continue;

          try {
            const uploadedFile: UploadedFile = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: file.type,
              size: file.size,
              data: '',
            };

            if (file.type.startsWith('text/') ||
                file.name.endsWith('.json') ||
                file.name.endsWith('.md') ||
                file.name.endsWith('.txt')) {
              uploadedFile.data = await file.text();
            } else {
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
            console.error('Error processing pasted file:', err);
          }
        }
      }

      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setShowFileUpload(true);
        console.log(`✅ Pasted ${newFiles.length} file(s) from clipboard`);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Sync ref when currentProjectId state changes
  useEffect(() => {
    latestProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  // Load existing project
  useEffect(() => {
    if (!projectIdParam || !session?.user?.id) return;

    const loadProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectIdParam}`);
        const data = await res.json();

        if (data.success && data.project) {
          const project = data.project;
          setMessages(project.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));
          setProjectType(project.projectType);
          setActiveAgents(JSON.parse(project.activeAgents || '[]'));

          // Use currentCode from project if available
          if (project.currentCode) {
            console.log('✅ Loading preview from project.currentCode');
            setPreviewCode(project.currentCode);
          } else {
            // Fallback: Extract code from last assistant message
            console.log('⚠️ No currentCode, extracting from messages');
            for (let i = project.messages.length - 1; i >= 0; i--) {
              const message = project.messages[i];
              if (message.role === 'assistant') {
                // Look for any code block (html, javascript, etc.)
                const codeMatch = message.content.match(/```(?:html|javascript|typescript|jsx|tsx)?\n([\s\S]*?)\n```/);
                if (codeMatch) {
                  setPreviewCode(codeMatch[1]);
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project');
      }
    };

    loadProject();
  }, [projectIdParam, session]);

  // Handle project type selection
  const handleProjectTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    const config = getProjectTypeConfig(type);
    if (config) {
      setActiveAgents(config.baseAgents);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading || !projectType) return;

    // Build rich prompt with file attachments
    let enrichedPrompt = inputValue.trim();

    if (uploadedFiles.length > 0) {
      enrichedPrompt += '\n\n---\n\n**Attached Files:**\n\n';

      for (const file of uploadedFiles) {
        enrichedPrompt += `### ${file.name} (${(file.size / 1024).toFixed(1)}KB)\n\n`;

        if (file.type.startsWith('image/')) {
          // For images, include base64 data for Claude's vision capabilities
          enrichedPrompt += `![${file.name}](${file.data})\n\n`;
          enrichedPrompt += `*Image attached - please analyze this image and incorporate insights into your response.*\n\n`;
        } else if (file.type.startsWith('text/') ||
                   file.name.endsWith('.json') ||
                   file.name.endsWith('.md') ||
                   file.name.endsWith('.txt') ||
                   file.name.endsWith('.csv')) {
          // For text files, include the actual content
          enrichedPrompt += '```\n' + file.data + '\n```\n\n';
        } else {
          // For other files, just mention them
          enrichedPrompt += `*File attached (${file.type || 'unknown type'})*\n\n`;
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: enrichedPrompt
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedFiles([]); // Clear uploaded files after sending
    setShowFileUpload(false); // Hide upload UI
    setIsLoading(true);
    setError(null);
    setProgress('🤖 Analyzing prompt and selecting optimal agents...');

    // Automatically select agents based on prompt and context
    let selectedAgents = activeAgents;
    try {
      const autoSelectionResponse = await fetch('/api/agents/auto-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputValue,
          projectType,
          existingFiles: projectFiles.map(f => f.path),
          currentCode: previewCode,
          conversationHistory: messages.slice(-3), // Last 3 messages for context
        })
      });

      if (autoSelectionResponse.ok) {
        const autoSelection = await autoSelectionResponse.json();
        selectedAgents = autoSelection.agents || activeAgents;
        setActiveAgents(selectedAgents);

        // Show user what agents were selected
        console.log('🤖 Auto-selected agents:', autoSelection);
        setProgress(`✨ Selected ${selectedAgents.length} agents: ${selectedAgents.join(', ')}`);
      }
    } catch (err) {
      console.warn('Auto-selection failed, using default agents:', err);
      // Fallback to default agents on error
    }

    await new Promise(resolve => setTimeout(resolve, 800)); // Brief pause to show agent selection
    setProgress('Starting generation...');

    // Create timeout signal (5 minutes)
    const { signal, clear: clearTimeout } = createTimeoutSignal(5 * 60 * 1000);
    let assistantMessage = '';

    try {
      // Validate request body before sending
      const requestBody = {
        messages: [...messages, userMessage],
        projectType,
        agents: selectedAgents,
        specializedAgent: selectedSpecializedAgent || undefined,
      };

      console.log('📤 Sending request to /api/agent/stream:', JSON.stringify(requestBody, null, 2));

      // Use robust SSE streaming with automatic retry
      await streamSSE({
        url: '/api/agent/stream',
        method: 'POST',
        body: requestBody,
        signal,
        maxRetries: 3,
        retryDelay: 2000,

        onEvent: (event) => {
          // Handle both SSE format (data.type/data.data) and direct format (type/data)
          const eventType = event.data?.type || event.type;
          const eventData = event.data?.data || event.data;

          switch (eventType) {
            case 'progress':
              setProgress(eventData.message || 'Processing...');
              if (eventData.sandboxId) {
                setSandboxId(eventData.sandboxId);
              }
              if (eventData.previewUrl) {
                setPreviewUrl(eventData.previewUrl);
              }
              break;

            case 'message':
              // The stream endpoint sends text directly
              if (typeof event.data === 'string') {
                assistantMessage += event.data;
              } else if (eventData.delta && eventData.content) {
                assistantMessage += eventData.content;
              }
              break;

            case 'tool':
              console.log('Tool action:', eventData.action, eventData.file);
              setProgress(`📝 ${eventData.action}: ${eventData.file}`);
              break;


            case 'code_changes':
            case 'changes':
              // Extract code from changes - support HTML and JavaScript
              console.log('Code changes received:', eventData);
              if (eventData.changes && Array.isArray(eventData.changes)) {
                // First try to find HTML
                let htmlChange = eventData.changes.find((c: any) => 
                  c.language === 'html' || c.file?.endsWith('.html')
                );
                
                // If no HTML found, check for JavaScript and wrap it
                if (!htmlChange) {
                  const jsChange = eventData.changes.find((c: any) =>
                    c.language === 'javascript' || c.language === 'js' || c.file?.endsWith('.js')
                  );
                  if (jsChange && jsChange.content) {
                    console.log('Wrapping JavaScript in HTML for preview');
                    const wrappedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>body{margin:0;padding:0;overflow:hidden}canvas{display:block}</style>
</head>
<body>
    <script>
${jsChange.content}
    </script>
</body>
</html>`;
                    setPreviewCode(wrappedHTML);
                    latestPreviewCodeRef.current = wrappedHTML;
                  }
                } else if (htmlChange && htmlChange.content) {
                  console.log('Setting preview code from HTML changes');
                  setPreviewCode(htmlChange.content);
                  latestPreviewCodeRef.current = htmlChange.content;
                }
              }
              break;
            case 'file_operations':
              // Extract code from file operations - support HTML and JavaScript
              console.log('File operations received:', eventData);
              if (eventData.operations?.creates) {
                let htmlFile = eventData.operations.creates.find((f: any) => 
                  f.language === 'html' || f.path?.endsWith('.html')
                );
                
                if (!htmlFile) {
                  const jsFile = eventData.operations.creates.find((f: any) =>
                    f.language === 'javascript' || f.language === 'js' || f.path?.endsWith('.js')
                  );
                  if (jsFile && jsFile.content) {
                    console.log('Wrapping JavaScript in HTML for preview');
                    const wrappedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>body{margin:0;padding:0;overflow:hidden}canvas{display:block}</style>
</head>
<body>
    <script>
${jsFile.content}
    </script>
</body>
</html>`;
                    setPreviewCode(wrappedHTML);
                    latestPreviewCodeRef.current = wrappedHTML;
                  }
                } else if (htmlFile && htmlFile.content) {
                  console.log('Setting preview code from file operations');
                  setPreviewCode(htmlFile.content);
                  latestPreviewCodeRef.current = htmlFile.content;
                }
              }
              break;
            case 'complete':
            case 'metrics':
              setProgress('✅ Generation complete!');
              if (eventData.previewUrl) {
                setPreviewUrl(eventData.previewUrl);
              }
              if (eventData.sandboxId) {
                setSandboxId(eventData.sandboxId);
              }
              // Capture metrics for both last prompt and cumulative
              if (eventType === 'metrics' && eventData) {
                console.log('Metrics received:', eventData);
                const newMetrics = {
                  tokensUsed: eventData.tokensUsed,
                  inputTokens: eventData.inputTokens,
                  outputTokens: eventData.outputTokens,
                  contextPercentage: eventData.contextPercentage,
                  duration: eventData.duration,
                };

                // Store last prompt metrics
                setLastPromptMetrics(newMetrics);

                // Update cumulative metrics
                setMetrics(prev => ({
                  tokensUsed: (prev?.tokensUsed || 0) + (eventData.tokensUsed || 0),
                  inputTokens: (prev?.inputTokens || 0) + (eventData.inputTokens || 0),
                  outputTokens: (prev?.outputTokens || 0) + (eventData.outputTokens || 0),
                  contextPercentage: eventData.contextPercentage, // Use latest context percentage
                  duration: (prev?.duration || 0) + (eventData.duration || 0),
                }));
              }
              break;
          }
        },

        onError: (error) => {
          console.error('Stream error:', error);
          setError(error.message || 'Stream connection failed');
        },

        onComplete: async () => {
          // Add assistant message
          let updatedMessages = messages;
          if (assistantMessage) {
            const msg: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: assistantMessage,
            };
            updatedMessages = [...messages, msg];
            setMessages(updatedMessages);
            latestMessagesRef.current = updatedMessages;

            // Extract HTML code as fallback if not set by events
            if (!latestPreviewCodeRef.current) {
              const codeMatch = assistantMessage.match(/```html\n([\s\S]*?)\n```/);
              if (codeMatch) {
                setPreviewCode(codeMatch[1]);
                latestPreviewCodeRef.current = codeMatch[1];
              }
            }
          }

          setIsLoading(false);
          setProgress('');

          // Wait for state to settle, then create snapshot and save
          setTimeout(() => {
            // Use ref values which have the latest from event handlers
            const currentPreviewCode = latestPreviewCodeRef.current;
            const currentMessages = latestMessagesRef.current;

            // Create snapshot with current data
            const snapshot: VersionSnapshot = {
              id: Date.now().toString(),
              timestamp: new Date(),
              previewCode: currentPreviewCode,
              messages: currentMessages,
              label: `Version ${versionHistory.length + 1}`,
            };
            console.log('📸 Creating snapshot:', snapshot.label, 'Preview code length:', currentPreviewCode.length);
            setVersionHistory((prev) => [...prev, snapshot]);

            // Auto-save project - capture current state immediately
            // This ensures we use the LATEST projectId value, not a stale closure
            const saveData = {
              projectId: latestProjectIdRef.current,
              name: `${projectType} - ${new Date().toLocaleDateString()}`,
              projectType,
              activeAgents: JSON.stringify(activeAgents),
              messages: currentMessages,
              currentCode: currentPreviewCode,
            };

            console.log('💾 Auto-saving project with ID:', saveData.projectId);
            setAutoSaveStatus('saving');

            fetch('/api/projects/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(saveData),
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 3000);

                // Update projectId if this was a new project
                if (!saveData.projectId && data.projectId) {
                  console.log('📝 New project created with ID:', data.projectId);
                  setCurrentProjectId(data.projectId);
                  latestProjectIdRef.current = data.projectId;

                  // Use router.replace for better navigation
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('projectId', data.projectId);
                    window.history.replaceState({}, '', url);
                  }
                } else {
                  console.log('✏️ Updated existing project:', saveData.projectId);
                }
              } else {
                console.error('Auto-save failed:', data.error);
                setAutoSaveStatus('idle');
              }
            })
            .catch(error => {
              console.error('Auto-save error:', error);
              setAutoSaveStatus('idle');
            });
          }, 500);
        },
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate project');
      setIsLoading(false);
      setProgress('');
    } finally {
      clearTimeout();
    }
  };

  // Create version snapshot
  const createSnapshot = (customLabel?: string) => {
    const snapshot: VersionSnapshot = {
      id: Date.now().toString(),
      timestamp: new Date(),
      previewCode,
      messages: [...messages],
      label: customLabel || `Version ${versionHistory.length + 1}`,
    };
    setVersionHistory((prev) => [...prev, snapshot]);
  };

  // Restore from snapshot
  const restoreSnapshot = (snapshotId: string) => {
    const snapshot = versionHistory.find((s) => s.id === snapshotId);
    if (snapshot) {
      setPreviewCode(snapshot.previewCode);
      setMessages(snapshot.messages);
      setShowHistory(false);
    }
  };

  // Handle save project
  const handleSaveProject = async () => {
    try {
      const res = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectIdParam || null,
          name: `${projectType} - ${new Date().toLocaleDateString()}`,
          projectType,
          activeAgents: JSON.stringify(activeAgents),
          messages,
          currentCode: previewCode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Project saved successfully!');
        if (!projectIdParam && data.projectId) {
          router.push(`/create?projectId=${data.projectId}`);
        }
      } else {
        alert('Failed to save project');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving project');
    }
  };

  // Project type selection screen
  if (!projectType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              What would you like to create?
            </h1>
            <p className="text-xl text-white/60">
              Choose a project type to get started with AI-powered development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROJECT_TYPES.map((type) => {
              const config = getProjectTypeConfig(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => handleProjectTypeSelect(type.id)}
                  className="group p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/20 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-4xl mb-4">{type.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>
                  <p className="text-white/60 text-sm mb-4">{type.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {config?.baseAgents.slice(0, 3).map((agent) => (
                      <span
                        key={agent}
                        className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main create interface
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="relative z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {getProjectTypeConfig(projectType)?.name}
              </h1>
              <p className="text-sm text-white/60">
                Powered by Daytona Sandbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save Status Indicator */}
            {autoSaveStatus !== 'idle' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white/80 text-sm">Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-500">✓</span>
                    <span className="text-white/80 text-sm">Saved</span>
                  </>
                )}
              </div>
            )}

            {versionHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 shadow-lg flex items-center gap-2"
              >
                <span>📜</span>
                History ({versionHistory.length})
              </button>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm backdrop-blur-lg bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/20 transition-all"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Monitoring Stripe - Live Metrics */}
      {metrics && (
        <div className="border-y border-white/10 bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-purple-900/30 backdrop-blur-lg">
          <div className="px-6 py-3 space-y-2">
            {/* Last Prompt Usage */}
            {lastPromptMetrics && (
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400 font-semibold">💬 Last Prompt:</span>
                    <span className="text-sm font-mono font-semibold text-white">
                      {lastPromptMetrics.tokensUsed?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs text-white/40">
                      ({lastPromptMetrics.inputTokens?.toLocaleString() || 0} in / {lastPromptMetrics.outputTokens?.toLocaleString() || 0} out)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400">⏱️</span>
                    <span className="text-sm font-mono font-semibold text-white">
                      {lastPromptMetrics.duration ? `${lastPromptMetrics.duration.toFixed(2)}s` : '0s'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Usage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Token Usage */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">🎯 Total Tokens:</span>
                  <span className="text-sm font-mono font-semibold text-white">
                    {metrics.tokensUsed?.toLocaleString() || 0}
                  </span>
                  <span className="text-xs text-white/40">
                    ({metrics.inputTokens?.toLocaleString() || 0} in / {metrics.outputTokens?.toLocaleString() || 0} out)
                  </span>
                </div>

                {/* Context Usage */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">📊 Context:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(metrics.contextPercentage || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-semibold text-white">
                      {metrics.contextPercentage?.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Total Duration */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">⏱️ Total:</span>
                  <span className="text-sm font-mono font-semibold text-white">
                    {metrics.duration ? `${metrics.duration.toFixed(2)}s` : '0s'}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-white/60">Live</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (30%) */}
        <div className="w-[30%] flex flex-col border-r border-white/10 backdrop-blur-xl bg-white/5">
          <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  Describe your {getProjectTypeConfig(projectType)?.name.toLowerCase()}
                </h2>
                <p className="text-white/60 text-sm">
                  AI will generate it in a secure Daytona sandbox
                </p>
              </div>
            )}

            {/* Agent Summary - Show latest assistant message summary */}
            {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-2">Agent Summary</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {extractSummary(messages[messages.length - 1].content)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const sections = message.role === 'assistant' 
                ? formatAssistantMessage(message.content)
                : [{ type: 'text', content: message.content }];

              return (
                <div
                  key={message.id}
                  className={`rounded-xl overflow-hidden ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="px-4 pt-3 pb-2 border-b border-white/10">
                    <div className="text-xs text-white/60 font-semibold">
                      {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {sections.map((section, idx) => (
                      <div key={idx}>
                        {section.type === 'text' ? (
                          <div className="text-white/90 text-sm leading-relaxed">
                            {section.content}
                          </div>
                        ) : section.type === 'code_hidden' ? (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-blue-400 text-xs">
                              <span>📄</span>
                              <span>{section.content}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute top-2 right-2 text-xs text-white/40 font-mono">
                              {section.language}
                            </div>
                            <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto">
                              <code className="text-xs text-cyan-400 font-mono">
                                {section.content}
                              </code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <div className="text-white/80 text-sm">{progress}</div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="text-red-400 text-sm">{error}</div>
              </div>
            )}


            {/* Metrics Display */}
            {metrics && !isLoading && (
              <div className="space-y-3">
                {/* Last Prompt Metrics */}
                {lastPromptMetrics && (
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl">
                    <div className="text-xs text-blue-400 font-semibold mb-2">💬 Last Prompt Metrics</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">Tokens:</span>
                        <span className="text-white font-mono">{lastPromptMetrics.tokensUsed?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Context:</span>
                        <span className="text-white font-mono">{lastPromptMetrics.contextPercentage?.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Input:</span>
                        <span className="text-cyan-400 font-mono">{lastPromptMetrics.inputTokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Output:</span>
                        <span className="text-cyan-400 font-mono">{lastPromptMetrics.outputTokens}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-white/60">Duration:</span>
                        <span className="text-green-400 font-mono">{lastPromptMetrics.duration?.toFixed(2)}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Session Metrics */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                  <div className="text-xs text-purple-400 font-semibold mb-2">📊 Overall Session Metrics</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Total Tokens:</span>
                      <span className="text-white font-mono">{metrics.tokensUsed?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Context:</span>
                      <span className="text-white font-mono">{metrics.contextPercentage?.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Total Input:</span>
                      <span className="text-cyan-400 font-mono">{metrics.inputTokens?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Total Output:</span>
                      <span className="text-cyan-400 font-mono">{metrics.outputTokens?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-white/60">Total Duration:</span>
                      <span className="text-green-400 font-mono">{metrics.duration?.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </main>

          {/* Input Footer */}
          <footer className="backdrop-blur-xl bg-white/5 border-t border-white/10 px-6 py-4 flex-shrink-0">
            {/* Auto-selected Agents Display */}
            {activeAgents.length > 0 && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-400">🤖 Active Agents:</span>
                <div className="flex flex-wrap gap-2">
                  {activeAgents.map((agent, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs"
                    >
                      {agent.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
                <span className="text-gray-500 text-xs ml-auto">
                  (auto-selected based on your prompt)
                </span>
              </div>
            )}

            <div className="space-y-3">
              {/* File Upload Section (Collapsible) */}
              {showFileUpload && (
                <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4">
                  <FileUpload
                    files={uploadedFiles}
                    onFilesChange={setUploadedFiles}
                  />
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className={`relative p-3 rounded-xl transition-all ${
                    showFileUpload || uploadedFiles.length > 0
                      ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                      : 'bg-white/10 border border-white/20 text-gray-400 hover:text-white hover:bg-white/20'
                  }`}
                  title="Attach files or images"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {uploadedFiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {uploadedFiles.length}
                    </span>
                  )}
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Describe what you want to build... (🎤 voice, Ctrl+V paste)"
                  disabled={isLoading}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                />
                <VoiceRecorder
                  onTranscription={(text) => {
                    setInputValue(prev => prev ? `${prev} ${text}` : text);
                  }}
                  onError={(error) => {
                    console.error('Voice recording error:', error);
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!inputValue.trim() && uploadedFiles.length === 0)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳' : '🚀'}
                </button>
              </form>
            </div>
          </footer>
        </div>

        {/* Right Panel - Preview (70%) */}
        <div className="w-[70%] flex flex-col backdrop-blur-xl bg-gray-900/50">
          <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <h3 className="text-white font-semibold">Live Preview</h3>
            {sandboxId && (
              <div className="text-xs text-white/60">
                Sandbox: {sandboxId}
              </div>
            )}
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {previewUrl ? (
              <div className="h-full flex flex-col">
                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                  <div className="text-blue-400 text-sm flex items-center gap-2">
                    <span>🌐 Preview URL:</span>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:underline font-mono"
                    >
                      {previewUrl}
                    </a>
                  </div>
                </div>
                <iframe
                  src={previewUrl}
                  className="flex-1 w-full bg-white rounded-xl border border-white/20"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
            ) : previewCode ? (
              <iframe
                srcDoc={previewCode}
                className="w-full h-full bg-white rounded-xl border border-white/20"
                title="Preview"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/40">
                  <svg className="w-24 h-24 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">Preview will appear here</p>
                  <p className="text-sm">Start by describing your project</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History Slide-out Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-white/10 p-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📜</span>
                    Version History
                  </h2>
                  <p className="text-sm text-white/60 mt-1">{versionHistory.length} snapshots saved</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Snapshot List */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)] space-y-3">
              {versionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/40">No version history yet</p>
                  <p className="text-white/30 text-sm mt-2">Snapshots are created after each generation</p>
                </div>
              ) : (
                versionHistory.slice().reverse().map((snapshot, index) => (
                  <div
                    key={snapshot.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm">{snapshot.label}</h3>
                        <p className="text-white/50 text-xs mt-1">
                          {new Date(snapshot.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => restoreSnapshot(snapshot.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
                      >
                        Restore
                      </button>
                    </div>
                    <div className="text-white/60 text-xs">
                      {snapshot.messages.length} messages • {snapshot.previewCode.length > 0 ? 'Has preview' : 'No preview'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-4 bg-gray-900/80 flex justify-between items-center">
              <button
                onClick={() => createSnapshot()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Create Snapshot Now
              </button>
              <span className="text-white/40 text-xs">
                Auto-saves after each generation
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
