import express from 'express';
import { login, refresh, logout, getProfile, getUsers } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.get('/users', authenticate, getUsers);

export default router;