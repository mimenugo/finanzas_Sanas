import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notifications.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;