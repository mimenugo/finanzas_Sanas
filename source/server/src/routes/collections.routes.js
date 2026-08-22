import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { 
  getCollectionStats, 
  getOverdueLoans, 
  createCollectionLog,
  getCollectionLogs
} from '../controllers/collections.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', getCollectionStats);
router.get('/overdue', getOverdueLoans);
router.get('/logs/:loanId', getCollectionLogs);
router.post('/logs', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), createCollectionLog);

export default router;