import { Server } from 'socket.io';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(` Client connected: ${socket.id}`);

   
    socket.on('authenticate', (userId) => {
      socket.join(`user:${userId}`);
      console.log(` User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log(` Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('new-notification', notification);
    console.log(` Notification sent to user ${userId}`);
  }
};


export const emitNotificationToMany = (userIds, notification) => {
  if (io) {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('new-notification', notification);
    });
    console.log(` Notification sent to ${userIds.length} users`);
  }
};