import prisma from '../config/database.js';
import { createRegistrationToken, getRegistrationUrl, hashRegistrationToken } from '../utils/registrationTokens.js';
import { savePhoto, validatePhoto } from '../utils/photoUpload.js';

const REQUIRED_FIELDS = [
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'birthDate',
  'phone',
  'email',
  'address',
  'company',
  'position',
  'monthlyIncome',
  'referenceName',
  'referencePhone',
  'referenceRelation',
];

const fileFromRequest = (req, fieldName) => {
  const file = req.files?.[fieldName];
  return Array.isArray(file) ? file[0] : file;
};

const validatePayload = (data) => {
  const missing = REQUIRED_FIELDS.filter((field) => !data[field] || `${data[field]}`.trim() === '');
  if (missing.length) return 'Completa todos los datos solicitados.';

  if (!Number.isFinite(Number(data.monthlyIncome)) || Number(data.monthlyIncome) <= 0) {
    return 'Los ingresos deben ser mayores a cero.';
  }

  return null;
};

const publicLinkPayload = (link) => ({
  purpose: link.purpose,
  status: link.status,
  requireGuarantor: link.requireGuarantor,
  expiresAt: link.expiresAt,
  progress: link.progress || {},
});

export const createRegistrationLink = async (req, res) => {
  try {
    const { purpose = 'CLIENT', requireGuarantor = false, guarantorForCustomerId, expiresInDays = 7 } = req.body;
    const token = createRegistrationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const link = await prisma.registrationLink.create({
      data: {
        tokenHash: hashRegistrationToken(token),
        purpose,
        requireGuarantor: Boolean(requireGuarantor),
        guarantorForCustomerId: guarantorForCustomerId ? parseInt(guarantorForCustomerId) : null,
        expiresAt,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      id: link.id,
      url: getRegistrationUrl(req, token),
      expiresAt: link.expiresAt,
      purpose: link.purpose,
      requireGuarantor: link.requireGuarantor,
    });
  } catch (error) {
    console.error('Create registration link error:', error);
    res.status(500).json({ error: 'No se pudo generar el enlace de registro' });
  }
};

export const getRegistrationRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const links = await prisma.registrationLink.findMany({
      where,
      include: false,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const customerIds = links.map((link) => link.customerId).filter(Boolean);
    const customers = customerIds.length
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true,
            email: true,
            photo: true,
            registrationStatus: true,
            biometricStatus: true,
            registeredAt: true,
            photoCapturedAt: true,
            livenessCapturedAt: true,
          },
        })
      : [];

    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    res.json({
      requests: links.map((link) => ({
        ...link,
        customer: link.customerId ? customerMap.get(link.customerId) : null,
      })),
    });
  } catch (error) {
    console.error('Get registration requests error:', error);
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' });
  }
};

export const getPublicRegistration = async (req, res) => {
  try {
    const link = await prisma.registrationLink.findUnique({
      where: { tokenHash: hashRegistrationToken(req.params.token) },
    });

    if (!link || link.status === 'EXPIRED' || link.expiresAt < new Date()) {
      return res.status(404).json({ error: 'El enlace no existe o ha expirado' });
    }

    if (link.status === 'SUBMITTED' || link.status === 'APPROVED' || link.status === 'REJECTED') {
      return res.json({ ...publicLinkPayload(link), completed: true });
    }

    res.json(publicLinkPayload(link));
  } catch (error) {
    console.error('Get public registration error:', error);
    res.status(500).json({ error: 'No se pudo abrir el registro' });
  }
};

export const savePublicRegistrationProgress = async (req, res) => {
  try {
    const link = await prisma.registrationLink.findUnique({
      where: { tokenHash: hashRegistrationToken(req.params.token) },
    });

    if (!link || link.expiresAt < new Date() || link.status !== 'PENDING') {
      return res.status(404).json({ error: 'El enlace no esta disponible' });
    }

    const updated = await prisma.registrationLink.update({
      where: { id: link.id },
      data: { progress: req.body || {} },
    });

    res.json(publicLinkPayload(updated));
  } catch (error) {
    console.error('Save registration progress error:', error);
    res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
};

export const submitPublicRegistration = async (req, res) => {
  try {
    const link = await prisma.registrationLink.findUnique({
      where: { tokenHash: hashRegistrationToken(req.params.token) },
    });

    if (!link || link.expiresAt < new Date() || link.status !== 'PENDING') {
      return res.status(404).json({ error: 'El enlace no esta disponible' });
    }

    const data = req.body;
    const payloadError = validatePayload(data);
    if (payloadError) return res.status(400).json({ error: payloadError });

    const photo = fileFromRequest(req, 'photo');
    const livenessPhoto = fileFromRequest(req, 'livenessPhoto');
    const photoError = validatePhoto(photo, 'fotografia del cliente');
    const livenessError = validatePhoto(livenessPhoto, 'fotografia de prueba de vida');

    if (photoError) return res.status(400).json({ error: photoError });
    if (livenessError) return res.status(400).json({ error: livenessError });

    const existing = await prisma.customer.findUnique({
      where: { documentNumber: data.documentNumber },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese documento' });
    }

    const customerPhoto = await savePhoto(photo, 'customer-photos');
    const liveness = await savePhoto(livenessPhoto, 'customer-liveness');

    const now = new Date();
    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType || 'INE',
        documentNumber: data.documentNumber,
        birthDate: new Date(data.birthDate),
        gender: data.gender || 'O',
        phone: data.phone,
        email: data.email,
        address: data.address,
        company: data.company,
        position: data.position,
        monthlyIncome: parseFloat(data.monthlyIncome),
        referenceName: data.referenceName,
        referencePhone: data.referencePhone,
        referenceRelation: data.referenceRelation,
        photo: customerPhoto.url,
        photoCapturedAt: now,
        livenessPhotoUrl: liveness.url,
        livenessPhotoName: liveness.name,
        livenessPhotoMimeType: liveness.mimeType,
        livenessPhotoSize: liveness.size,
        livenessCapturedAt: now,
        livenessScore: 0,
        livenessNotes: 'Captura de vida basica registrada. Requiere revision o motor biometrico externo para comparacion facial.',
        biometricStatus: 'PENDING',
        registrationStatus: 'PENDING_REVIEW',
        registeredAt: now,
        status: 'INACTIVE',
      },
    });

    await prisma.registrationLink.update({
      where: { id: link.id },
      data: {
        customerId: customer.id,
        status: 'SUBMITTED',
        progress: data,
      },
    });

    res.status(201).json({
      message: 'Registro enviado correctamente',
      customerId: customer.id,
      biometricStatus: customer.biometricStatus,
      registrationStatus: customer.registrationStatus,
    });
  } catch (error) {
    console.error('Submit public registration error:', error);
    res.status(500).json({ error: 'No se pudo enviar el registro' });
  }
};

export const updateRegistrationDecision = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { decision, reason } = req.body;

    if (!['APPROVED', 'REJECTED', 'INFO_REQUESTED'].includes(decision)) {
      return res.status(400).json({ error: 'Decision invalida' });
    }

    const data = {
      registrationStatus: decision,
      biometricStatus: decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
      status: decision === 'APPROVED' ? 'ACTIVE' : 'INACTIVE',
      livenessNotes: reason || undefined,
    };

    const customer = await prisma.customer.update({
      where: { id: parseInt(customerId) },
      data,
    });

    await prisma.registrationLink.updateMany({
      where: { customerId: customer.id },
      data: { status: decision },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CUSTOMER_REGISTRATION',
        action: decision,
        details: `${decision} registration for customer ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip,
      },
    });

    res.json(customer);
  } catch (error) {
    console.error('Update registration decision error:', error);
    res.status(500).json({ error: 'No se pudo actualizar la solicitud' });
  }
};
