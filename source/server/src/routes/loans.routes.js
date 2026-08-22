import express from 'express';
import {
  getLoans,
  getLoan,
  createLoan,
  updateLoanCollector,
  getLoanStats,
  generateContract
} from '../controllers/loans.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { injectSettings } from '../middlewares/settings.js';

const router = express.Router();

router.use(authenticate);
router.use(injectSettings);

router.get('/', getLoans);
router.get('/stats', getLoanStats);
router.get('/:id', getLoan);
router.post('/', authorize('ADMIN', 'ANALISTA'), createLoan);
router.patch('/:id/collector', authorize('ADMIN'), updateLoanCollector);
router.get('/:id/contract', generateContract);

export default router;