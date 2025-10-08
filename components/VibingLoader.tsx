'use client';

import { useState, useEffect } from 'react';

interface VibingLoaderProps {
  message?: string;
}

const VIBE_WORDS = [
  'vibing',
  'cooking',
  'brewing',
  'crafting',
  'building',
  'conjuring',
  'weaving',
  'architecting',
  'synthesizing',
  'composing',
  'engineering',
  'designing',
  'sculpting',
  'forging',
  'assembling',
  'rendering',
  'compiling',
  'optimizing',
  'refactoring',
  'iterating',
  'debugging',
  'deploying',
  'shipping',
  'patching',
  'merging',
];

export default function VibingLoader({ message }: VibingLoaderProps) {
  const [dots, setDots] = useState('.');
  const [wordIndex, setWordIndex] = useState(Math.floor(Math.random() * VIBE_WORDS.length));
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    // Animate dots: . .. ...
    const dotInterval = setInterval(() => {
      setDotCount((prev) => {
        const next = prev >= 3 ? 1 : prev + 1;
        setDots('.'.repeat(next));

        // Change word when dots reset to 1
        if (next === 1 && !message) {
          setWordIndex((prevIndex) => {
            let newIndex;
            do {
              newIndex = Math.floor(Math.random() * VIBE_WORDS.length);
            } while (newIndex === prevIndex && VIBE_WORDS.length > 1);
            return newIndex;
          });
        }

        return next;
      });
    }, 500);

    return () => clearInterval(dotInterval);
  }, [message]);

  // Extract emoji from message if present
  const messageText = message || VIBE_WORDS[wordIndex];
  const emojiMatch = messageText.match(/^([\u{1F300}-\u{1F9FF}])\s*/u);
  const displayText = emojiMatch ? messageText.slice(emojiMatch[0].length) : messageText;

  return (
    <div className="flex items-center gap-3">
      {/* Animated Icon */}
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg animate-ping opacity-75"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></div>
      </div>

      {/* Text with dots */}
      <div className="flex items-baseline">
        <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          {displayText}
        </span>
        <span className="text-sm font-medium text-purple-600 inline-block min-w-[1.5rem]">
          {dots}
        </span>
      </div>
    </div>
  );
}
