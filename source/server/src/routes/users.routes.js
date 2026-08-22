import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  getUserStats
} from '../controllers/users.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.patch('/:id/password', changePassword);
router.delete('/:id', deleteUser);

export default router;