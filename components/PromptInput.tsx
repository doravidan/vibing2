interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function PromptInput({
  value,
  onChange,
  onSubmit,
  onStartTyping,
  onStopTyping,
  isLoading,
  placeholder = "Describe your project...",
}: PromptInputProps) {
  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (onStartTyping) onStartTyping();
          }}
          onBlur={() => {
            if (onStopTyping) onStopTyping();
          }}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-4 py-3 backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg"
        >
          {isLoading ? 'Generating...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
