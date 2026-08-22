import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomerStatus,
  getCreditReferenceCustomers
} from '../controllers/customers.controller.js';
import {
  createRegistrationLink,
  getRegistrationRequests,
  updateRegistrationDecision
} from '../controllers/registration.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all customers (all roles)
router.get('/', getCustomers);

router.get('/registration/requests', authorize('ADMIN', 'ANALISTA'), getRegistrationRequests);
router.post('/registration-links', authorize('ADMIN', 'ANALISTA'), createRegistrationLink);
router.patch('/:customerId/registration-decision', authorize('ADMIN', 'ANALISTA'), updateRegistrationDecision);

// Get customers eligible as credit reference / guarantor
router.get('/credit-references', getCreditReferenceCustomers);

// Get single customer (all roles)
router.get('/:id', getCustomer);

// Create customer (ADMIN, ANALISTA)
router.post('/', authorize('ADMIN', 'ANALISTA'), createCustomer);

// Update customer (ADMIN, ANALISTA)
router.put('/:id', authorize('ADMIN', 'ANALISTA'), updateCustomer);

// Toggle status (ADMIN, ANALISTA)
router.patch('/:id/status', authorize('ADMIN', 'ANALISTA'), toggleCustomerStatus);

// Delete customer (ADMIN only)
router.delete('/:id', authorize('ADMIN'), deleteCustomer);

export default router;
