import prisma from '../config/database.js';
import { createNotification } from './notifications.controller.js';

export const approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { approvedAmount, interestRate, term, frequency, observations, createLoan: shouldCreateLoan, collectorId, disbursementDate, disbursementMethod } = req.body;

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: { customer: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Application is not pending' });
    }

    // Create approval
    const approval = await prisma.loanApproval.create({
      data: {
        applicationId: parseInt(applicationId),
        approvedAmount: parseFloat(approvedAmount),
        interestRate: parseFloat(interestRate),
        term: parseInt(term),
        frequency,
        observations,
        approvedBy: req.user.id,
        status: 'APPROVED'
      }
    });

    // Update application status
    await prisma.loanApplication.update({
      where: { id: parseInt(applicationId) },
      data: { status: 'APPROVED' }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPROVALS',
        action: 'APPROVE',
        details: `Approved application #${applicationId} for ${application.customer.firstName} ${application.customer.lastName} - Amount: ${approvedAmount}`,
        ipAddress: req.ip
      }
    });

    // Notificaciones
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    });

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'APPROVAL',
        'Solicitud aprobada - Crear préstamo',
        `Solicitud #${applicationId} aprobada por $${approvedAmount}. Crear préstamo pendiente.`,
        `/solicitudes/${applicationId}`
      );
    }

    res.json({ approval, message: 'Application approved successfully. You can now create the loan.' });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
};

export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: { customer: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Application is not pending' });
    }

    // Create rejection record
    const approval = await prisma.loanApproval.create({
      data: {
        applicationId: parseInt(applicationId),
        approvedAmount: 0,
        interestRate: 0,
        term: 0,
        frequency: application.frequency,
        rejectionReason,
        approvedBy: req.user.id,
        status: 'REJECTED'
      }
    });

    // Update application status
    await prisma.loanApplication.update({
      where: { id: parseInt(applicationId) },
      data: { status: 'REJECTED' }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'APPROVALS',
        action: 'REJECT',
        details: `Rejected application #${applicationId} for ${application.customer.firstName} ${application.customer.lastName} - Reason: ${rejectionReason}`,
        ipAddress: req.ip
      }
    });

    res.json(approval);
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
};

export const getApprovals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    const [approvals, total] = await Promise.all([
      prisma.loanApproval.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          application: {
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
          },
          approver: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.loanApproval.count({ where })
    ]);

    res.json({
      approvals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
};

export const getApprovalStats = async (req, res) => {
  try {
    const [approved, rejected, pending] = await Promise.all([
      prisma.loanApproval.count({ where: { status: 'APPROVED' } }),
      prisma.loanApproval.count({ where: { status: 'REJECTED' } }),
      prisma.loanApplication.count({ where: { status: 'PENDING' } })
    ]);

    const approvalRate = approved + rejected > 0 
      ? ((approved / (approved + rejected)) * 100).toFixed(2)
      : 0;

    res.json({
      approved,
      rejected,
      pending,
      approvalRate: parseFloat(approvalRate)
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ error: 'Failed to fetch approval stats' });
  }
};