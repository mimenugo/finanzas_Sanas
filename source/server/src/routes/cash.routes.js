import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getCashStats,
  getCashes,
  createCash,
  getCashMovements,
  createMovement,
  transferBetweenCashes,
  getCashFlow,
  closeCash,
  getCashClosures
} from '../controllers/cash.controller.js';

const router = express.Router();

// Middleware de autorización por rol
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
};

// Todas las rutas requieren autenticación
router.use(authenticate);

// Stats y flujo
router.get('/stats', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getCashStats);
router.get('/flow', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getCashFlow);

// Cajas
router.get('/', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getCashes);
router.post('/', authorize('ADMIN'), createCash);

// Movimientos
router.get('/:cashId/movements', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), getCashMovements);
router.post('/movements', authorize('ADMIN', 'ANALISTA', 'COBRADOR'), createMovement);

// Transferencias
router.post('/transfers', authorize('ADMIN'), transferBetweenCashes);

// Cierres
router.post('/closures', authorize('ADMIN', 'ANALISTA'), closeCash);
router.get('/closures', authorize('ADMIN', 'ANALISTA'), getCashClosures);
router.get('/:cashId/closures', authorize('ADMIN', 'ANALISTA'), getCashClosures);

export default router;