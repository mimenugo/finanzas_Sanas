import express from 'express';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  assignAnalyst,
  deleteApplication
} from '../controllers/applications.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all applications
router.get('/', getApplications);

// Get single application
router.get('/:id', getApplication);

// Create application (ADMIN, ANALISTA)
router.post('/', authorize('ADMIN', 'ANALISTA'), createApplication);

// Update application (ADMIN, ANALISTA)
router.put('/:id', authorize('ADMIN', 'ANALISTA'), updateApplication);

// Assign analyst (ADMIN only)
router.patch('/:id/assign', authorize('ADMIN'), assignAnalyst);

// Delete application (ADMIN only)
router.delete('/:id', authorize('ADMIN'), deleteApplication);

export default router;