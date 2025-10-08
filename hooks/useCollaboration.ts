/**
 * Real-time Collaboration Hook
 * Handles Socket.io connection, presence, and live updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaborationUser {
  userId: string;
  userName: string;
  socketId: string;
}

interface UseCollaborationParams {
  projectId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}

export function useCollaboration({
  projectId,
  userId,
  userName,
  enabled = true,
}: UseCollaborationParams) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    const socketInstance = io({
      path: '/api/socket',
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);

      // Join project room
      socketInstance.emit('join-project', {
        projectId,
        userId,
        userName,
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
      setIsConnected(false);
    });

    // Active users list
    socketInstance.on('active-users', ({ users }) => {
      setActiveUsers(users);
    });

    // User joined
    socketInstance.on('user-joined', ({ userId: joinedUserId, userName: joinedUserName, socketId }) => {
      setActiveUsers((prev) => [
        ...prev,
        { userId: joinedUserId, userName: joinedUserName, socketId },
      ]);
    });

    // User left
    socketInstance.on('user-left', ({ socketId }) => {
      setActiveUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    });

    // Typing indicators
    socketInstance.on('user-typing', ({ userId: typingUserId, userName: typingUserName }) => {
      setTypingUsers((prev) => new Set(prev).add(typingUserName));
    });

    socketInstance.on('user-stopped-typing', ({ userId: typingUserId, userName: typingUserName }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(typingUserName);
        return newSet;
      });
    });

    setSocket(socketInstance);

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      socketInstance.emit('heartbeat', { projectId, userId });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socketInstance.emit('leave-project', { projectId, userId });
      socketInstance.disconnect();
    };
  }, [enabled, projectId, userId, userName]);

  // Send message to other collaborators
  const broadcastMessage = useCallback(
    (message: any) => {
      if (socket && isConnected) {
        socket.emit('message-sent', { projectId, message });
      }
    },
    [socket, isConnected, projectId]
  );

  // Handle typing start
  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-start', { projectId, userId, userName });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { projectId, userId, userName });
      }, 3000);
    }
  }, [socket, isConnected, projectId, userId, userName]);

  // Handle typing stop
  const stopTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { projectId, userId, userName });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [socket, isConnected, projectId, userId, userName]);

  // Listen for incoming messages
  const onMessageReceived = useCallback((callback: (message: any) => void) => {
    if (socket) {
      socket.on('message-received', callback);
      return () => {
        socket.off('message-received', callback);
      };
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    activeUsers,
    typingUsers: Array.from(typingUsers),
    broadcastMessage,
    startTyping,
    stopTyping,
    onMessageReceived,
  };
}
