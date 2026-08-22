import express from 'express';
import {
  getPublicRegistration,
  savePublicRegistrationProgress,
  submitPublicRegistration,
} from '../controllers/registration.controller.js';

const router = express.Router();

router.get('/:token', getPublicRegistration);
router.patch('/:token/progress', savePublicRegistrationProgress);
router.post('/:token/submit', submitPublicRegistration);

export default router;
