/**
 * Custom Next.js server with Socket.io
 */

// Load environment variables explicitly (in priority order)
// .env.development.local has highest priority, .env has lowest
require('dotenv').config({ path: '.env', override: false });
require('dotenv').config({ path: '.env.local', override: true });
require('dotenv').config({ path: '.env.development.local', override: true });

const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { readFileSync } = require('fs');
const { join } = require('path');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const httpsPort = parseInt(process.env.HTTPS_PORT || '3443', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

app.prepare().then(() => {
  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };

  const httpServer = createServer(requestHandler);

  // Create HTTPS server if SSL certificates exist (works in both dev and production)
  let httpsServer = null;
  try {
    const sslPath = join(__dirname, 'ssl');
    const httpsOptions = {
      key: readFileSync(join(sslPath, 'key.pem')),
      cert: readFileSync(join(sslPath, 'cert.pem')),
    };
    httpsServer = createHttpsServer(httpsOptions, requestHandler);
    console.log('✅ HTTPS enabled with self-signed certificate');
  } catch (err) {
    console.log('⚠️ HTTPS not available (certificates not found), using HTTP only');
  }

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

  // Start HTTP server
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io ready on ws://${hostname}:${port}/api/socket`);
    });

  // Start HTTPS server if available
  if (httpsServer) {
    // Initialize Socket.io for HTTPS as well
    const httpsIo = new Server(httpsServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || `https://${hostname}:${httpsPort}`,
        credentials: true,
      },
    });

    // Copy all Socket.io event handlers to HTTPS server
    httpsIo.on('connection', (socket) => {
      console.log('🔌 Client connected (HTTPS):', socket.id);

      socket.on('join-project', async ({ projectId, userId, userName }) => {
        try {
          socket.join(`project:${projectId}`);
          await prisma.presenceSession.create({
            data: { userId, projectId, socketId: socket.id, isActive: true },
          });
          const activeSessions = await prisma.presenceSession.findMany({
            where: { projectId, isActive: true },
            include: { user: { select: { id: true, name: true, email: true } } },
          });
          socket.to(`project:${projectId}`).emit('user-joined', {
            userId, userName: userName || 'Anonymous', socketId: socket.id,
          });
          socket.emit('active-users', {
            users: activeSessions.map((s) => ({
              userId: s.userId, userName: s.user.name || s.user.email, socketId: s.socketId,
            })),
          });
          console.log(`✅ User ${userId} joined project ${projectId} (HTTPS)`);
        } catch (error) {
          console.error('Error joining project:', error);
        }
      });

      socket.on('leave-project', async ({ projectId, userId }) => {
        try {
          socket.leave(`project:${projectId}`);
          await prisma.presenceSession.updateMany({
            where: { socketId: socket.id, projectId },
            data: { isActive: false, disconnectedAt: new Date() },
          });
          socket.to(`project:${projectId}`).emit('user-left', { userId, socketId: socket.id });
          console.log(`👋 User ${userId} left project ${projectId} (HTTPS)`);
        } catch (error) {
          console.error('Error leaving project:', error);
        }
      });

      socket.on('message-sent', ({ projectId, message }) => {
        socket.to(`project:${projectId}`).emit('message-received', message);
      });

      socket.on('typing-start', ({ projectId, userId, userName }) => {
        socket.to(`project:${projectId}`).emit('user-typing', { userId, userName });
      });

      socket.on('typing-stop', ({ projectId, userId, userName }) => {
        socket.to(`project:${projectId}`).emit('user-stopped-typing', { userId, userName });
      });

      socket.on('heartbeat', async ({ projectId }) => {
        try {
          await prisma.presenceSession.updateMany({
            where: { socketId: socket.id, projectId },
            data: { lastHeartbeat: new Date() },
          });
        } catch (error) {
          console.error('Heartbeat error:', error);
        }
      });

      socket.on('disconnect', async () => {
        try {
          await prisma.presenceSession.updateMany({
            where: { socketId: socket.id, isActive: true },
            data: { isActive: false, disconnectedAt: new Date() },
          });
          console.log('🔴 Client disconnected (HTTPS):', socket.id);
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      });
    });

    httpsServer
      .once('error', (err) => {
        console.error('HTTPS server error:', err);
      })
      .listen(httpsPort, hostname, () => {
        console.log(`> HTTPS Ready on https://${hostname}:${httpsPort}`);
        console.log(`> Socket.io ready on wss://${hostname}:${httpsPort}/api/socket`);
      });
  }
});
