import prisma from '../config/database.js';
import { createNotification } from './notifications.controller.js';
import PDFDocument from 'pdfkit';

const getCompanyConfig = async () => {
  try {
    const configs = await prisma.settings.findMany({
      where: {
        key: {
          in: ['company_name', 'company_tax_id', 'company_address', 'company_phone', 'company_email']
        }
      }
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return {
      name: configMap.company_name || 'CrediManager',
      taxId: configMap.company_tax_id || '00000000000',
      address: configMap.company_address || 'Dirección no configurada',
      phone: configMap.company_phone || 'Teléfono no configurado',
      email: configMap.company_email || 'email@ejemplo.com'
    };
  } catch (error) {
    return {
      name: 'CrediManager',
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

export const createPayment = async (req, res) => {
  try {
    const { loanId, amount, paymentDate, paymentMethod, reference, notes, cashId } = req.body;

    if (!loanId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!cashId) {
      return res.status(400).json({ error: 'Debe seleccionar una caja' });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        installments: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { installmentNumber: 'asc' }
        },
        customer: true
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (req.user.role === 'COBRADOR' && loan.collectorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only register payments for your assigned loans' });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Loan is not active' });
    }

    if (loan.installments.length === 0) {
      return res.status(400).json({ error: 'No pending installments' });
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

    // VALIDAR ORDEN
    const sortedPending = loan.installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
    const firstPending = sortedPending[0];
    
    const allInstallments = await prisma.installment.findMany({
      where: { 
        loanId: parseInt(loanId),
        installmentNumber: { lt: firstPending.installmentNumber }
      }
    });
    
    const hasUnpaidBefore = allInstallments.some(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    
    if (hasUnpaidBefore) {
      return res.status(400).json({ 
        error: 'Debe pagar las cuotas en orden. Complete primero las cuotas anteriores.' 
      });
    }

    // Usar lateFee ya calculado en BD (viene del getLoan)
    const installmentsWithLatePayment = loan.installments.map(inst => ({
      ...inst,
      lateFee: parseFloat(inst.lateFee || 0),
      totalWithFee: parseFloat(inst.total) + parseFloat(inst.lateFee || 0)
    }));

    // Aplicar pago a cuotas con TOLERANCIA ESTRICTA
    let remainingAmount = paymentAmount;
    const installmentsToPay = [];
    const tolerance = 0.005; // 0.5 centavos

    for (const installment of installmentsWithLatePayment) {
      // DETENER si remaining es casi 0
      if (remainingAmount <= tolerance) break;

      const totalDue = installment.totalWithFee;
      
      // Solo pagar si alcanza (con tolerancia mínima)
      if (remainingAmount >= totalDue - tolerance) {
        installmentsToPay.push({
          installmentId: installment.id,
          amount: totalDue,
          lateFee: installment.lateFee,
          principal: parseFloat(installment.principal),  
          interest: parseFloat(installment.interest)
        });
        remainingAmount -= totalDue;
        
        // Eliminar errores de punto flotante
        remainingAmount = Math.max(0, Math.round(remainingAmount * 100) / 100);
      } else {
        // No alcanza - DETENER
        break;
      }
    }

    if (installmentsToPay.length === 0) {
      return res.status(400).json({ 
        error: 'Payment amount is insufficient to cover at least one installment' 
      });
    }

    // TRANSACCIÓN
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          loanId: parseInt(loanId),
          collectedBy: req.user.id,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference: reference || null,
          observations: notes || null
        }
      });

      for (const item of installmentsToPay) {
        await tx.paymentInstallment.create({
          data: {
            paymentId: newPayment.id,
            installmentId: item.installmentId,
            amount: item.amount
          }
        });

        await tx.installment.update({
          where: { id: item.installmentId },
          data: { 
            status: 'PAID',
            paidAt: new Date(paymentDate),
            lateFee: item.lateFee,
            paidAmount: item.amount
          }
        });
      }

      const totalCapitalPaid = installmentsToPay.reduce((sum, item) => {
        return sum + item.principal;
      }, 0);

      let newBalance = parseFloat(loan.balance) - totalCapitalPaid;
      
      if (newBalance < 0.01) newBalance = 0;

      const allInstallments = await tx.installment.findMany({
        where: {loanId: parseInt(loanId)}
      });

      const allPaid = allInstallments.every(inst => inst.status === 'PAID'); 
      
      await tx.loan.update({
        where: { id: parseInt(loanId) },
        data: {
          balance: newBalance,
          status: (newBalance === 0 || allPaid) ? 'PAID' : 'ACTIVE'
        }
      });

      await tx.cashMovement.create({
        data: {
          cashId: parseInt(cashId),
          type: 'INCOME',
          concept: `Pago cuota préstamo #${loanId} - ${loan.customer.firstName} ${loan.customer.lastName}`,
          amount: paymentAmount,
          observations: `Método: ${paymentMethod}`,
          reference: reference || `PAYMENT-${newPayment.id}`,
          relatadId: newPayment.id.toString(),
          relatadType: 'PAYMENT',
          userId: req.user.id
        }
      });

      await tx.cash.update({
        where: { id: parseInt(cashId) },
        data: { 
          balance: { increment: paymentAmount }
        }
      });

      return newPayment;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'PAYMENTS',
        action: 'CREATE',
        details: `Payment of $${paymentAmount} for loan #${loanId} - ${installmentsToPay.length} installments paid - Caja: ${cash.name}`,
        ipAddress: req.ip
      }
    });

    const fullPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        loan: {
          include: {
            customer: true
          }
        },
        collector: {
          select: { id: true, fullName: true }
        },
        installments: {
          include: {
            installment: true
          }
        }
      }
    });

    const loanWithDetails = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        customer: true,
        collector: true
      }
    });

    if (loanWithDetails.collectorId) {
      await createNotification(
        loanWithDetails.collectorId,
        'PAYMENT',
        'Pago recibido',
        `Cliente ${loanWithDetails.customer.firstName} ${loanWithDetails.customer.lastName} pagó $${amount} en préstamo #${loanId}`,
        `/prestamos/${loanId}`
      );
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    });

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'PAYMENT',
        'Nuevo pago registrado',
        `Pago de $${amount} en préstamo #${loanId} por ${loanWithDetails.customer.firstName} ${loanWithDetails.customer.lastName}`,
        `/pagos`
      );
    }

    res.status(201).json(fullPayment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { loanId, customerId, collectorId, paymentMethod, startDate, endDate, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (req.user.role === 'COBRADOR') {
      where.loan = {
        collectorId: req.user.id
      };
    }
    
    if (loanId) where.loanId = parseInt(loanId);
    if (customerId) where.loanId = parseInt(customerId);
    if (collectorId) where.collectedBy = parseInt(collectorId);
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (search) {
      where.loan = {
        ...where.loan,
        customer: {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { documentNumber: { contains: search } }
          ]
        }
      };
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          loan: {
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
          collector: {
            select: {
              id: true,
              fullName: true
            }
          },
          installments: {
            include: {
              installment: {
                select: {
                  installmentNumber: true,
                  total: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        loan: {
          include: {
            customer: true
          }
        },
        collector: {
          select: {
            id: true,
            fullName: true
          }
        },
        installments: {
          include: {
            installment: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const whereFilter = req.user.role === 'COBRADOR'
      ? { loan: { collectorId: req.user.id } }
      : {};
    
    const [totalPayments, monthPayments, payments] = await Promise.all([
      prisma.payment.count({ where: whereFilter }),
      prisma.payment.count({
        where: { ...whereFilter, paymentDate: { gte: startOfMonth } }
      }),
      prisma.payment.findMany({
        where: whereFilter,
      })
    ]);

    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const monthAmount = payments
      .filter(p => new Date(p.paymentDate) >= startOfMonth)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({
      totalPayments,
      monthPayments,
      totalAmount,
      monthAmount
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
};

export const voidPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can void payments' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Void reason must be at least 10 characters' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        loan: true,
        installments: {
          include: {
            installment: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const cashMovement = await prisma.cashMovement.findFirst({
      where: {
        relatadType: 'PAYMENT',
        relatadId: payment.id.toString(),
        type: 'INCOME'
      }
    });
      
    await prisma.$transaction(async (tx) => {
      for (const paymentInst of payment.installments) {
        const installment = paymentInst.installment;
        const today = new Date();
        const dueDate = new Date(installment.dueDate);
        const isOverdue = today > dueDate;

        await tx.installment.update({
          where: { id: installment.id },
          data: {
            status: isOverdue ? 'OVERDUE' : 'PENDING',
            paidAt: null,
            paidAmount: 0,
            lateFee: isOverdue ? parseFloat(installment.lateFee || 0) : 0
          }
        });
      }

      const newBalance = parseFloat(payment.loan.balance) + parseFloat(payment.amount);
      
      await tx.loan.update({
        where: { id: payment.loanId },
        data: {
          balance: newBalance,
          status: 'ACTIVE'
        }
      });

      await tx.payment.update({
        where: { id: parseInt(id) },
        data: {
          observations: `[ANULADO] ${reason}. Original: ${payment.observations || 'Sin observaciones'}`
        }
      });

      if (cashMovement) {
        await tx.cashMovement.update({
          where: { id: cashMovement.id },
          data: {
            observations: `[ANULADO] ${reason}. Original: ${cashMovement.observations || ''}`
          }
        });

        await tx.cash.update({
          where: { id: cashMovement.cashId },
          data: {
            balance: { decrement: parseFloat(payment.amount) }
          }
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'PAYMENTS',
        action: 'VOID',
        details: `Voided payment #${id} - Amount: $${payment.amount} - Reason: ${reason}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Payment voided successfully' });
  } catch (error) {
    console.error('Void payment error:', error);
    res.status(500).json({ error: 'Failed to void payment' });
  }
};

export const generateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await getCompanyConfig();

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        loan: {
          include: {
            customer: true
          }
        },
        collector: {
          select: {
            id: true,
            fullName: true
          }
        },
        installments: {
          include: {
            installment: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (req.user.role === 'COBRADOR' && payment.loan.collectorId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprobante-pago-${payment.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(company.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`RUC/NIT: ${company.taxId}`, { align: 'center' });
    doc.text(company.address, { align: 'center' });
    doc.text(`Tel: ${company.phone} | Email: ${company.email}`, { align: 'center' });
    
    doc.moveDown(1.5);
    doc.fontSize(18).font('Helvetica-Bold').text('COMPROBANTE DE PAGO', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`N° ${String(payment.id).padStart(8, '0')}`, { align: 'center' });
    
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DEL PAGO');
    doc.moveDown(0.5);

    const paymentInfo = [
      ['Fecha de Pago:', formatDate(payment.paymentDate)],
      ['Monto Pagado:', formatCurrency(payment.amount)],
      ['Método de Pago:', payment.paymentMethod],
      ['Referencia:', payment.reference || 'N/A'],
      ['Recibido por:', payment.collector.fullName]
    ];

    doc.fontSize(10).font('Helvetica');
    paymentInfo.forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DEL CLIENTE');
    doc.moveDown(0.5);

    const clientInfo = [
      ['Cliente:', `${payment.loan.customer.firstName} ${payment.loan.customer.lastName}`],
      ['Documento:', `${payment.loan.customer.documentType} ${payment.loan.customer.documentNumber}`],
      ['Teléfono:', payment.loan.customer.phone],
      ['Préstamo N°:', String(payment.loanId).padStart(6, '0')]
    ];

    doc.fontSize(10).font('Helvetica');
    clientInfo.forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('CUOTAS CANCELADAS');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [100, 120, 120, 120];
    const headers = ['N° Cuota', 'Fecha Venc.', 'Mora', 'Monto Pagado'];

    doc.fontSize(9).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(510, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    let yPos = tableTop + 20;

    payment.installments.forEach((pi) => {
      xPos = 50;
      const rowData = [
        `Cuota ${pi.installment.installmentNumber}`,
        formatDate(pi.installment.dueDate),
        formatCurrency(pi.installment.lateFee),
        formatCurrency(pi.amount)
      ];

      rowData.forEach((data, i) => {
        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      yPos += 20;
    });

    doc.moveTo(50, yPos).lineTo(510, yPos).stroke();
    yPos += 10;

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL PAGADO:', 50, yPos);
    doc.text(formatCurrency(payment.amount), 390, yPos, { width: 120, align: 'center' });

    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('ESTADO DEL PRÉSTAMO');
    doc.moveDown(0.5);

    const loanStatus = [
      ['Monto Original:', formatCurrency(payment.loan.amount)],
      ['Saldo Pendiente:', formatCurrency(payment.loan.balance)],
      ['Estado:', payment.loan.status === 'PAID' ? 'PAGADO' : 'ACTIVO']
    ];

    doc.fontSize(10).font('Helvetica');
    loanStatus.forEach(([label, value]) => {
      doc.text(`${label} `, { continued: true }).font('Helvetica-Bold').text(value);
      doc.font('Helvetica');
    });

    if (payment.observations) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold').text('Observaciones:');
      doc.font('Helvetica').text(payment.observations, { align: 'justify' });
    }

    doc.moveDown(3);

    doc.fontSize(10).font('Helvetica').text(`Fecha: ${formatDate(payment.paymentDate)}`, { align: 'center' });
    doc.moveDown(2);

    doc.moveTo(200, doc.y).lineTo(400, doc.y).stroke();
    doc.moveDown(0.3);
    doc.text(payment.collector.fullName, { align: 'center' });
    doc.text('RECIBÍ CONFORME', { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('gray')
      .text('Este comprobante es válido sin firma ni sello.', { align: 'center' });
    doc.text('Para consultas: ' + company.email, { align: 'center' });

    doc.end();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'PDF',
        action: 'GENERATE_RECEIPT',
        details: `Generated payment receipt for payment #${payment.id}`,
        ipAddress: req.ip
      }
    });

  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};

export const previewPayment = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { amount } = req.body;

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        installments: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { installmentNumber: 'asc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.installments.length === 0) {
      return res.json({
        installmentsToPay: [],
        totalLatePaymentFee: 0,
        remainingAmount: paymentAmount,
        newBalance: loan.balance,
        allPaid: true
      });
    }

    let remainingAmount = paymentAmount;
    const installmentsToPay = [];
    let totalLatePaymentFee = 0;

    const today = new Date();

    for (const installment of loan.installments) {
      if (remainingAmount <= 0) break;

      const dueDate = new Date(installment.dueDate);
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      let lateFee = 0;
      if (daysLate > 0 && installment.status === 'OVERDUE') {
        lateFee = parseFloat((installment.total * 0.01 * daysLate).toFixed(2));
      }

      const installmentBase = parseFloat(installment.total);
      const totalDue = installmentBase + lateFee;

      if (remainingAmount >= totalDue) {
        installmentsToPay.push({
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          installmentBase,
          lateFee,
          daysLate: daysLate > 0 ? daysLate : 0,
          totalDue,
          willBePaid: true
        });
        totalLatePaymentFee += lateFee;
        remainingAmount -= totalDue;
      } else {
        break;
      }
    }

    const totalToPay = installmentsToPay.reduce((sum, i) => sum + i.totalDue, 0);
    const newBalance = parseFloat(loan.balance) - totalToPay;

    res.json({
      installmentsToPay,
      totalLatePaymentFee,
      remainingAmount,
      newBalance: newBalance > 0 ? newBalance : 0,
      insufficientAmount: installmentsToPay.length === 0,
      allPaid: false
    });

  } catch (error) {
    console.error('Preview payment error:', error);
    res.status(500).json({ error: 'Failed to calculate preview' });
  }
};