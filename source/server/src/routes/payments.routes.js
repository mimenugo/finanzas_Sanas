import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { 
  createPayment, 
  getPayments, 
  getPayment, 
  getPaymentStats, 
  voidPayment, 
  generateReceipt,
  previewPayment // ← AGREGAR ESTA IMPORTACIÓN
} from '../controllers/payments.controller.js';

const router = express.Router();

router.use(authenticate);

// ← AGREGAR ESTA RUTA (debe ir ANTES de '/:id')
router.post('/preview/:loanId', previewPayment);

router.post('/', createPayment);
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/:id', getPayment);
router.post('/:id/void', voidPayment);
router.get('/:id/receipt', generateReceipt);

export default router;