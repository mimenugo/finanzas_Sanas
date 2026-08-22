import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import customersRoutes from './routes/customers.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import approvalsRoutes from './routes/approvals.routes.js';
import loansRoutes from './routes/loans.routes.js';
import paymantsRoutes from './routes/payments.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import { createServer } from 'http'; 
import { initializeSocket } from './config/socket.js';
import collectionRoutes from './routes/collections.routes.js';
import cashRoutes from './routes/cash.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import { startCronJobs} from './utils/cronJobs.js';
import reportsRoutes from './routes/reports.routes.js';
import userRoutes from './routes/users.routes.js';
import registrationRoutes from './routes/registration.routes.js';
import paymentCollectionsRoutes from './routes/paymentCollections.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
].filter(Boolean);

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parser
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || `${7 * 1024 * 1024}`, 10) },
  abortOnLimit: true,
  responseOnLimit: 'El archivo supera el limite permitido de 7 MB.',
}));

// Configurar headers CORS para archivos estáticos
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/registration', registrationRoutes);
app.use('/api/payment-collections', paymentCollectionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/payments', paymantsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler
app.use(errorHandler);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const httpServer = createServer(app);
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV}`);
  console.log(` Socket.io initialized`);
  
  startCronJobs();
  console.log(' Cron jobs started - Overdue installments will update daily at 00:01 AM');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(' SIGINT received, closing server...');
  httpServer.close(() => {
    console.log(' Server closed gracefully');
    process.exit(0);
  });
});
