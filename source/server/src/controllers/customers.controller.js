import prisma from '../config/database.js';
import { savePhoto, validatePhoto } from '../utils/photoUpload.js';
import {
  uploadCustomerAddressProof,
  uploadCustomerDocument,
  validateCustomerDocument
} from '../utils/customerDocumentUpload.js';

const documentFileFields = [
  'documentFileUrl',
  'documentFileName',
  'documentFileMimeType',
  'documentFileSize',
  'documentFileStorage',
  'googleDriveFileId',
  'addressProofFileUrl',
  'addressProofFileName',
  'addressProofFileMimeType',
  'addressProofFileSize',
  'addressProofFileStorage',
  'addressProofGoogleDriveFileId',
  'photoCapturedAt',
  'livenessPhotoUrl',
  'livenessPhotoName',
  'livenessPhotoMimeType',
  'livenessPhotoSize',
  'livenessCapturedAt',
  'livenessScore',
  'livenessNotes'
];

const prepareCustomerData = (body) => {
  const data = { ...body };

  delete data.customDocumentType;
  delete data.documentFile;
  delete data.addressProofFile;
  delete data.photoFile;
  documentFileFields.forEach((field) => delete data[field]);

  return {
    ...data,
    creditReferenceCustomerId: parseInt(data.creditReferenceCustomerId),
    monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null,
    birthDate: data.birthDate ? new Date(data.birthDate) : null,
    addressProofIssuedAt: data.addressProofIssuedAt ? new Date(data.addressProofIssuedAt) : null,
    registeredAt: data.registeredAt ? new Date(data.registeredAt) : new Date(),
    registrationStatus: data.registrationStatus || 'APPROVED',
    biometricStatus: data.biometricStatus || 'PENDING'
  };
};

const getUploadFile = (req, fieldName) => {
  const file = req.files?.[fieldName];
  return Array.isArray(file) ? file[0] : file;
};

const requiredFields = [
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'birthDate',
  'gender',
  'phone',
  'email',
  'address',
  'company',
  'position',
  'monthlyIncome',
  'referenceName',
  'referencePhone',
  'referenceRelation',
  'addressProofType',
  'addressProofIssuedAt',
  'creditReferenceCustomerId'
];

const validateRequiredFields = (data) => {
  const missingFields = requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || `${value}`.trim() === '';
  });

  if (missingFields.length > 0) {
    return 'Todos los campos son obligatorios.';
  }

  if (!Number.isFinite(Number(data.monthlyIncome)) || Number(data.monthlyIncome) <= 0) {
    return 'Los ingresos mensuales deben ser mayores a cero.';
  }

  if (!Number.isInteger(Number(data.creditReferenceCustomerId))) {
    return 'Seleccione una referencia de credito o aval valida.';
  }

  const proofDate = new Date(data.addressProofIssuedAt);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  if (Number.isNaN(proofDate.getTime()) || proofDate < twoMonthsAgo || proofDate > new Date()) {
    return 'El comprobante de domicilio debe tener fecha menor a 2 meses.';
  }

  return null;
};

const buildGoodHistoryWhere = (excludeCustomerId) => ({
  id: excludeCustomerId ? { not: excludeCustomerId } : undefined,
  status: 'ACTIVE',
  loans: {
    some: { status: 'PAID' },
    none: {
      OR: [
        { status: 'DEFAULTED' },
        { installments: { some: { status: 'OVERDUE' } } }
      ]
    }
  }
});

const validateCreditReference = async (creditReferenceCustomerId, currentCustomerId = null) => {
  const referenceId = parseInt(creditReferenceCustomerId);

  if (currentCustomerId && referenceId === currentCustomerId) {
    return 'El aval debe ser un cliente diferente.';
  }

  const reference = await prisma.customer.findFirst({
    where: {
      ...buildGoodHistoryWhere(currentCustomerId),
      id: referenceId
    },
    select: { id: true }
  });

  return reference ? null : 'El aval debe ser un cliente activo con credito pagado y sin historial moroso.';
};

export const getCreditReferenceCustomers = async (req, res) => {
  try {
    const { search = '', excludeId, limit = 10 } = req.query;
    const excludeCustomerId = excludeId ? parseInt(excludeId) : null;

    const customers = await prisma.customer.findMany({
      where: {
        ...buildGoodHistoryWhere(excludeCustomerId),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { documentNumber: { contains: search } },
                { phone: { contains: search } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentNumber: true,
        phone: true
      },
      take: parseInt(limit),
      orderBy: { firstName: 'asc' }
    });

    res.json({ customers });
  } catch (error) {
    console.error('Get credit references error:', error);
    res.status(500).json({ error: 'Failed to fetch credit references' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (req.user.role === 'COBRADOR') {
      where.loans = {
        some: {
          collectorId: req.user.id
        }
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { documentNumber: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { loans: true }
          }
        }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        loans: {
          include: {
            collector: {
              select: { id: true, fullName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        loanApplications: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        creditReferenceCustomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const data = req.body;
    const documentFile = getUploadFile(req, 'documentFile');
    const addressProofFile = getUploadFile(req, 'addressProofFile');
    const photoFile = getUploadFile(req, 'photoFile');
    const requiredError = validateRequiredFields(data);

    if (requiredError) {
      return res.status(400).json({ error: requiredError });
    }

    if (!documentFile) {
      return res.status(400).json({ error: 'El Documento de INE es obligatorio.' });
    }

    if (!addressProofFile) {
      return res.status(400).json({ error: 'El comprobante de domicilio es obligatorio.' });
    }

    const photoError = photoFile ? validatePhoto(photoFile, 'fotografia del cliente') : null;

    if (photoError) {
      return res.status(400).json({ error: photoError });
    }

    const fileError = validateCustomerDocument(documentFile);

    if (fileError) {
      return res.status(400).json({ error: fileError });
    }

    const addressProofFileError = validateCustomerDocument(addressProofFile);

    if (addressProofFileError) {
      return res.status(400).json({ error: addressProofFileError });
    }

    const creditReferenceError = await validateCreditReference(data.creditReferenceCustomerId);

    if (creditReferenceError) {
      return res.status(400).json({ error: creditReferenceError });
    }

    // Check if document number exists
    const existing = await prisma.customer.findUnique({
      where: { documentNumber: data.documentNumber }
    });

    if (existing) {
      return res.status(400).json({ error: 'Document number already exists' });
    }

    const uploadedDocument = documentFile
      ? await uploadCustomerDocument(documentFile)
      : {};
    const uploadedAddressProof = addressProofFile
      ? await uploadCustomerAddressProof(addressProofFile)
      : {};
    const uploadedPhoto = photoFile ? await savePhoto(photoFile, 'customer-photos') : null;

    const customer = await prisma.customer.create({
      data: {
        ...prepareCustomerData(data),
        ...uploadedDocument,
        ...uploadedAddressProof,
        ...(uploadedPhoto
          ? {
              photo: uploadedPhoto.url,
              photoCapturedAt: new Date()
            }
          : {})
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CUSTOMERS',
        action: 'CREATE',
        details: `Created customer: ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);
    const data = req.body;
    const documentFile = getUploadFile(req, 'documentFile');
    const addressProofFile = getUploadFile(req, 'addressProofFile');
    const photoFile = getUploadFile(req, 'photoFile');
    const requiredError = validateRequiredFields(data);

    if (requiredError) {
      return res.status(400).json({ error: requiredError });
    }

    const fileError = validateCustomerDocument(documentFile);

    if (fileError) {
      return res.status(400).json({ error: fileError });
    }

    const addressProofFileError = validateCustomerDocument(addressProofFile);

    if (addressProofFileError) {
      return res.status(400).json({ error: addressProofFileError });
    }

    const photoError = photoFile ? validatePhoto(photoFile, 'fotografia del cliente') : null;

    if (photoError) {
      return res.status(400).json({ error: photoError });
    }

    // Check if exists
    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!documentFile && !existing.documentFileUrl) {
      return res.status(400).json({ error: 'El Documento de INE es obligatorio.' });
    }

    if (!addressProofFile && !existing.addressProofFileUrl) {
      return res.status(400).json({ error: 'El comprobante de domicilio es obligatorio.' });
    }

    const creditReferenceError = await validateCreditReference(data.creditReferenceCustomerId, customerId);

    if (creditReferenceError) {
      return res.status(400).json({ error: creditReferenceError });
    }

    // Check document number conflict
    if (data.documentNumber && data.documentNumber !== existing.documentNumber) {
      const duplicate = await prisma.customer.findUnique({
        where: { documentNumber: data.documentNumber }
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Document number already exists' });
      }
    }

    const uploadedDocument = documentFile
      ? await uploadCustomerDocument(documentFile)
      : {};
    const uploadedAddressProof = addressProofFile
      ? await uploadCustomerAddressProof(addressProofFile)
      : {};
    const uploadedPhoto = photoFile ? await savePhoto(photoFile, 'customer-photos') : null;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...prepareCustomerData(data),
        ...uploadedDocument,
        ...uploadedAddressProof,
        ...(uploadedPhoto
          ? {
              photo: uploadedPhoto.url,
              photoCapturedAt: new Date()
            }
          : {})
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CUSTOMERS',
        action: 'UPDATE',
        details: `Updated customer: ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip
      }
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { loans: true }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer._count.loans > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with active loans. Set status to INACTIVE instead.' 
      });
    }

    await prisma.customer.delete({
      where: { id: parseInt(id) }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CUSTOMERS',
        action: 'DELETE',
        details: `Deleted customer: ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

export const toggleCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { status: newStatus }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CUSTOMERS',
        action: 'UPDATE_STATUS',
        details: `Changed customer status to ${newStatus}: ${customer.firstName} ${customer.lastName}`,
        ipAddress: req.ip
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
};
