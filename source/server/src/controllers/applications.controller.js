import prisma from '../config/database.js';
import { createNotification } from './notifications.controller.js';

export const getApplications = async (req, res) => {
  try {
    const { status, search, analystId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (analystId) {
      where.analystId = parseInt(analystId);
    }

    if (search) {
      where.customer = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { documentNumber: { contains: search } }
        ]
      };
    }

    const [applications, total] = await Promise.all([
      prisma.loanApplication.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentNumber: true,
              phone: true,
              internalScore: true
            }
          },
          approval: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.loanApplication.count({ where })
    ]);

    res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

export const getApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: {
          include: {
            loans: {
              include: {
                installments: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        approval: {
          include: {
            approver: {
              select: { id: true, fullName: true }
            }
          }
        },
        loan: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

export const createApplication = async (req, res) => {
  try {
    const { customerId, requestedAmount, term, frequency, purpose, documents } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Customer is not active' });
    }

    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['loan_amount_min', 'loan_amount_max', 'loan_term_min', 'loan_term_max']
        }
      }
    });

       const limits = settings.reduce((acc, s) => {
      acc[s.key] = parseFloat(s.value);
      return acc;
    }, {});

    const amount = parseFloat(requestedAmount);
    const termNum = parseInt(term);

    if (limits.loan_amount_min && amount < limits.loan_amount_min) {
      return res.status(400).json({ 
        error: `El monto mínimo es $${limits.loan_amount_min}` 
      });
    }

    if (limits.loan_amount_max && amount > limits.loan_amount_max) {
      return res.status(400).json({ 
        error: `El monto máximo es $${limits.loan_amount_max}` 
      });
    }

    if (limits.loan_term_min && termNum < limits.loan_term_min) {
      return res.status(400).json({ 
        error: `El plazo mínimo es ${limits.loan_term_min} cuotas` 
      });
    }

    if (limits.loan_term_max && termNum > limits.loan_term_max) {
      return res.status(400).json({ 
        error: `El plazo máximo es ${limits.loan_term_max} cuotas` 
      });
    }

    const application = await prisma.loanApplication.create({
      data: {
        customerId: parseInt(customerId),
        requestedAmount: parseFloat(requestedAmount),
        term: parseInt(term),
        frequency,
        purpose,
        documents,
        status: 'PENDING'
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPLICATIONS',
        action: 'CREATE',
        details: `Created application for ${customer.firstName} ${customer.lastName} - Amount: ${requestedAmount}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
};

export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedAmount, term, frequency, purpose, documents } = req.body;

    const existing = await prisma.loanApplication.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot update non-pending application' });
    }

    const application = await prisma.loanApplication.update({
      where: { id: parseInt(id) },
      data: {
        requestedAmount: requestedAmount ? parseFloat(requestedAmount) : undefined,
        term: term ? parseInt(term) : undefined,
        frequency: frequency || undefined,
        purpose: purpose || undefined,
        documents: documents || undefined
      },
      include: {
        customer: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPLICATIONS',
        action: 'UPDATE',
        details: `Updated application ID ${id}`,
        ipAddress: req.ip
      }
    });

    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};

export const assignAnalyst = async (req, res) => {
  try {
    const { id } = req.params;
    const { analystId } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can assign analysts' });
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true  
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Application is not pending' });
    }

    // Verify analyst exists
    const analyst = await prisma.user.findUnique({
      where: { id: parseInt(analystId) }
    });

    if (!analyst || (analyst.role !== 'ANALISTA' && analyst.role !== 'ADMIN')) {
      return res.status(400).json({ error: 'Invalid analyst' });
    }

    const updated = await prisma.loanApplication.update({
      where: { id: parseInt(id) },
      data: { analystId: parseInt(analystId) },
      include: {
        customer: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPLICATIONS',
        action: 'ASSIGN_ANALYST',
        details: `Assigned analyst ${analyst.fullName} to application ID ${id}`,
        ipAddress: req.ip
      }
    });
    
    await createNotification(
      parseInt(analystId),
      'ASSIGNMENT',
      'Nueva solicitud asignada',
      `Se te ha asignado la solicitud #${id} de ${application.customer.firstName} ${application.customer.lastName}`,
      `/solicitudes/${id}`
    );

    res.json(updated);
  } catch (error) {
    console.error('Assign analyst error:', error);
    res.status(500).json({ error: 'Failed to assign analyst' });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(id) },
      include: { approval: true, loan: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.approval || application.loan) {
      return res.status(400).json({ 
        error: 'Cannot delete application with approval or loan' 
      });
    }

    await prisma.loanApplication.delete({
      where: { id: parseInt(id) }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPLICATIONS',
        action: 'DELETE',
        details: `Deleted application ID ${id}`,
        ipAddress: req.ip
      }
    });    
  
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
};