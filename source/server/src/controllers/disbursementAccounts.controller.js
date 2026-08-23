import prisma from '../config/database.js';
import { encryptDestination, maskDestination, validateClabe } from '../utils/disbursementSecurity.js';

const accountSelect = {
  id: true,
  customerId: true,
  bank: true,
  accountHolder: true,
  destinationType: true,
  destinationLast4: true,
  status: true,
  isPrimary: true,
  consentAt: true,
  verifiedAt: true,
  verifiedById: true,
  verificationNotes: true,
  createdAt: true,
  updatedAt: true,
};

const serializeAccount = (account) => ({
  ...account,
  destinationMasked: maskDestination(account.destinationLast4),
});

const getCustomerOr404 = async (customerId, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(customerId) },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!customer) {
    res.status(404).json({ error: 'Cliente no encontrado' });
    return null;
  }

  return customer;
};

export const getDisbursementAccounts = async (req, res) => {
  try {
    const customer = await getCustomerOr404(req.params.customerId, res);
    if (!customer) return;

    const accounts = await prisma.customerDisbursementAccount.findMany({
      where: { customerId: customer.id },
      select: accountSelect,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ customer, accounts: accounts.map(serializeAccount) });
  } catch (error) {
    console.error('Get disbursement accounts error:', error);
    res.status(500).json({ error: 'No se pudieron consultar los datos de recepcion' });
  }
};

export const createDisbursementAccount = async (req, res) => {
  try {
    const customer = await getCustomerOr404(req.params.customerId, res);
    if (!customer) return;

    const { bank, accountHolder, clabe, consentAccepted } = req.body;
    const normalizedBank = String(bank || '').trim();
    const normalizedHolder = String(accountHolder || '').trim();
    const validation = validateClabe(clabe);

    if (!normalizedBank || !normalizedHolder || !validation.valid || consentAccepted !== true) {
      return res.status(400).json({
        error: 'Captura banco, titular, una CLABE valida de 18 digitos y el consentimiento del cliente.',
      });
    }

    const account = await prisma.customerDisbursementAccount.create({
      data: {
        customerId: customer.id,
        bank: normalizedBank,
        accountHolder: normalizedHolder,
        destinationType: 'CLABE',
        clabeEncrypted: encryptDestination(validation.clabe),
        destinationLast4: validation.clabe.slice(-4),
        consentAt: new Date(),
      },
      select: accountSelect,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'DISBURSEMENTS',
        action: 'CREATE_DESTINATION',
        details: `Registro destino CLABE ${maskDestination(account.destinationLast4)} para ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip,
      },
    });

    res.status(201).json(serializeAccount(account));
  } catch (error) {
    console.error('Create disbursement account error:', error);
    res.status(500).json({ error: error.message || 'No se pudo registrar la cuenta de recepcion' });
  }
};

export const verifyDisbursementAccount = async (req, res) => {
  try {
    const customer = await getCustomerOr404(req.params.customerId, res);
    if (!customer) return;

    const accountId = Number(req.params.accountId);
    const { status, verificationNotes = '', makePrimary = false } = req.body;
    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Selecciona VERIFICADA o RECHAZADA.' });
    }

    const existing = await prisma.customerDisbursementAccount.findFirst({
      where: { id: accountId, customerId: customer.id },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Cuenta de recepcion no encontrada' });

    const account = await prisma.$transaction(async (tx) => {
      const shouldBePrimary = status === 'VERIFIED' && makePrimary;
      if (shouldBePrimary) {
        await tx.customerDisbursementAccount.updateMany({
          where: { customerId: customer.id, id: { not: accountId } },
          data: { isPrimary: false },
        });
      }

      return tx.customerDisbursementAccount.update({
        where: { id: accountId },
        data: {
          status,
          isPrimary: shouldBePrimary,
          verifiedAt: new Date(),
          verifiedById: req.user.id,
          verificationNotes: String(verificationNotes).trim() || null,
        },
        select: accountSelect,
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'DISBURSEMENTS',
        action: status === 'VERIFIED' ? 'VERIFY_DESTINATION' : 'REJECT_DESTINATION',
        details: `${status === 'VERIFIED' ? 'Verifico' : 'Rechazo'} destino ${maskDestination(account.destinationLast4)} de ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip,
      },
    });

    res.json(serializeAccount(account));
  } catch (error) {
    console.error('Verify disbursement account error:', error);
    res.status(500).json({ error: 'No se pudo actualizar la validacion de la cuenta' });
  }
};

export const setPrimaryDisbursementAccount = async (req, res) => {
  try {
    const customer = await getCustomerOr404(req.params.customerId, res);
    if (!customer) return;

    const accountId = Number(req.params.accountId);
    const account = await prisma.customerDisbursementAccount.findFirst({
      where: { id: accountId, customerId: customer.id, status: 'VERIFIED' },
      select: accountSelect,
    });
    if (!account) return res.status(400).json({ error: 'Solo una cuenta verificada puede ser principal' });

    await prisma.$transaction([
      prisma.customerDisbursementAccount.updateMany({
        where: { customerId: customer.id },
        data: { isPrimary: false },
      }),
      prisma.customerDisbursementAccount.update({
        where: { id: accountId },
        data: { isPrimary: true },
      }),
    ]);

    res.json({ ...serializeAccount(account), isPrimary: true });
  } catch (error) {
    console.error('Set primary disbursement account error:', error);
    res.status(500).json({ error: 'No se pudo asignar la cuenta principal' });
  }
};
