import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticate);
router.get('/stats', getDashboardStats);

export default router;