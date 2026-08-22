import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import { getPaymentProvider, registeredProviderCodes } from '../payments/providers/registry.js';

const defaultSettings = [
  ['currency', 'MXN', 'general'],
  ['timezone', 'America/Tijuana', 'general'],
  ['country', 'MX', 'general'],
  ['reference_prefix', 'CRD', 'references'],
  ['reference_length', '12', 'references'],
  ['reference_expiration_hours', '72', 'references'],
  ['max_confirmation_hours', '24', 'general'],
  ['max_attempts', '3', 'general'],
  ['fee_paid_by', 'COMPANY', 'general'],
  ['notifications_enabled', 'true', 'notifications'],
];

const defaultMethods = [
  ['CASH', 'Efectivo', 'Pago recibido en caja', null, 1],
  ['SPEI', 'Transferencia SPEI', 'Transferencia bancaria SPEI', 'SPEI', 2],
  ['BANK_DEPOSIT', 'Deposito Bancario', 'Deposito en cuenta bancaria', 'BANK_REFERENCE', 3],
  ['DEBIT_CARD', 'Tarjeta Debito', 'Pago con tarjeta de debito', 'STRIPE', 4],
  ['CREDIT_CARD', 'Tarjeta Credito', 'Pago con tarjeta de credito', 'STRIPE', 5],
  ['OXXO', 'Pago OXXO', 'Referencia para pago en OXXO', 'OXXO', 6],
  ['CONVENIENCE_STORE', 'Tiendas de conveniencia', 'Pago en comercios aliados', 'BANK_REFERENCE', 7],
  ['STRIPE', 'Stripe', 'Pasarela Stripe preparada', 'STRIPE', 8],
  ['OPENPAY', 'Openpay', 'Pasarela Openpay preparada', 'OPENPAY', 9],
  ['CONEKTA', 'Conekta', 'Pasarela Conekta preparada', 'CONEKTA', 10],
  ['MERCADO_PAGO', 'Mercado Pago', 'Pasarela Mercado Pago preparada', 'MERCADO_PAGO', 11],
  ['PAYPAL', 'PayPal', 'Pasarela PayPal preparada', 'PAYPAL', 12],
];

const defaultProviders = [
  ['STRIPE', 'Stripe'],
  ['OPENPAY', 'Openpay'],
  ['CONEKTA', 'Conekta'],
  ['MERCADO_PAGO', 'Mercado Pago'],
  ['PAYPAL', 'PayPal'],
  ['SPEI', 'SPEI Bancario'],
  ['OXXO', 'OXXO'],
  ['BANK_REFERENCE', 'Referencia Bancaria'],
];

const upsertDefaults = async () => {
  await Promise.all(defaultSettings.map(([key, value, category]) =>
    prisma.paymentSetting.upsert({
      where: { key },
      update: {},
      create: { key, value, category },
    })
  ));

  await Promise.all(defaultMethods.map(([code, name, description, providerCode, sortOrder]) =>
    prisma.paymentMethodConfig.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        description,
        providerCode,
        sortOrder,
        active: ['CASH', 'SPEI', 'BANK_DEPOSIT'].includes(code),
      },
    })
  ));

  await Promise.all(defaultProviders.map(([code, name]) =>
    prisma.paymentProviderConfig.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        mode: 'SANDBOX',
        active: false,
        credentials: {},
        webhookUrls: {},
        settings: {},
      },
    })
  ));
};

const settingMap = async () => {
  await upsertDefaults();
  const settings = await prisma.paymentSetting.findMany();
  return settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
};

const generateReferenceValue = async () => {
  const settings = await settingMap();
  const prefix = settings.reference_prefix || 'CRD';
  const length = parseInt(settings.reference_length || '12');
  const random = crypto.randomInt(10 ** Math.min(length - 1, 8), 10 ** Math.min(length, 9)).toString();
  return `${prefix}${Date.now().toString().slice(-6)}${random}`.slice(0, Math.max(prefix.length + length, 10));
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

const phoneMatches = (storedPhone, inputPhone) => {
  const stored = normalizePhone(storedPhone);
  const input = normalizePhone(inputPhone);
  if (!stored || !input) return false;
  return stored === input || stored.endsWith(input) || input.endsWith(stored);
};

const maskEmail = (email) => {
  const [name = '', domain = ''] = String(email || '').split('@');
  if (!name || !domain) return '';
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(name.length - visible.length, 3))}@${domain}`;
};

const hashPortalSecret = (value) => crypto
  .createHash('sha256')
  .update(`${value}:${process.env.JWT_SECRET || 'finanzas-sanas-local'}`)
  .digest('hex');

const getNotificationSettings = async () => {
  const rows = await prisma.settings.findMany({
    where: {
      key: {
        in: [
          'smtp_host',
          'smtp_port',
          'smtp_user',
          'smtp_password',
          'smtp_from_name',
          'smtp_from_email',
        ],
      },
    },
  });

  return rows.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
};

const sendClientPortalOtpEmail = async ({ to, code, customerName, loanId, req }) => {
  const settings = await getNotificationSettings();
  const host = settings.smtp_host;
  const port = parseInt(settings.smtp_port || '587', 10);
  const user = settings.smtp_user;
  const password = settings.smtp_password;
  const fromEmail = settings.smtp_from_email || user;
  const fromName = settings.smtp_from_name || 'Finanzas Sanas';
  const isLocalRequest = ['localhost', '127.0.0.1', '::1'].includes(req.hostname);

  if (!host || !port || !user || !password || !fromEmail) {
    if (isLocalRequest) {
      return { sent: false, debugCode: code, message: 'SMTP no configurado. Codigo visible solo en entorno local.' };
    }

    const error = new Error('No esta configurado el correo SMTP para enviar codigos de acceso');
    error.statusCode = 503;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Codigo de acceso a Mis Pagos',
    text: `Hola ${customerName}. Tu codigo de acceso para la cuenta #${loanId} es ${code}. Expira en ${OTP_TTL_MINUTES} minutos.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2>Codigo de acceso a Mis Pagos</h2>
        <p>Hola ${customerName}, usa este codigo para consultar tu cuenta #${loanId}:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</p>
        <p>Este codigo expira en ${OTP_TTL_MINUTES} minutos.</p>
        <p>Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      </div>
    `,
  });

  return { sent: true };
};

const findLoanForClientPortal = async ({ phone, loanId }) => {
  const loan = await prisma.loan.findUnique({
    where: { id: parseInt(loanId, 10) },
    include: { customer: true },
  });

  if (!loan || !phoneMatches(loan.customer.phone, phone)) return null;
  return loan;
};

const validateClientPortalToken = async ({ phone, loanId, accessToken }) => {
  if (!accessToken) return null;

  const loan = await findLoanForClientPortal({ phone, loanId });
  if (!loan) return null;

  const otp = await prisma.clientPortalOtp.findFirst({
    where: {
      customerId: loan.customerId,
      loanId: loan.id,
      tokenHash: hashPortalSecret(accessToken),
      status: 'VERIFIED',
      expiresAt: { gt: new Date() },
    },
    orderBy: { verifiedAt: 'desc' },
  });

  return otp ? loan : null;
};

const getStripeProviderConfig = async () => {
  const provider = await prisma.paymentProviderConfig.findUnique({ where: { code: 'STRIPE' } });
  if (!provider?.active) {
    const error = new Error('Stripe no esta activo en Pagos y Cobranza > Pasarelas');
    error.statusCode = 400;
    throw error;
  }

  const secretKey = provider.credentials?.secretKey;
  if (!secretKey) {
    const error = new Error('Falta configurar Secret Key de Stripe en Pagos y Cobranza > Pasarelas');
    error.statusCode = 400;
    throw error;
  }

  return { provider, stripe: new Stripe(secretKey) };
};

const getSystemUserId = async () => {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    orderBy: { id: 'asc' },
  });
  return admin?.id || 1;
};

const applyStripePaymentToLoan = async ({ tx, transaction, providerResponse, paymentDate = new Date() }) => {
  if (transaction.paymentId) return transaction.paymentId;

  const loan = await tx.loan.findUnique({
    where: { id: transaction.loanId },
    include: {
      customer: true,
      installments: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  });

  if (!loan || loan.status !== 'ACTIVE') {
    throw new Error('Prestamo no disponible para aplicar pago');
  }

  const paymentAmount = parseFloat(transaction.amount);
  let remainingAmount = paymentAmount;
  const tolerance = 0.005;
  const installmentsToPay = [];

  for (const installment of loan.installments) {
    if (remainingAmount <= tolerance) break;

    const lateFee = parseFloat(installment.lateFee || 0);
    const totalDue = parseFloat(installment.total) + lateFee;

    if (remainingAmount >= totalDue - tolerance) {
      installmentsToPay.push({
        installmentId: installment.id,
        amount: totalDue,
        principal: parseFloat(installment.principal),
        lateFee,
      });
      remainingAmount = Math.max(0, Math.round((remainingAmount - totalDue) * 100) / 100);
    } else {
      break;
    }
  }

  if (!installmentsToPay.length) {
    throw new Error('El monto confirmado no cubre una cuota pendiente completa');
  }

  const systemUserId = await getSystemUserId();
  const payment = await tx.payment.create({
    data: {
      loanId: loan.id,
      collectedBy: systemUserId,
      amount: paymentAmount,
      paymentDate,
      paymentMethod: 'STRIPE',
      reference: transaction.reference || transaction.providerTransactionId,
      observations: 'Pago confirmado automaticamente por Stripe Checkout',
    },
  });

  for (const item of installmentsToPay) {
    await tx.paymentInstallment.create({
      data: {
        paymentId: payment.id,
        installmentId: item.installmentId,
        amount: item.amount,
      },
    });

    await tx.installment.update({
      where: { id: item.installmentId },
      data: {
        status: 'PAID',
        paidAt: paymentDate,
        lateFee: item.lateFee,
        paidAmount: item.amount,
      },
    });
  }

  const capitalPaid = installmentsToPay.reduce((sum, item) => sum + item.principal, 0);
  const newBalance = Math.max(0, parseFloat(loan.balance) - capitalPaid);
  const pendingAfterPayment = await tx.installment.count({
    where: {
      loanId: loan.id,
      status: { in: ['PENDING', 'OVERDUE'] },
      id: { notIn: installmentsToPay.map((item) => item.installmentId) },
    },
  });

  await tx.loan.update({
    where: { id: loan.id },
    data: {
      balance: newBalance < 0.01 ? 0 : newBalance,
      status: (newBalance < 0.01 || pendingAfterPayment === 0) ? 'PAID' : 'ACTIVE',
    },
  });

  await tx.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      paymentId: payment.id,
      status: 'CONFIRMED',
      confirmedAt: paymentDate,
      providerResponse,
      notes: 'Pago aplicado automaticamente al prestamo por webhook Stripe',
    },
  });

  return payment.id;
};

export const getPaymentCollectionsDashboard = async (req, res) => {
  try {
    await upsertDefaults();
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayPayments,
      monthPayments,
      pendingTransactions,
      confirmedTransactions,
      rejectedTransactions,
      processingTransactions,
      canceledTransactions,
      refundedTransactions,
      overdueInstallments,
      providerRows,
      latestTransactions,
    ] = await Promise.all([
      prisma.payment.aggregate({ where: { paymentDate: { gte: startToday } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { paymentDate: { gte: startMonth } }, _sum: { amount: true } }),
      prisma.paymentTransaction.count({ where: { status: 'PENDING' } }),
      prisma.paymentTransaction.count({ where: { status: 'CONFIRMED' } }),
      prisma.paymentTransaction.count({ where: { status: 'REJECTED' } }),
      prisma.paymentTransaction.count({ where: { status: 'PROCESSING' } }),
      prisma.paymentTransaction.count({ where: { status: 'CANCELED' } }),
      prisma.paymentTransaction.count({ where: { status: 'REFUNDED' } }),
      prisma.installment.count({ where: { status: 'OVERDUE' } }),
      prisma.paymentTransaction.groupBy({ by: ['providerId'], _sum: { amount: true }, _count: { id: true } }),
      prisma.paymentTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { method: true, provider: true, customer: true, loan: true },
      }),
    ]);

    res.json({
      totals: {
        today: todayPayments._sum.amount || 0,
        month: monthPayments._sum.amount || 0,
        pending: pendingTransactions,
        confirmed: confirmedTransactions,
        rejected: rejectedTransactions,
        processing: processingTransactions,
        canceled: canceledTransactions,
        refunded: refundedTransactions,
        overduePayments: overdueInstallments,
      },
      byProvider: providerRows,
      latestTransactions,
    });
  } catch (error) {
    console.error('Payment collections dashboard error:', error);
    res.status(500).json({ error: 'No se pudo cargar dashboard de pagos' });
  }
};

export const getPaymentCollectionsConfig = async (req, res) => {
  try {
    await upsertDefaults();
    const [settings, methods, accounts, providers] = await Promise.all([
      prisma.paymentSetting.findMany({ orderBy: { key: 'asc' } }),
      prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.paymentProviderConfig.findMany({ orderBy: { name: 'asc' } }),
    ]);

    res.json({ settings, methods, accounts, providers, registeredProviderCodes });
  } catch (error) {
    console.error('Payment collections config error:', error);
    res.status(500).json({ error: 'No se pudo cargar configuracion de pagos' });
  }
};

export const savePaymentSettings = async (req, res) => {
  try {
    const entries = Object.entries(req.body || {});
    await Promise.all(entries.map(([key, value]) =>
      prisma.paymentSetting.upsert({
        where: { key },
        update: { value: `${value}` },
        create: { key, value: `${value}`, category: 'general' },
      })
    ));

    res.json({ message: 'Configuracion guardada' });
  } catch (error) {
    console.error('Save payment settings error:', error);
    res.status(500).json({ error: 'No se pudo guardar configuracion' });
  }
};

export const savePaymentMethod = async (req, res) => {
  try {
    const data = req.body;
    const method = await prisma.paymentMethodConfig.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        providerCode: data.providerCode || null,
        active: Boolean(data.active),
        sortOrder: parseInt(data.sortOrder || 0),
        feeType: data.feeType || 'FIXED',
        feeValue: parseFloat(data.feeValue || 0),
        feePaidBy: data.feePaidBy || 'COMPANY',
        minAmount: data.minAmount ? parseFloat(data.minAmount) : null,
        maxAmount: data.maxAmount ? parseFloat(data.maxAmount) : null,
      },
      create: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        providerCode: data.providerCode || null,
        active: Boolean(data.active),
        sortOrder: parseInt(data.sortOrder || 0),
        feeType: data.feeType || 'FIXED',
        feeValue: parseFloat(data.feeValue || 0),
        feePaidBy: data.feePaidBy || 'COMPANY',
        minAmount: data.minAmount ? parseFloat(data.minAmount) : null,
        maxAmount: data.maxAmount ? parseFloat(data.maxAmount) : null,
      },
    });

    res.json(method);
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({ error: 'No se pudo guardar metodo de pago' });
  }
};

export const saveBankAccount = async (req, res) => {
  try {
    const data = req.body;
    const account = data.id
      ? await prisma.bankAccount.update({
          where: { id: parseInt(data.id) },
          data: {
            ...data,
            isPrimary: Boolean(data.isPrimary),
            active: Boolean(data.active),
            useSpei: Boolean(data.useSpei),
            useDeposits: Boolean(data.useDeposits),
            useReferences: Boolean(data.useReferences),
            useTransfers: Boolean(data.useTransfers),
          },
        })
      : await prisma.bankAccount.create({
          data: {
            bank: data.bank,
            name: data.name,
            accountHolder: data.accountHolder,
            accountNumber: data.accountNumber,
            clabe: data.clabe,
            cardNumber: data.cardNumber,
            branch: data.branch,
            currency: data.currency || 'MXN',
            accountType: data.accountType,
            isPrimary: Boolean(data.isPrimary),
            active: data.active !== false,
            color: data.color,
            logoUrl: data.logoUrl,
            useSpei: Boolean(data.useSpei),
            useDeposits: Boolean(data.useDeposits),
            useReferences: Boolean(data.useReferences),
            useTransfers: Boolean(data.useTransfers),
          },
        });

    res.json(account);
  } catch (error) {
    console.error('Save bank account error:', error);
    res.status(500).json({ error: 'No se pudo guardar cuenta bancaria' });
  }
};

export const savePaymentProvider = async (req, res) => {
  try {
    const data = req.body;
    const provider = await prisma.paymentProviderConfig.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        mode: data.mode || 'SANDBOX',
        active: Boolean(data.active),
        credentials: data.credentials || {},
        webhookUrls: data.webhookUrls || {},
        settings: data.settings || {},
      },
      create: {
        code: data.code,
        name: data.name,
        mode: data.mode || 'SANDBOX',
        active: Boolean(data.active),
        credentials: data.credentials || {},
        webhookUrls: data.webhookUrls || {},
        settings: data.settings || {},
      },
    });

    res.json(provider);
  } catch (error) {
    console.error('Save payment provider error:', error);
    res.status(500).json({ error: 'No se pudo guardar proveedor' });
  }
};

export const generatePaymentReference = async (req, res) => {
  try {
    const { loanId, methodCode = 'BANK_DEPOSIT', amount } = req.body;
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: { customer: true },
    });

    if (!loan) return res.status(404).json({ error: 'Prestamo no encontrado' });

    const method = await prisma.paymentMethodConfig.findUnique({ where: { code: methodCode } });
    if (!method || !method.active) return res.status(400).json({ error: 'Metodo no disponible' });

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { active: true, OR: [{ useReferences: true }, { useSpei: true }, { useDeposits: true }] },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const settings = await settingMap();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(settings.reference_expiration_hours || '72'));
    const reference = await generateReferenceValue();
    const provider = method.providerCode ? await prisma.paymentProviderConfig.findUnique({ where: { code: method.providerCode } }) : null;
    const adapter = getPaymentProvider(method.providerCode || method.code, provider || {});
    const providerReference = await adapter.createReference({ reference, amount: parseFloat(amount || loan.balance), expiresAt });

    const paymentReference = await prisma.paymentReference.create({
      data: {
        loanId: loan.id,
        customerId: loan.customerId,
        methodId: method.id,
        bankAccountId: bankAccount?.id || null,
        reference: providerReference.reference || reference,
        barcode: providerReference.barcode || null,
        amount: parseFloat(amount || loan.balance),
        fee: parseFloat(method.feeValue || 0),
        status: 'PENDING',
        expiresAt,
      },
      include: { method: true, bankAccount: true, loan: { include: { customer: true } } },
    });

    await prisma.paymentTransaction.create({
      data: {
        folio: `TX-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
        loanId: loan.id,
        customerId: loan.customerId,
        methodId: method.id,
        providerId: provider?.id || null,
        bankAccountId: bankAccount?.id || null,
        amount: parseFloat(amount || loan.balance),
        fee: parseFloat(method.feeValue || 0),
        status: 'PENDING',
        reference: paymentReference.reference,
        ipAddress: req.ip,
        browser: req.headers['user-agent'],
        providerResponse: providerReference.raw || providerReference,
        createdBy: req.user?.id || null,
      },
    });

    res.status(201).json(paymentReference);
  } catch (error) {
    console.error('Generate payment reference error:', error);
    res.status(500).json({ error: 'No se pudo generar referencia' });
  }
};

export const getClientPaymentPortal = async (req, res) => {
  try {
    const { documentNumber } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { documentNumber },
      include: {
        loans: {
          include: {
            installments: { orderBy: { installmentNumber: 'asc' } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    const methods = await prisma.paymentMethodConfig.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ customer, methods });
  } catch (error) {
    console.error('Client payment portal error:', error);
    res.status(500).json({ error: 'No se pudo cargar Mis Pagos' });
  }
};

export const requestClientPortalEmailCode = async (req, res) => {
  try {
    const { phone, loanId } = req.body;

    if (!phone || !loanId) {
      return res.status(400).json({ error: 'Telefono y numero de cuenta son requeridos' });
    }

    const loan = await findLoanForClientPortal({ phone, loanId });
    if (!loan) {
      return res.status(404).json({ error: 'No se encontro una cuenta con ese telefono' });
    }

    if (!loan.customer.email) {
      return res.status(400).json({ error: 'El cliente no tiene correo registrado. Solicita actualizar tus datos.' });
    }

    const recentCode = await prisma.clientPortalOtp.findFirst({
      where: {
        customerId: loan.customerId,
        loanId: loan.id,
        status: 'PENDING',
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCode) {
      return res.status(429).json({ error: 'Espera 60 segundos antes de solicitar otro codigo' });
    }

    await prisma.clientPortalOtp.updateMany({
      where: {
        customerId: loan.customerId,
        loanId: loan.id,
        status: 'PENDING',
      },
      data: { status: 'CANCELED' },
    });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await prisma.clientPortalOtp.create({
      data: {
        customerId: loan.customerId,
        loanId: loan.id,
        email: loan.customer.email,
        codeHash: hashPortalSecret(code),
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      },
    });

    const emailResult = await sendClientPortalOtpEmail({
      to: loan.customer.email,
      code,
      customerName: `${loan.customer.firstName} ${loan.customer.lastName}`.trim(),
      loanId: loan.id,
      req,
    });

    res.json({
      message: emailResult.sent
        ? 'Codigo enviado al correo registrado'
        : emailResult.message,
      maskedEmail: maskEmail(loan.customer.email),
      expiresInMinutes: OTP_TTL_MINUTES,
      debugCode: emailResult.debugCode,
    });
  } catch (error) {
    console.error('Request client portal email code error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo enviar el codigo' });
  }
};

export const verifyClientPortalEmailCode = async (req, res) => {
  try {
    const { phone, loanId, code } = req.body;

    if (!phone || !loanId || !code) {
      return res.status(400).json({ error: 'Telefono, numero de cuenta y codigo son requeridos' });
    }

    const loan = await findLoanForClientPortal({ phone, loanId });
    if (!loan) {
      return res.status(404).json({ error: 'No se encontro una cuenta con ese telefono' });
    }

    const otp = await prisma.clientPortalOtp.findFirst({
      where: {
        customerId: loan.customerId,
        loanId: loan.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'Solicita un nuevo codigo de acceso' });
    }

    if (otp.expiresAt <= new Date()) {
      await prisma.clientPortalOtp.update({ where: { id: otp.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ error: 'El codigo expiro. Solicita uno nuevo.' });
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.clientPortalOtp.update({ where: { id: otp.id }, data: { status: 'BLOCKED' } });
      return res.status(429).json({ error: 'Codigo bloqueado por demasiados intentos. Solicita uno nuevo.' });
    }

    if (otp.codeHash !== hashPortalSecret(String(code).trim())) {
      await prisma.clientPortalOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: 'Codigo incorrecto' });
    }

    const accessToken = crypto.randomBytes(32).toString('hex');
    const verifiedAt = new Date();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.clientPortalOtp.update({
      where: { id: otp.id },
      data: {
        status: 'VERIFIED',
        tokenHash: hashPortalSecret(accessToken),
        verifiedAt,
        expiresAt,
      },
    });

    res.json({
      message: 'Codigo validado correctamente',
      accessToken,
      expiresAt,
      lookup: { phone: normalizePhone(phone), loanId: loan.id },
    });
  } catch (error) {
    console.error('Verify client portal email code error:', error);
    res.status(500).json({ error: 'No se pudo validar el codigo' });
  }
};

export const getClientPaymentPortalByPhoneLoan = async (req, res) => {
  try {
    const { phone, loanId, accessToken } = req.query;

    if (!phone || !loanId) {
      return res.status(400).json({ error: 'Telefono y numero de cuenta son requeridos' });
    }

    const validatedLoan = await validateClientPortalToken({ phone, loanId, accessToken });
    if (!validatedLoan) {
      return res.status(401).json({ error: 'Valida el codigo enviado a tu correo para consultar Mis Pagos' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        customer: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!loan || loan.id !== validatedLoan.id) {
      return res.status(404).json({ error: 'No se encontro una cuenta con ese telefono' });
    }

    const methods = await prisma.paymentMethodConfig.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const customer = {
      ...loan.customer,
      loans: [{
        id: loan.id,
        applicationId: loan.applicationId,
        customerId: loan.customerId,
        collectorId: loan.collectorId,
        amount: loan.amount,
        interestRate: loan.interestRate,
        term: loan.term,
        frequency: loan.frequency,
        disbursementDate: loan.disbursementDate,
        disbursementMethod: loan.disbursementMethod,
        balance: loan.balance,
        status: loan.status,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        installments: loan.installments,
        payments: loan.payments,
      }],
    };

    res.json({ customer, methods, lookup: { phone: normalizePhone(phone), loanId: loan.id } });
  } catch (error) {
    console.error('Client payment portal by phone error:', error);
    res.status(500).json({ error: 'No se pudo cargar Mis Pagos' });
  }
};

export const createStripeCheckoutSession = async (req, res) => {
  try {
    const { documentNumber, phone, loanId, installmentId, amount, accessToken } = req.body;

    if (!loanId || (!phone && !documentNumber)) {
      return res.status(400).json({ error: 'Telefono y numero de cuenta son requeridos' });
    }

    if (phone && !documentNumber) {
      const validatedLoan = await validateClientPortalToken({ phone, loanId, accessToken });
      if (!validatedLoan) {
        return res.status(401).json({ error: 'Valida el codigo enviado a tu correo antes de pagar' });
      }
    }

    const { provider, stripe } = await getStripeProviderConfig();
    const method = await prisma.paymentMethodConfig.findFirst({
      where: {
        providerCode: 'STRIPE',
        active: true,
        code: { in: ['STRIPE', 'DEBIT_CARD', 'CREDIT_CARD'] },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!method) {
      return res.status(400).json({ error: 'No hay metodo Stripe activo en Pagos y Cobranza > Metodos' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        customer: true,
        installments: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    const validCustomer = documentNumber
      ? loan?.customer.documentNumber === documentNumber
      : phoneMatches(loan?.customer.phone, phone);

    if (!loan || !validCustomer) {
      return res.status(404).json({ error: 'Cuenta no encontrada para este cliente' });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'La cuenta no esta activa' });
    }

    const selectedInstallment = installmentId
      ? loan.installments.find((item) => item.id === parseInt(installmentId))
      : loan.installments[0];

    if (!selectedInstallment) {
      return res.status(400).json({ error: 'No hay cuotas pendientes para pagar' });
    }

    const installmentAmount = parseFloat(selectedInstallment.total) + parseFloat(selectedInstallment.lateFee || 0);
    const paymentAmount = amount ? parseFloat(amount) : installmentAmount;

    if (paymentAmount < installmentAmount - 0.005) {
      return res.status(400).json({ error: 'El monto debe cubrir por lo menos la cuota seleccionada completa' });
    }

    const folio = `ST-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const transaction = await prisma.paymentTransaction.create({
      data: {
        folio,
        loanId: loan.id,
        customerId: loan.customerId,
        methodId: method.id,
        providerId: provider.id,
        amount: paymentAmount,
        fee: parseFloat(method.feeValue || 0),
        status: 'PENDING',
        reference: folio,
        ipAddress: req.ip,
        browser: req.headers['user-agent'],
        providerResponse: {
          requestedInstallmentId: selectedInstallment.id,
          requestedInstallmentNumber: selectedInstallment.installmentNumber,
        },
      },
    });

    const frontendUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5174';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: loan.customer.email || undefined,
      client_reference_id: transaction.id.toString(),
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Pago cuenta #${loan.id} - cuota ${selectedInstallment.installmentNumber}`,
              description: `${loan.customer.firstName} ${loan.customer.lastName}`,
            },
            unit_amount: Math.round(paymentAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: transaction.id.toString(),
        loanId: loan.id.toString(),
        customerId: loan.customerId.toString(),
        installmentId: selectedInstallment.id.toString(),
      },
      success_url: `${frontendUrl}/mis-pagos?stripe=success&phone=${encodeURIComponent(phone || loan.customer.phone)}&loanId=${loan.id}&transactionId=${transaction.id}`,
      cancel_url: `${frontendUrl}/mis-pagos?stripe=cancel&phone=${encodeURIComponent(phone || loan.customer.phone)}&loanId=${loan.id}&transactionId=${transaction.id}`,
    });

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        providerTransactionId: session.id,
        providerResponse: session,
      },
    });

    res.status(201).json({ checkoutUrl: session.url, sessionId: session.id, transactionId: transaction.id });
  } catch (error) {
    console.error('Create Stripe checkout error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo crear Checkout de Stripe' });
  }
};

export const paymentProviderWebhook = async (req, res) => {
  try {
    const { providerCode } = req.params;
    const providerConfig = await prisma.paymentProviderConfig.findUnique({ where: { code: providerCode } });

    if (providerCode === 'STRIPE') {
      const { provider, stripe } = await getStripeProviderConfig();
      const signature = req.headers['stripe-signature'];
      const webhookSecret = provider.credentials?.webhookSecret;
      let event = req.body;

      if (webhookSecret) {
        if (!signature || !req.rawBody) {
          return res.status(400).json({ error: 'No se pudo validar firma de Stripe' });
        }
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const transactionId = parseInt(session.metadata?.transactionId || session.client_reference_id);

        if (transactionId) {
          await prisma.$transaction(async (tx) => {
            const transaction = await tx.paymentTransaction.findUnique({ where: { id: transactionId } });
            if (!transaction || transaction.status === 'CONFIRMED') return;

            await applyStripePaymentToLoan({
              tx,
              transaction,
              providerResponse: event,
              paymentDate: new Date(),
            });
          });
        }
      } else {
        await prisma.paymentTransaction.create({
          data: {
            folio: `WH-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
            amount: parseFloat(event.data?.object?.amount_total || 0) / 100,
            status: 'PROCESSING',
            providerId: provider.id,
            providerTransactionId: event.data?.object?.id,
            providerResponse: event,
            ipAddress: req.ip,
            browser: req.headers['user-agent'],
            notes: `Evento Stripe recibido: ${event.type}`,
          },
        });
      }

      return res.json({ received: true });
    }

    const adapter = getPaymentProvider(providerCode, providerConfig || {});
    const result = await adapter.handleWebhook(req.body);

    await prisma.paymentTransaction.create({
      data: {
        folio: `WH-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
        amount: parseFloat(req.body?.amount || 0),
        status: result.status || 'PENDING',
        providerId: providerConfig?.id || null,
        providerTransactionId: result.providerTransactionId,
        providerResponse: result.raw || req.body,
        ipAddress: req.ip,
        browser: req.headers['user-agent'],
        notes: 'Webhook recibido para conciliacion',
      },
    });

    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'No se pudo procesar webhook' });
  }
};
