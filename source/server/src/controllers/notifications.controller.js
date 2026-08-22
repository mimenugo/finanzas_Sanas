import prisma from '../config/database.js';
import { emitNotification } from '../config/socket.js';

// Obtener notificaciones del usuario
export const getNotifications = async (req, res) => {
  try {
    const { limit = 10, unreadOnly = false } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Marcar como leída
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Marcar todas como leídas
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// Helper: Crear notificación Y emitir via WebSocket
export const createNotification = async (userId, type, title, message, link = null) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link
      }
    });

    // Emitir via WebSocket en tiempo real
    emitNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
  }
};