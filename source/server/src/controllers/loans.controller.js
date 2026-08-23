import prisma from '../config/database.js';
import { createNotification } from './notifications.controller.js';
import PDFDocument from 'pdfkit';
import { calculateInstallments } from '../utils/interestCalculator.js';
import { injectSettings } from '../middlewares/settings.js';

const getCompanyConfig = async () => {
  try {
    const configs = await prisma.settings.findMany({
      where: {
        key: {
          in: ['company_name', 'company_legal_name', 'company_ruc', 'company_address', 'company_phone', 'company_email']
        }
      }
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return {
      name: configMap.company_name || 'CrediManager',
      legalName: configMap.company_legal_name || configMap.company_name || 'CrediManager',
      taxId: configMap.company_ruc || '00000000000',
      address: configMap.company_address || 'Dirección no configurada',
      phone: configMap.company_phone || 'Teléfono no configurado',
      email: configMap.company_email || 'email@ejemplo.com'
    };
  } catch (error) {
    return {
      name: 'CrediManager',
      legalName: 'CrediManager',
      taxId: '00000000000',
      address: 'Dirección no configurada',
      phone: 'Teléfono no configurado',
      email: 'email@ejemplo.com'
    };
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatCurrency = (amount) => {
  return `S/ ${parseFloat(amount).toFixed(2)}`;
};

const translateFrequency = (freq) => {
  const map = {
    DAILY: 'Diario',
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quincenal',
    MONTHLY: 'Mensual'
  };
  return map[freq] || freq;
};

// Helper para calcular mora usando settings
const calculateLateFee = async (installment, settings = null) => {
  if (installment.status !== 'OVERDUE') return parseFloat(installment.lateFee || 0);
 
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(installment.dueDate);
  dueDate.setHours(0, 0, 0, 0);
 
  if (today <= dueDate) return 0;
 
  // Usar settings del request si están disponibles, sino consultar BD
  let lateFeeRate, graceDays, lateFeeOn;
  
  if (settings) {
    lateFeeRate = parseFloat(settings.rate_late_fee_rate || 2);
    graceDays = parseInt(settings.rate_grace_days || 0);
    lateFeeOn = settings.rate_late_fee_on || 'OVERDUE_INSTALLMENT';
  } else {
    const [lateFeeRateSetting, graceDaysSetting, lateFeeOnSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'rate_late_fee_rate' } }),
      prisma.settings.findUnique({ where: { key: 'rate_grace_days' } }),
      prisma.settings.findUnique({ where: { key: 'rate_late_fee_on' } })
    ]);
   
    lateFeeRate = parseFloat(lateFeeRateSetting?.value || 2);
    graceDays = parseInt(graceDaysSetting?.value || 0);
    lateFeeOn = lateFeeOnSetting?.value || 'OVERDUE_INSTALLMENT';
  }
 
  const diffTime = Math.abs(today - dueDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysOverdue = Math.max(0, diffDays - graceDays);
 
  if (daysOverdue <= 0) return 0;
 
  const base = lateFeeOn === 'OVERDUE_CAPITAL'
    ? parseFloat(installment.principal)
    : parseFloat(installment.total);
 
  const lateFee = base * (lateFeeRate / 100) * daysOverdue;
 
  return parseFloat(lateFee.toFixed(2));
};

// Helper para actualizar estados de cuotas
const updateInstallmentStatuses = async (installments) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updates = [];

  for (const inst of installments) {
    const dueDate = new Date(inst.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    let newStatus = inst.status;
    let needsUpdate = false;

    if (inst.status === 'PENDING' && today > dueDate) {
      newStatus = 'OVERDUE';
      needsUpdate = true;
    }
    else if (inst.status === 'OVERDUE' && today <= dueDate) {
      newStatus = 'PENDING';
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.push(
        prisma.installment.update({
          where: { id: inst.id },
          data: { 
            status: newStatus,
            lateFee: newStatus === 'PENDING' ? 0 : inst.lateFee
          }
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

export const getLoans = async (req, res) => {
  try {
    const { status, customerId, collectorId, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.user.role === 'COBRADOR') {
      where.collectorId = req.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = parseInt(customerId);
    }

    if (collectorId && req.user.role !== 'COBRADOR') {
      where.collectorId = parseInt(collectorId);
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

    if (req.query.overdue === 'true') {
      where.installments = {
        some: {
          status: 'OVERDUE'
        }
      };
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
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
              phone: true
            }
          },
          collector: {
            select: {
              id: true,
              fullName: true
            }
          },
          _count: {
            select: { 
              installments: true,
              payments: true
            }
          },
          installments: {
            select: { 
              id: true,
              status: true,
              dueDate: true,
              lateFee: true,
              total: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.loan.count({ where })
    ]);

    for (const loan of loans) {
      if (loan.installments.length > 0) {
        await updateInstallmentStatuses(loan.installments);
      }
    }

    const refreshedLoans = await prisma.loan.findMany({
      where: {
        id: { in: loans.map(l => l.id) }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true
          }
        },
        collector: {
          select: {
            id: true,
            fullName: true
          }
        },
        _count: {
          select: { 
            installments: true,
            payments: true
          }
        },
        installments: {
          select: { 
            id: true,
            status: true,
            total: true,
            lateFee: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const loansWithRealBalance = refreshedLoans.map(loan => {
      const realBalance = loan.installments
        .filter(i => i.status !== 'PAID')
        .reduce((sum, i) => {
          const base = parseFloat(i.total);
          const mora = parseFloat(i.lateFee || 0);
          return sum + base + mora;
        }, 0);

      const paidCount = loan.installments.filter(i => i.status === 'PAID').length;

      return {
        ...loan,
        balance: realBalance,
        hasOverdue: loan.installments.some(i => i.status === 'OVERDUE'),
        installments: loan.installments.map(i => ({ 
          id: i.id, 
          status: i.status 
        })),
        _count: {
          ...loan._count,
          paidInstallments: paidCount
        }
      };
    });

    res.json({
      loans: loansWithRealBalance,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
};

export const getLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        collector: {
          select: {
            id: true,
            fullName: true,
            phone: true
          }
        },
        application: {
          include: {
            approval: true
          }
        },
        disbursementAccount: {
          select: {
            bank: true,
            accountHolder: true,
            destinationLast4: true,
            status: true,
          },
        },
        disbursement: {
          select: {
            status: true,
            reference: true,
            confirmedAt: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' }
        },
        payments: {
          include: {
            collector: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        collectionLogs: {
          include: {
            collector: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installmentsWithLateFee = await Promise.all(
      loan.installments.map(async (inst) => {
        let status = inst.status;
        let lateFee = parseFloat(inst.lateFee || 0);
        let needsUpdate = false;

        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (status === 'PENDING' && today > dueDate) {
          status = 'OVERDUE';
          lateFee = await calculateLateFee({ ...inst, status: 'OVERDUE' }, req.settings);
          needsUpdate = true;
        }
        else if (status === 'OVERDUE' && today <= dueDate) {
          status = 'PENDING';
          lateFee = 0;
          needsUpdate = true;
        }
        else if (status === 'OVERDUE' && today > dueDate) {
          const newLateFee = await calculateLateFee(inst, req.settings);
          if (newLateFee !== lateFee) {
            lateFee = newLateFee;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await prisma.installment.update({
            where: { id: inst.id },
            data: {
              status: status,
              lateFee: lateFee
            }
          });
        }

        return {
          ...inst,
          status,
          lateFee,
          totalWithLateFee: parseFloat(inst.total) + lateFee
        };
      })
    );

    const loanWithLateFees = {
      ...loan,
      installments: installmentsWithLateFee
    };

    res.json(loanWithLateFees);
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
};

export const createLoan = async (req, res) => {
  try {
    const { applicationId, collectorId, disbursementDate, disbursementMethod, cashId, disbursementAccountId } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create loans' });
    }

    if (!cashId) {
      return res.status(400).json({ error: 'Debe seleccionar una caja' });
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: {
        approval: true,
        customer: true,
        loan: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Application is not approved' });
    }

    if (!application.approval) {
      return res.status(400).json({ error: 'No approval found for this application' });
    }

    if (application.loan) {
      return res.status(400).json({ error: 'Loan already exists for this application' });
    }

    const isTransfer = disbursementMethod === 'TRANSFER';
    let disbursementAccount = null;

    if (isTransfer) {
      if (!disbursementAccountId) {
        return res.status(400).json({ error: 'Selecciona una cuenta de recepcion verificada para la transferencia' });
      }

      disbursementAccount = await prisma.customerDisbursementAccount.findFirst({
        where: {
          id: parseInt(disbursementAccountId),
          customerId: application.customerId,
          status: 'VERIFIED',
        },
        select: { id: true, bank: true, destinationLast4: true },
      });

      if (!disbursementAccount) {
        return res.status(400).json({ error: 'La cuenta de recepcion debe pertenecer al cliente y estar verificada' });
      }
    }

    const collector = await prisma.user.findUnique({
      where: { id: parseInt(collectorId) }
    });

    if (!collector || (collector.role !== 'COBRADOR' && collector.role !== 'ADMIN')) {
      return res.status(400).json({ error: 'Invalid collector' });
    }

    const cash = await prisma.cash.findUnique({
      where: { id: parseInt(cashId) }
    });

    if (!cash) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    if (cash.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'La caja no está activa' });
    }

    const loanAmount = parseFloat(application.approval.approvedAmount);
    if (parseFloat(cash.balance) < loanAmount) {
      return res.status(400).json({ error: 'Saldo insuficiente en la caja seleccionada' });
    }

    // Usar límites de configuración
    const minAmount = parseFloat(req.settings?.loan_amount_min || 0);
    const maxAmount = parseFloat(req.settings?.loan_amount_max || Infinity);
    
    if (loanAmount < minAmount) {
      return res.status(400).json({ 
        error: `El monto mínimo permitido es $${minAmount}` 
      });
    }
    
    if (loanAmount > maxAmount) {
      return res.status(400).json({ 
        error: `El monto máximo permitido es $${maxAmount}` 
      });
    }

    const approval = application.approval;

    // Usar método de cálculo de configuración
    const calculationMethod = req.settings?.rate_calculation_method || 'compound';

    const installmentsData = calculateInstallments(
      parseFloat(approval.approvedAmount),
      parseFloat(approval.interestRate),
      parseInt(approval.term),
      approval.frequency,
      disbursementDate,
      calculationMethod
    );

    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          applicationId: parseInt(applicationId),
          customerId: application.customerId,
          collectorId: parseInt(collectorId),
          amount: parseFloat(approval.approvedAmount),
          interestRate: parseFloat(approval.interestRate),
          term: parseInt(approval.term),
          frequency: approval.frequency,
          disbursementDate: new Date(disbursementDate),
          disbursementMethod,
          disbursementAccountId: disbursementAccount?.id || null,
          balance: parseFloat(approval.approvedAmount),
          status: 'ACTIVE',
          installments: {
            create: installmentsData
          }
        },
        include: {
          customer: true,
          collector: true,
          installments: true
        }
      });

      await tx.cashMovement.create({
        data: {
          cashId: parseInt(cashId),
          type: 'EXPENSE',
          concept: `Desembolso préstamo #${newLoan.id} - ${application.customer.firstName} ${application.customer.lastName}`,
          amount: loanAmount,
          observations: `Método: ${disbursementMethod}`,
          reference: `LOAN-${newLoan.id}`,
          relatadId: newLoan.id.toString(),
          relatadType: 'LOAN',
          userId: req.user.id
        }
      });

      await tx.cash.update({
        where: { id: parseInt(cashId) },
        data: { 
          balance: { decrement: loanAmount }
        }
      });

      await tx.disbursement.create({
        data: {
          loanId: newLoan.id,
          customerId: application.customerId,
          disbursementAccountId: disbursementAccount?.id || null,
          cashId: parseInt(cashId),
          amount: loanAmount,
          method: disbursementMethod,
          status: isTransfer ? 'PENDING' : 'CONFIRMED',
          reference: `DISB-${newLoan.id}-${Date.now()}`,
          initiatedById: req.user.id,
          confirmedAt: isTransfer ? null : new Date(),
          notes: isTransfer
            ? `Transferencia pendiente a ${disbursementAccount.bank} terminacion ${disbursementAccount.destinationLast4}`
            : 'Entrega registrada como efectivo o cheque',
        },
      });

      return newLoan;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'LOANS',
        action: 'CREATE',
        details: `Created loan #${loan.id} for ${application.customer.firstName} ${application.customer.lastName} - Amount: ${approval.approvedAmount} - Method: ${disbursementMethod} - Caja: ${cash.name}${disbursementAccount ? ` - Destination: ${disbursementAccount.bank} ****${disbursementAccount.destinationLast4}` : ''}`,
        ipAddress: req.ip
      }
    });

    if (collectorId) {
      await createNotification(
        parseInt(collectorId),
        'ASSIGNMENT',
        'Nuevo préstamo asignado',
        `Se te ha asignado el préstamo #${loan.id} de ${loan.customer.firstName} ${loan.customer.lastName} por $${loan.amount}`,
        `/prestamos/${loan.id}`
      );
    }
    
    if (application.analystId) {
      await createNotification(
        application.analystId,
        'APPROVAL',
        'Préstamo creado exitosamente',
        `El préstamo #${loan.id} ha sido creado y asignado al cobrador`,
        `/prestamos/${loan.id}`
      );
    }

    res.status(201).json(loan);
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
};

export const updateLoanCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectorId } = req.body;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id) }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const collector = await prisma.user.findUnique({
      where: { id: parseInt(collectorId) }
    });

    if (!collector || (collector.role !== 'COBRADOR' && collector.role !== 'ADMIN')) {
      return res.status(400).json({ error: 'Invalid collector' });
    }

    const updated = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: { collectorId: parseInt(collectorId) },
      include: {
        collector: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'LOANS',
        action: 'UPDATE_COLLECTOR',
        details: `Changed collector for loan #${id} to ${collector.fullName}`,
        ipAddress: req.ip
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update loan collector error:', error);
    res.status(500).json({ error: 'Failed to update loan collector' });
  }
};

export const getLoanStats = async (req, res) => {
  try {
    const whereFilter = req.user.role === 'COBRADOR' 
      ? { collectorId: req.user.id } 
      : {};

    const [totalActive, totalPaid, totalDefaulted, activeLoans, loansWithOverdue] = await Promise.all([
      prisma.loan.count({ where: { ...whereFilter, status: 'ACTIVE' } }),
      prisma.loan.count({ where: { ...whereFilter, status: 'PAID' } }),
      prisma.loan.count({ where: { ...whereFilter, status: 'DEFAULTED' } }),
      prisma.loan.findMany({
        where: { ...whereFilter, status: { in: ['ACTIVE', 'DEFAULTED'] }},
        select: {
          amount: true,
          balance: true
        }
      }),  
      prisma.loan.count({
        where: {
          ...whereFilter,
          status: { in: ['ACTIVE', 'DEFAULTED'] },
          installments: {
            some: {
              status: 'OVERDUE'
            }
          }
        }
      })
    ]);

    const totalDisbursed = (activeLoans || []).reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
    const totalPending = (activeLoans || []).reduce((sum, loan) => sum + parseFloat(loan.balance), 0);

    res.json({
      totalActive,
      totalPaid,
      totalDefaulted: loansWithOverdue,
      totalDisbursed,
      totalPending
    });
  } catch (error) {
    console.error('Get loan stats error:', error);
    res.status(500).json({ error: 'Failed to fetch loan stats' });
  }
};

export const generateContract = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await getCompanyConfig();

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        collector: true,
        installments: {
          orderBy: { installmentNumber: 'asc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contrato-prestamo-${loan.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(company.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`RFC/NIT: ${company.taxId}`, { align: 'center' });
    doc.text(company.address, { align: 'center' });
    doc.text(`Tel: ${company.phone} | Email: ${company.email}`, { align: 'center' });
    
    doc.moveDown(1.5);
    doc.fontSize(16).font('Helvetica-Bold').text('CONTRATO DE PRÉSTAMO', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`N° ${String(loan.id).padStart(6, '0')}`, { align: 'center' });
    
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('I. INFORMACIÓN DEL PRÉSTAMO');
    doc.moveDown(0.5);

    const loanData = [
      ['Fecha de Desembolso:', formatDate(loan.disbursementDate)],
      ['Monto Prestado:', formatCurrency(loan.amount)],
      ['Tasa de Interés:', `${loan.interestRate}% anual`],
      ['Plazo:', `${loan.term} cuotas`],
      ['Frecuencia de Pago:', translateFrequency(loan.frequency)],
      ['Método de Desembolso:', loan.disbursementMethod]
    ];

    doc.fontSize(10).font('Helvetica');
    loanData.forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('II. DATOS DEL PRESTATARIO');
    doc.moveDown(0.5);

    const customerData = [
      ['Nombres:', `${loan.customer.firstName} ${loan.customer.lastName}`],
      ['Documento:', `${loan.customer.documentType} ${loan.customer.documentNumber}`],
      ['Teléfono:', loan.customer.phone],
      ['Dirección:', loan.customer.address || 'No especificada']
    ];

    doc.fontSize(10).font('Helvetica');
    customerData.forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('III. CRONOGRAMA DE PAGOS');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [40, 70, 70, 70, 70];
    const headers = ['Cuota', 'Fecha', 'Capital', 'Interés', 'Total'];

    doc.fontSize(9).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(470, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(8);
    let yPos = tableTop + 20;

    loan.installments.forEach((inst) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      xPos = 50;
      const rowData = [
        inst.installmentNumber.toString(),
        formatDate(inst.dueDate),
        formatCurrency(inst.principal),
        formatCurrency(inst.interest),
        formatCurrency(inst.total)
      ];

      rowData.forEach((data, i) => {
        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      yPos += 15;
    });

    doc.addPage();

    yPos = 150;
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${formatDate(new Date())}`, { align: 'center' });
    doc.moveDown(3);

    doc.moveTo(80, doc.y).lineTo(230, doc.y).stroke();
    doc.moveDown(0.3);
    doc.text(`${loan.customer.firstName} ${loan.customer.lastName}`, 80, doc.y, { width: 150, align: 'center' });
    doc.text('PRESTATARIO', 80, doc.y + 15, { width: 150, align: 'center' });

    const signY = doc.y - 60;
    doc.moveTo(350, signY).lineTo(500, signY).stroke();
    doc.text(company.name, 350, signY + 5, { width: 150, align: 'center' });
    doc.text('PRESTAMISTA', 350, signY + 20, { width: 150, align: 'center' });

    doc.end();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'PDF',
        action: 'GENERATE_CONTRACT',
        details: `Generated contract for loan #${loan.id}`,
        ipAddress: req.ip
      }
    });

  } catch (error) {
    console.error('Generate contract error:', error);
    res.status(500).json({ error: 'Failed to generate contract' });
  }
};
