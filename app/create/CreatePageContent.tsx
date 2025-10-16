'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROJECT_TYPES, ProjectType, selectAdditionalAgents, getProjectTypeConfig } from '@/lib/project-types';
import { streamSSE, createTimeoutSignal } from '@/lib/sse-parser';
import FileUpload, { UploadedFile } from '@/components/FileUpload';
import VoiceRecorder from '@/components/VoiceRecorder';
import ActivityFeed from '@/components/ActivityFeed';

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

interface Activity {
  id: string;
  type: 'thinking' | 'file' | 'progress' | 'complete' | 'error';
  action?: string;
  file?: string;
  message?: string;
  codePreview?: string;
  timestamp: number;
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
  const latestProjectTypeRef = useRef<ProjectType | null>(null);
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  }>({
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    contextPercentage: 0,
    duration: 0,
  });
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Helper to add activities
  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    setActivities(prev => [...prev, {
      ...activity,
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now(),
    }]);
  };

  // Auto-scroll to bottom when messages or progress change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, progress, error]);

  // Live duration tracking while agent is working
  useEffect(() => {
    let startTime: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    if (isLoading) {
      // Start tracking time
      startTime = Date.now();

      intervalId = setInterval(() => {
        const elapsed = (Date.now() - startTime!) / 1000; // Convert to seconds
        setMetrics(prev => ({
          ...prev,
          duration: elapsed,
        }));
      }, 100); // Update every 100ms for smooth animation
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading]);

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
          latestProjectTypeRef.current = project.projectType;
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

  // Handle URL parameters for auto-submit from dashboard
  useEffect(() => {
    console.log('🔍 Auto-submit effect triggered. hasAutoSubmitted:', hasAutoSubmittedRef.current);

    // Only run if we have URL params and haven't auto-submitted yet
    if (hasAutoSubmittedRef.current) {
      console.log('⏭️ Skipping auto-submit - already submitted');
      return;
    }

    const typeParam = searchParams.get('type');
    const promptParam = searchParams.get('prompt');
    console.log('📋 URL params - type:', typeParam, 'prompt:', promptParam?.substring(0, 50) + '...');

    // Only auto-submit if we have both type and prompt
    // Auto-submit even if projectId exists, as long as we haven't already done it
    if (typeParam && promptParam) {
      console.log('🚀 Auto-submitting from dashboard with type:', typeParam, 'and prompt:', promptParam);

      // Mark as auto-submitted FIRST to prevent duplicate submissions
      hasAutoSubmittedRef.current = true;
      console.log('✅ Marked as auto-submitted');

      // Set project type
      const projectTypeValue = typeParam as ProjectType;
      setProjectType(projectTypeValue);
      latestProjectTypeRef.current = projectTypeValue;
      const config = getProjectTypeConfig(projectTypeValue);
      if (config) {
        setActiveAgents(config.baseAgents);
      }

      // Set input value
      setInputValue(promptParam);

      // Generate project title and then trigger submission
      const generateTitleAndSubmit = async () => {
        setGeneratingTitle(true);
        let generatedTitle = '';

        try {
          const response = await fetch('/api/projects/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptParam,
              projectType: projectTypeValue,
            }),
          });

          const data = await response.json();
          if (data.success && data.title) {
            generatedTitle = data.title;
            setProjectTitle(data.title);
            console.log('✨ Generated project title:', data.title);
          } else {
            generatedTitle = `${config?.name || 'Untitled'} Project`;
            setProjectTitle(generatedTitle);
          }
        } catch (err) {
          console.error('Failed to generate title:', err);
          generatedTitle = `${config?.name || 'Untitled'} Project`;
          setProjectTitle(generatedTitle);
        } finally {
          setGeneratingTitle(false);
        }

        // NOW trigger submission after title is generated
        console.log('⏰ Title generated - triggering handleSubmit with prompt:', promptParam, 'type:', projectTypeValue, 'title:', generatedTitle);
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(fakeEvent, promptParam, projectTypeValue);
      };

      generateTitleAndSubmit();
    } else {
      console.log('❌ Not auto-submitting - missing type or prompt');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle project type selection
  const handleProjectTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    latestProjectTypeRef.current = type;
    const config = getProjectTypeConfig(type);
    if (config) {
      setActiveAgents(config.baseAgents);
    }
  };

  // Handle stop generation
  const handleStop = () => {
    console.log('🛑 Stopping generation...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setProgress('');
    setError('Generation stopped by user');
    addActivity({
      type: 'error',
      message: 'Generation stopped by user',
    });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string, overrideProjectType?: ProjectType) => {
    e.preventDefault();

    const promptToUse = overridePrompt || inputValue.trim();
    const projectTypeToUse = overrideProjectType || projectType;

    // Update the ref so auto-save always has the correct projectType
    latestProjectTypeRef.current = projectTypeToUse;

    if ((!promptToUse && uploadedFiles.length === 0) || isLoading || !projectTypeToUse) {
      console.log('❌ handleSubmit early return:', { promptToUse, uploadedFiles: uploadedFiles.length, isLoading, projectType: projectTypeToUse });
      return;
    }

    console.log('✅ handleSubmit executing with prompt:', promptToUse, 'and projectType:', projectTypeToUse);

    // Build rich prompt with file attachments
    let enrichedPrompt = promptToUse;

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

    // Clear previous activities and add initial activity
    setActivities([]);
    addActivity({
      type: 'progress',
      message: 'Analyzing your prompt and selecting optimal agents...',
    });

    // Automatically select agents based on prompt and context
    let selectedAgents = activeAgents;
    try {
      const autoSelectionResponse = await fetch('/api/agents/auto-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          projectType: projectTypeToUse,
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

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Create timeout signal (5 minutes)
    const { signal, clear: clearTimeout } = createTimeoutSignal(5 * 60 * 1000);
    let assistantMessage = '';

    try {
      // Validate request body before sending
      const requestBody = {
        messages: [...messages, userMessage],
        projectType: projectTypeToUse,
        agents: selectedAgents,
        specializedAgent: selectedSpecializedAgent || undefined,
      };

      console.log('📤 Sending request to /api/agent/stream:', JSON.stringify(requestBody, null, 2));

      // Use robust SSE streaming with automatic retry
      await streamSSE({
        url: '/api/agent/stream',
        method: 'POST',
        body: requestBody,
        signal: abortControllerRef.current.signal,
        maxRetries: 3,
        retryDelay: 2000,

        onEvent: (event) => {
          // Handle both SSE format (data.type/data.data) and direct format (type/data)
          const eventType = event.data?.type || event.type;
          const eventData = event.data?.data || event.data;

          switch (eventType) {
            case 'progress':
              setProgress(eventData.message || 'Processing...');
              addActivity({
                type: 'progress',
                message: eventData.message || 'Processing...',
              });
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
              addActivity({
                type: 'file',
                action: eventData.action,
                file: eventData.file,
              });
              break;


            case 'code_changes':
            case 'changes':
              // Extract code from changes - support HTML and JavaScript
              console.log('Code changes received:', eventData);
              if (eventData.changes && Array.isArray(eventData.changes)) {
                // Add activity for code changes
                eventData.changes.forEach((change: any) => {
                  addActivity({
                    type: 'file',
                    action: 'Updated',
                    file: change.file || 'code',
                    codePreview: change.content?.slice(0, 200),
                  });
                });

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
              addActivity({
                type: 'complete',
                message: 'Generation complete! Preview is ready.',
              });
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

                // Update cumulative metrics (preserve live duration if greater)
                setMetrics(prev => ({
                  tokensUsed: (prev?.tokensUsed || 0) + (eventData.tokensUsed || 0),
                  inputTokens: (prev?.inputTokens || 0) + (eventData.inputTokens || 0),
                  outputTokens: (prev?.outputTokens || 0) + (eventData.outputTokens || 0),
                  contextPercentage: eventData.contextPercentage, // Use latest context percentage
                  duration: Math.max(prev?.duration || 0, eventData.duration || 0), // Keep the larger duration (live or reported)
                }));
              }
              break;
          }
        },

        onError: (error) => {
          console.error('Stream error:', error);
          setError(error.message || 'Stream connection failed');
          addActivity({
            type: 'error',
            message: error.message || 'Stream connection failed',
          });
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
            // This ensures we use the LATEST projectId and projectType values, not stale closures
            const saveData = {
              projectId: latestProjectIdRef.current,
              name: projectTitle || `${latestProjectTypeRef.current} - ${new Date().toLocaleDateString()}`,
              projectType: latestProjectTypeRef.current,
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
      // Don't show error if it was an abort (user clicked stop)
      if (error.name !== 'AbortError') {
        setError(error.message || 'Failed to generate project');
      }
      setIsLoading(false);
      setProgress('');
    } finally {
      clearTimeout();
      abortControllerRef.current = null;
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
          name: projectTitle || `${latestProjectTypeRef.current} - ${new Date().toLocaleDateString()}`,
          projectType: latestProjectTypeRef.current,
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

  // Export Functions
  const handleDownloadHTML = () => {
    if (!previewCode) {
      alert('No code to download');
      return;
    }

    const blob = new Blob([previewCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle || 'project'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handleDownloadZIP = async () => {
    if (!previewCode) {
      alert('No code to download');
      return;
    }

    try {
      const JSZip = (await import('jszip')) as any;
      const zip = new JSZip.default ? new JSZip.default() : new JSZip();

      // Extract CSS from style tags
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      const styles: string[] = [];
      let match;
      while ((match = styleRegex.exec(previewCode)) !== null) {
        styles.push(match[1]);
      }

      // Extract JavaScript from script tags
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      const scripts: string[] = [];
      while ((match = scriptRegex.exec(previewCode)) !== null) {
        scripts.push(match[1]);
      }

      // Create cleaned HTML (remove style and script tags)
      let cleanedHTML = previewCode
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      // Add links to external files if we extracted any
      if (styles.length > 0) {
        cleanedHTML = cleanedHTML.replace('</head>', '  <link rel="stylesheet" href="styles.css">\n</head>');
      }
      if (scripts.length > 0) {
        cleanedHTML = cleanedHTML.replace('</body>', '  <script src="script.js"></script>\n</body>');
      }

      // Add files to ZIP
      zip.file('index.html', cleanedHTML);

      if (styles.length > 0) {
        zip.file('styles.css', styles.join('\n\n'));
      }

      if (scripts.length > 0) {
        zip.file('script.js', scripts.join('\n\n'));
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectTitle || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Failed to create ZIP file');
    }
  };

  const handleCopyCode = async () => {
    if (!previewCode) {
      alert('No code to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(previewCode);
      alert('Code copied to clipboard!');
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy code');
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
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
            >
              ← Back to Home
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
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {generatingTitle ? (
                  <>
                    <span className="animate-pulse">Generating title...</span>
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : projectTitle ? (
                  <>
                    {projectTitle}
                  </>
                ) : (
                  getProjectTypeConfig(projectType)?.name
                )}
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

            {/* Export Dropdown */}
            {previewCode && (
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  onBlur={() => setTimeout(() => setIsExportMenuOpen(false), 200)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 shadow-lg flex items-center gap-2"
                >
                  <span>⬇️</span>
                  Export
                </button>
                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50">
                    <button
                      onClick={handleDownloadHTML}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                    >
                      <span>📄</span>
                      <div>
                        <div className="font-semibold">Download HTML</div>
                        <div className="text-xs text-white/60">Single file download</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadZIP}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors flex items-center gap-3 border-t border-white/10"
                    >
                      <span>🗜️</span>
                      <div>
                        <div className="font-semibold">Download ZIP</div>
                        <div className="text-xs text-white/60">Separate HTML, CSS, JS</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCopyCode}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors flex items-center gap-3 border-t border-white/10"
                    >
                      <span>📋</span>
                      <div>
                        <div className="font-semibold">Copy to Clipboard</div>
                        <div className="text-xs text-white/60">Copy HTML code</div>
                      </div>
                    </button>
                  </div>
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
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm backdrop-blur-lg bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/20 transition-all"
            >
              ← Home
            </button>
          </div>
        </div>
      </header>

      {/* Monitoring Stripe - Live Metrics */}
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Activity Feed (30%) */}
        <div className="w-[30%] flex flex-col border-r border-white/10 backdrop-blur-xl bg-white/5">
          <main className="flex-1 overflow-y-auto px-4 py-6">
            <ActivityFeed activities={activities} isActive={isLoading} />
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
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim() && uploadedFiles.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🚀
                  </button>
                )}
              </form>
            </div>
          </footer>
        </div>

        {/* Right Panel - Preview (70%) */}
        <div className="w-[70%] flex flex-col backdrop-blur-xl bg-gray-900/50">
          <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <h3 className="text-white font-semibold">Output</h3>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'preview'
                      ? 'bg-purple-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  👁️ Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'code'
                      ? 'bg-purple-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  💻 Code
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'split'
                      ? 'bg-purple-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🔀 Split
                </button>
              </div>
              {sandboxId && (
                <div className="text-xs text-white/60">
                  Sandbox: {sandboxId}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {/* Preview Mode */}
            {viewMode === 'preview' && (
              <>
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
              </>
            )}

            {/* Code Mode */}
            {viewMode === 'code' && (
              <div className="h-full flex flex-col bg-gray-950 rounded-xl border border-white/20 overflow-hidden">
                <div className="border-b border-white/10 px-4 py-2 flex items-center justify-between bg-gray-900">
                  <span className="text-white/60 text-sm font-mono">HTML Source</span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded hover:bg-purple-500/30 transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {previewCode ? (
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap break-words">
                      {previewCode}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white/40">
                      <p>No code generated yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Split Mode */}
            {viewMode === 'split' && (
              <div className="h-full flex gap-4">
                {/* Left: Preview */}
                <div className="flex-1 flex flex-col">
                  {previewUrl ? (
                    <div className="h-full flex flex-col">
                      <div className="mb-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-blue-400 text-xs flex items-center gap-2">
                          <span>🌐</span>
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:underline font-mono truncate"
                          >
                            {previewUrl}
                          </a>
                        </div>
                      </div>
                      <iframe
                        src={previewUrl}
                        className="flex-1 w-full bg-white rounded-lg border border-white/20"
                        title="Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  ) : previewCode ? (
                    <iframe
                      srcDoc={previewCode}
                      className="w-full h-full bg-white rounded-lg border border-white/20"
                      title="Preview"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center border border-white/20 rounded-lg">
                      <p className="text-white/40 text-sm">No preview</p>
                    </div>
                  )}
                </div>

                {/* Right: Code */}
                <div className="flex-1 flex flex-col bg-gray-950 rounded-lg border border-white/20 overflow-hidden">
                  <div className="border-b border-white/10 px-4 py-2 flex items-center justify-between bg-gray-900">
                    <span className="text-white/60 text-sm font-mono">HTML Source</span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded hover:bg-purple-500/30 transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {previewCode ? (
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap break-words">
                        {previewCode}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/40">
                        <p className="text-sm">No code</p>
                      </div>
                    )}
                  </div>
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
