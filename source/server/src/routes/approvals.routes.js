import express from 'express';
import {
  approveApplication,
  rejectApplication,
  getApprovals,
  getApprovalStats
} from '../controllers/approvals.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all approvals (ADMIN, ANALISTA, CONSULTA)
router.get('/', authorize('ADMIN', 'ANALISTA', 'CONSULTA'), getApprovals);

// Get approval stats
router.get('/stats', authorize('ADMIN', 'ANALISTA'), getApprovalStats);

// Approve application (ADMIN, ANALISTA)
router.post('/:applicationId/approve', authorize('ADMIN', 'ANALISTA'), approveApplication);

// Reject application (ADMIN, ANALISTA)
router.post('/:applicationId/reject', authorize('ADMIN', 'ANALISTA'), rejectApplication);

export default router;