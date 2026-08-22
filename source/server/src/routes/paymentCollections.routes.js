import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  createStripeCheckoutSession,
  generatePaymentReference,
  getClientPaymentPortalByPhoneLoan,
  getClientPaymentPortal,
  getPaymentCollectionsConfig,
  getPaymentCollectionsDashboard,
  paymentProviderWebhook,
  requestClientPortalEmailCode,
  saveBankAccount,
  savePaymentMethod,
  savePaymentProvider,
  savePaymentSettings,
  verifyClientPortalEmailCode,
} from '../controllers/paymentCollections.controller.js';

const router = express.Router();

router.post('/webhooks/:providerCode', paymentProviderWebhook);
router.post('/client-portal/request-code', requestClientPortalEmailCode);
router.post('/client-portal/verify-code', verifyClientPortalEmailCode);
router.get('/client-portal', getClientPaymentPortalByPhoneLoan);
router.get('/client/:documentNumber', getClientPaymentPortal);
router.post('/client/stripe-checkout', createStripeCheckoutSession);

router.use(authenticate);

router.get('/dashboard', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getPaymentCollectionsDashboard);
router.get('/config', authorize('ADMIN', 'ANALISTA'), getPaymentCollectionsConfig);
router.put('/settings', authorize('ADMIN'), savePaymentSettings);
router.post('/methods', authorize('ADMIN'), savePaymentMethod);
router.post('/bank-accounts', authorize('ADMIN'), saveBankAccount);
router.post('/providers', authorize('ADMIN'), savePaymentProvider);
router.post('/references', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), generatePaymentReference);

export default router;
