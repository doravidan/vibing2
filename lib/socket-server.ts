/**
 * Socket.io Server for Real-time Collaboration
 * Handles presence, live cursors, and message sync
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import prisma from './db';

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Join project room
    socket.on('join-project', async ({ projectId, userId, userName }) => {
      try {
        socket.join(`project:${projectId}`);

        // Create presence session
        await prisma.presenceSession.create({
          data: {
            userId,
            projectId,
            socketId: socket.id,
            isActive: true,
          },
        });

        // Get all active users in project
        const activeSessions = await prisma.presenceSession.findMany({
          where: {
            projectId,
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Notify others that someone joined
        socket.to(`project:${projectId}`).emit('user-joined', {
          userId,
          userName: userName || 'Anonymous',
          socketId: socket.id,
        });

        // Send current active users to the new joiner
        socket.emit('active-users', {
          users: activeSessions.map((s) => ({
            userId: s.userId,
            userName: s.user.name || s.user.email,
            socketId: s.socketId,
            cursorLine: s.cursorLine,
            cursorColumn: s.cursorColumn,
          })),
        });

        console.log(`✅ User ${userId} joined project ${projectId}`);
      } catch (error) {
        console.error('Error joining project:', error);
      }
    });

    // Leave project room
    socket.on('leave-project', async ({ projectId, userId }) => {
      try {
        socket.leave(`project:${projectId}`);

        // Update presence session
        await prisma.presenceSession.updateMany({
          where: {
            socketId: socket.id,
            projectId,
          },
          data: {
            isActive: false,
            disconnectedAt: new Date(),
          },
        });

        // Notify others
        socket.to(`project:${projectId}`).emit('user-left', {
          userId,
          socketId: socket.id,
        });

        console.log(`👋 User ${userId} left project ${projectId}`);
      } catch (error) {
        console.error('Error leaving project:', error);
      }
    });

    // Cursor movement
    socket.on('cursor-move', async ({ projectId, userId, line, column }) => {
      try {
        // Update cursor position
        await prisma.presenceSession.updateMany({
          where: {
            socketId: socket.id,
            projectId,
          },
          data: {
            cursorLine: line,
            cursorColumn: column,
            lastHeartbeat: new Date(),
          },
        });

        // Broadcast to others
        socket.to(`project:${projectId}`).emit('cursor-update', {
          userId,
          socketId: socket.id,
          line,
          column,
        });
      } catch (error) {
        console.error('Error updating cursor:', error);
      }
    });

    // New message sent
    socket.on('message-sent', ({ projectId, message }) => {
      // Broadcast new message to all users in project
      socket.to(`project:${projectId}`).emit('message-received', message);
    });

    // Code update
    socket.on('code-update', ({ projectId, code }) => {
      // Broadcast code changes to all users
      socket.to(`project:${projectId}`).emit('code-changed', { code });
    });

    // Typing indicator
    socket.on('typing-start', ({ projectId, userId, userName }) => {
      socket.to(`project:${projectId}`).emit('user-typing', {
        userId,
        userName,
      });
    });

    socket.on('typing-stop', ({ projectId, userId }) => {
      socket.to(`project:${projectId}`).emit('user-stopped-typing', {
        userId,
      });
    });

    // Heartbeat to keep presence alive
    socket.on('heartbeat', async ({ projectId, userId }) => {
      try {
        await prisma.presenceSession.updateMany({
          where: {
            socketId: socket.id,
            projectId,
          },
          data: {
            lastHeartbeat: new Date(),
          },
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        // Mark all sessions for this socket as inactive
        await prisma.presenceSession.updateMany({
          where: {
            socketId: socket.id,
            isActive: true,
          },
          data: {
            isActive: false,
            disconnectedAt: new Date(),
          },
        });

        console.log('🔴 Client disconnected:', socket.id);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });

  return io;
}
