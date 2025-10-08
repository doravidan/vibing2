/**
 * Custom Next.js server with Socket.io
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
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

        // Get all active users
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

        // Notify others
        socket.to(`project:${projectId}`).emit('user-joined', {
          userId,
          userName: userName || 'Anonymous',
          socketId: socket.id,
        });

        // Send current active users
        socket.emit('active-users', {
          users: activeSessions.map((s) => ({
            userId: s.userId,
            userName: s.user.name || s.user.email,
            socketId: s.socketId,
          })),
        });

        console.log(`✅ User ${userId} joined project ${projectId}`);
      } catch (error) {
        console.error('Error joining project:', error);
      }
    });

    // Leave project
    socket.on('leave-project', async ({ projectId, userId }) => {
      try {
        socket.leave(`project:${projectId}`);

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

        socket.to(`project:${projectId}`).emit('user-left', {
          userId,
          socketId: socket.id,
        });

        console.log(`👋 User ${userId} left project ${projectId}`);
      } catch (error) {
        console.error('Error leaving project:', error);
      }
    });

    // New message
    socket.on('message-sent', ({ projectId, message }) => {
      socket.to(`project:${projectId}`).emit('message-received', message);
    });

    // Typing indicator
    socket.on('typing-start', ({ projectId, userId, userName }) => {
      socket.to(`project:${projectId}`).emit('user-typing', {
        userId,
        userName,
      });
    });

    socket.on('typing-stop', ({ projectId, userId, userName }) => {
      socket.to(`project:${projectId}`).emit('user-stopped-typing', {
        userId,
        userName,
      });
    });

    // Heartbeat
    socket.on('heartbeat', async ({ projectId }) => {
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

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io ready on ws://${hostname}:${port}/api/socket`);
    });
});
