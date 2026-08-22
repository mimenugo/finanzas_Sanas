import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getPortfolioReport,
  getIncomeReport,
  getDisbursementReport,
  getOverdueReport,
  getCollectorPerformanceReport,
  getCustomerReport,
  getAuditReport
} from '../controllers/reports.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/portfolio', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getPortfolioReport);
router.get('/income', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getIncomeReport);
router.get('/disbursements', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getDisbursementReport);
router.get('/overdue', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getOverdueReport);
router.get('/collector-performance', authorize('ADMIN', 'ANALISTA'), getCollectorPerformanceReport);
router.get('/customers', authorize('ADMIN', 'ANALISTA'), getCustomerReport);
router.get('/audit', authorize('ADMIN'), getAuditReport);

export default router;