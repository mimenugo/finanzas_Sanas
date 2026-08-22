import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware especial para descarga (acepta token en query)
const authenticateDownload = (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    
    // Si no hay en header, buscar en query params
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    
    // Verificar que sea ADMIN
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Rutas públicas
router.get('/public', settingsController.getPublicSettings);
router.get('/google-sheets/oauth/callback', settingsController.googleSheetsOAuthCallback);

// Rutas protegidas
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', settingsController.getAllSettings);
router.patch('/', settingsController.updateSettings);

// Logo
router.post('/logo', settingsController.uploadLogo);

// SMTP
router.post('/smtp/test', settingsController.testSmtpConnection);

// Google Sheets
router.post('/google-sheets/config', settingsController.saveGoogleSheetsConfig);
router.get('/google-sheets/auth-url', settingsController.getGoogleSheetsAuthUrl);
router.post('/google-sheets/test', settingsController.testGoogleSheetsConnection);
router.post('/google-sheets/import-payments', settingsController.importValidGoogleSheetPayments);
router.get('/google-sheets/template/payments', settingsController.downloadPaymentsTemplate);

// Backups (todas protegidas)
router.post('/backup/generate', settingsController.generateBackup);
router.get('/backup/list', settingsController.listBackups);
router.get('/backup/download/:fileName', settingsController.downloadBackup);
router.delete('/backup/:fileName', settingsController.deleteBackup);

// Seed defaults
router.post('/seed-defaults', settingsController.seedDefaults);

export default router;
