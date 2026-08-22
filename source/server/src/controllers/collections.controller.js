import prisma from '../config/database.js';

// Obtener estadísticas de morosidad
export const getCollectionStats = async (req, res) => {
  try {
    const whereFilter = req.user.role === 'COBRADOR' 
      ? { collectorId: req.user.id } 
      : {};

    // Obtener préstamos con cuotas vencidas
    const overdueLoans = await prisma.loan.findMany({
      where: {
        ...whereFilter,
        status: { in: ['ACTIVE', 'DEFAULTED'] }, 
        installments: {
          some: { status: 'OVERDUE' }
        }
      },
      include: {
        installments: {
          where: { status: 'OVERDUE' }
        },
        customer: true
      }
    });

    // Calcular estadísticas
    const totalOverdueAmount = overdueLoans.reduce((sum, loan) => {
      const loanOverdue = loan.installments.reduce((s, inst) => 
        s + parseFloat(inst.total) + parseFloat(inst.lateFee), 0
      );
      return sum + loanOverdue;
    }, 0);

    const uniqueCustomers = new Set(overdueLoans.map(l => l.customerId)).size;

    // Calcular días de mora promedio
    const today = new Date();
    let totalDaysOverdue = 0;
    let installmentCount = 0;

    overdueLoans.forEach(loan => {
      loan.installments.forEach(inst => {
        const dueDate = new Date(inst.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        totalDaysOverdue += daysOverdue;
        installmentCount++;
      });
    });

    const avgDaysOverdue = installmentCount > 0 
      ? Math.round(totalDaysOverdue / installmentCount) 
      : 0;

    res.json({
      totalOverdueAmount,
      overdueCustomers: uniqueCustomers,
      overdueLoans: overdueLoans.length,
      avgDaysOverdue
    });

  } catch (error) {
    console.error('Get collection stats error:', error);
    res.status(500).json({ error: 'Failed to fetch collection stats' });
  }
};

// Obtener listado de morosos
export const getOverdueLoans = async (req, res) => {
  try {
    const { daysRange, collectorId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereFilter = req.user.role === 'COBRADOR' 
      ? { collectorId: req.user.id } 
      : {};

    if (collectorId && req.user.role !== 'COBRADOR') {
      whereFilter.collectorId = parseInt(collectorId);
    }

    // Obtener préstamos con cuotas vencidas
    const loans = await prisma.loan.findMany({
      where: {
        ...whereFilter,
        status: { in: ['ACTIVE', 'DEFAULTED'] }, 
        installments: {
          some: { status: 'OVERDUE' }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true,
            email: true
          }
        },
        collector: {
          select: {
            id: true,
            fullName: true
          }
        },
        installments: {
          where: { status: 'OVERDUE' },
          orderBy: { dueDate: 'asc' }
        },
        collectionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calcular días de mora y monto vencido por préstamo
    const today = new Date();
    const loansWithOverdue = loans.map(loan => {
      const oldestInstallment = loan.installments[0];
      const daysOverdue = oldestInstallment 
        ? Math.floor((today - new Date(oldestInstallment.dueDate)) / (1000 * 60 * 60 * 24))
        : 0;

      const overdueAmount = loan.installments.reduce((sum, inst) => 
        sum + parseFloat(inst.total), 0
      );

      const lateFeeAmount = loan.installments.reduce((sum, inst) => 
        sum + parseFloat(inst.lateFee), 0
      );

      return {
        ...loan,
        daysOverdue,
        overdueAmount,
        lateFeeAmount,
        lastContact: loan.collectionLogs[0] || null
      };
    });

    // Filtrar por rango de días si se especifica
    let filteredLoans = loansWithOverdue;
    if (daysRange) {
      const [min, max] = daysRange.split('-').map(Number);
      filteredLoans = loansWithOverdue.filter(loan => {
        if (max) {
          return loan.daysOverdue >= min && loan.daysOverdue <= max;
        } else {
          return loan.daysOverdue >= min;
        }
      });
    }

    // Ordenar por días de mora (mayor a menor)
    filteredLoans.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Paginación
    const total = filteredLoans.length;
    const paginatedLoans = filteredLoans.slice(skip, skip + parseInt(limit));

    res.json({
      loans: paginatedLoans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get overdue loans error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue loans' });
  }
};

// Crear gestión de cobranza
export const createCollectionLog = async (req, res) => {
  try {
    const { 
      loanId, 
      contactType, 
      result, 
      promiseDate, 
      promiseAmount, 
      nextFollowUp, 
      observations 
    } = req.body;

    // Validaciones críticas
    if (!loanId || !contactType || !result) {
      return res.status(400).json({ 
        error: 'Missing required fields: loanId, contactType, result' 
      });
    }

    // Verificar que el préstamo existe
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Preparar datos con validaciones robustas
    const collectionData = {
      loanId: parseInt(loanId),
      contactType: contactType.trim(),
      result: result.trim(),
      collectorId: req.user.id,
      observations: observations ? observations.trim() : null
    };

    // Validar y convertir promiseDate solo si tiene valor
    if (promiseDate && promiseDate.trim() !== '') {
      const parsedDate = new Date(promiseDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid promiseDate format' });
      }
      collectionData.promiseDate = parsedDate;
    } else {
      collectionData.promiseDate = null;
    }

    // Validar y convertir promiseAmount solo si tiene valor válido
    if (promiseAmount !== null && promiseAmount !== undefined && promiseAmount !== '') {
      const amount = parseFloat(promiseAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ error: 'Invalid promiseAmount value' });
      }
      collectionData.promiseAmount = amount;
    } else {
      collectionData.promiseAmount = null;
    }

    // Validar y convertir nextFollowUp solo si tiene valor
    if (nextFollowUp && nextFollowUp.trim() !== '') {
      const parsedFollowUp = new Date(nextFollowUp);
      if (isNaN(parsedFollowUp.getTime())) {
        return res.status(400).json({ error: 'Invalid nextFollowUp format' });
      }
      collectionData.nextFollowUp = parsedFollowUp;
    } else {
      collectionData.nextFollowUp = null;
    }

    // Crear el log con datos validados
    const log = await prisma.collectionLog.create({
      data: collectionData,
      include: {
        collector: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'COLLECTIONS',
        action: 'CREATE_LOG',
        details: `Collection log created for loan #${loanId} - Type: ${contactType}, Result: ${result}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(log);

  } catch (error) {
    console.error('Create collection log error:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    
    res.status(500).json({ 
      error: 'Failed to create collection log',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener gestiones de un préstamo
export const getCollectionLogs = async (req, res) => {
  try {
    const { loanId } = req.params;

    const logs = await prisma.collectionLog.findMany({
      where: { loanId: parseInt(loanId) },
      include: {
        collector: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(logs);

  } catch (error) {
    console.error('Get collection logs error:', error);
    res.status(500).json({ error: 'Failed to fetch collection logs' });
  }
};