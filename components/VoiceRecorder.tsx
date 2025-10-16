'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
}

export default function VoiceRecorder({ onTranscription, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [mounted, setMounted] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Check browser support on mount
  useEffect(() => {
    setMounted(true);

    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('⚠️ Web Speech API not supported in this browser');
      return;
    }

    // Initialize SpeechRecognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening until manually stopped
    recognition.interimResults = true; // Show partial results while speaking
    recognition.lang = 'en-US'; // Set language (can be made configurable)
    recognition.maxAlternatives = 1; // Number of alternative transcriptions

    // Event handlers
    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsRecording(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      // Update interim transcript for visual feedback
      if (interim) {
        setInterimTranscript(interim);
      }

      // When we have a final result, send it
      if (final) {
        console.log('✅ Transcription:', final.trim());
        onTranscription(final.trim());
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);

      let errorMessage = 'Speech recognition failed';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your audio input.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was aborted.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      if (onError) {
        onError(errorMessage);
      }

      setIsRecording(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      console.log('🛑 Voice recognition ended');
      setIsRecording(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [onTranscription, onError]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      const errorMsg = 'Speech recognition not initialized';
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      // If already started, this will throw an error - just ignore it
      if (error.message && !error.message.includes('already started')) {
        console.error('Failed to start recognition:', error);
        if (onError) onError('Failed to start voice recording');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    }
  };

  const handleClick = () => {
    if (!isSupported) {
      const errorMsg = 'Voice input not supported in this browser. Please use Chrome, Edge, or Safari.';
      if (onError) onError(errorMsg);
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Don't render if not mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="p-3 rounded-xl bg-white/10 border border-white/20 text-gray-400"
        title="Loading voice recorder..."
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  // Don't render if not supported
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed"
        title="Voice input not supported in this browser"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth={2} />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={`relative p-3 rounded-xl transition-all ${
          isRecording
            ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse'
            : 'bg-white/10 border border-white/20 text-gray-400 hover:text-white hover:bg-white/20'
        }`}
        title={isRecording ? 'Stop recording' : 'Start voice recording (free, no API key required)'}
      >
        {/* Microphone icon */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>

        {/* Recording indicator dot */}
        {isRecording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        )}
      </button>

      {/* Interim transcript (live transcription preview) */}
      {isRecording && interimTranscript && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap max-w-xs overflow-hidden text-ellipsis border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-gray-300">{interimTranscript}</span>
          </div>
        </div>
      )}

      {/* Recording status */}
      {isRecording && !interimTranscript && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-mono px-2 py-1 rounded-md whitespace-nowrap">
          🎤 Listening...
        </div>
      )}
    </div>
  );
}
