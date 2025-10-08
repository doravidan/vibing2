'use client';

interface PresenceIndicatorProps {
  activeUsers: Array<{ userId: string; userName: string; socketId: string }>;
  typingUsers: string[];
  currentUserId: string;
}

export default function PresenceIndicator({ activeUsers, typingUsers, currentUserId }: PresenceIndicatorProps) {
  const otherUsers = activeUsers.filter((u) => u.userId !== currentUserId);

  return (
    <div className="flex items-center gap-3">
      {/* Active users avatars */}
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 3).map((user) => (
          <div
            key={user.socketId}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold shadow-sm"
            title={user.userName}
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
        {otherUsers.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
            +{otherUsers.length - 3}
          </div>
        )}
      </div>

      {/* Online indicator */}
      {otherUsers.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>{otherUsers.length} online</span>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="text-xs text-gray-500 italic">
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}
    </div>
  );
}
