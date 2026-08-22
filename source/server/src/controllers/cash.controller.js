import prisma from '../config/database.js';

// Obtener estadísticas de cajas
export const getCashStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalBalance, todayIncome, todayExpense] = await Promise.all([
      prisma.cash.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { balance: true }
      }),
      prisma.cashMovement.aggregate({
        where: {
          type: 'INCOME',
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      }),
      prisma.cashMovement.aggregate({
        where: {
          type: 'EXPENSE',
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      })
    ]);

    res.json({
      totalBalance: totalBalance._sum.balance || 0,
      todayIncome: todayIncome._sum.amount || 0,
      todayExpense: todayExpense._sum.amount || 0
    });

  } catch (error) {
    console.error('Get cash stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// Obtener todas las cajas
export const getCashes = async (req, res) => {
  try {
    const cashes = await prisma.cash.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    res.json(cashes);

  } catch (error) {
    console.error('Get cashes error:', error);
    res.status(500).json({ error: 'Error al obtener cajas' });
  }
};

// Crear caja
export const createCash = async (req, res) => {
  try {
    const { name, description, type, balance = 0 } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden crear cajas' });
    }

    const cash = await prisma.cash.create({
      data: {
        name,
        description,
        type,
        balance: parseFloat(balance)
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CASH',
        action: 'CREATE',
        details: `Creó caja "${name}" con saldo inicial $${balance}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(cash);

  } catch (error) {
    console.error('Create cash error:', error);
    res.status(500).json({ error: 'Error al crear caja' });
  }
};

// Obtener movimientos de una caja
export const getCashMovements = async (req, res) => {
  try {
    const { cashId } = req.params;
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = { cashId: parseInt(cashId) };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.cashMovement.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          cash: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cashMovement.count({ where })
    ]);

    res.json({
      movements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get cash movements error:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

// Crear movimiento (ingreso/egreso)
export const createMovement = async (req, res) => {
  try {
    const { cashId, type, concept, amount, observations, reference, relatedId, relatedType } = req.body;

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
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

    // Calcular nuevo balance
    const movementAmount = parseFloat(amount);
    const newBalance = type === 'INCOME' 
      ? parseFloat(cash.balance) + movementAmount
      : parseFloat(cash.balance) - movementAmount;

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    // Crear movimiento y actualizar balance en transacción
    const [movement] = await prisma.$transaction([
      prisma.cashMovement.create({
        data: {
          cashId: parseInt(cashId),
          type,
          concept,
          amount: movementAmount,
          observations,
          reference,
          relatadId: relatedId,
          relatadType: relatedType,
          userId: req.user.id
        },
        include: {
          cash: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }),
      prisma.cash.update({
        where: { id: parseInt(cashId) },
        data: { balance: newBalance }
      })
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CASH',
        action: 'CREATE_MOVEMENT',
        details: `${type === 'INCOME' ? 'Ingreso' : 'Egreso'} de $${amount} en caja "${cash.name}" - ${concept}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(movement);

  } catch (error) {
    console.error('Create movement error:', error);
    res.status(500).json({ error: 'Error al crear movimiento' });
  }
};

// Transferir entre cajas
export const transferBetweenCashes = async (req, res) => {
  try {
    const { fromCashId, toCashId, amount, reason } = req.body;

    if (fromCashId === toCashId) {
      return res.status(400).json({ error: 'No se puede transferir a la misma caja' });
    }

    const [fromCash, toCash] = await Promise.all([
      prisma.cash.findUnique({ where: { id: parseInt(fromCashId) } }),
      prisma.cash.findUnique({ where: { id: parseInt(toCashId) } })
    ]);

    if (!fromCash || !toCash) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    if (fromCash.status !== 'ACTIVE' || toCash.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Ambas cajas deben estar activas' });
    }

    const transferAmount = parseFloat(amount);
    const newFromBalance = parseFloat(fromCash.balance) - transferAmount;

    if (newFromBalance < 0) {
      return res.status(400).json({ error: 'Saldo insuficiente en la caja origen' });
    }

    const newToBalance = parseFloat(toCash.balance) + transferAmount;

    // Crear transferencia y actualizar balances en transacción
    const [transfer] = await prisma.$transaction([
      prisma.cashTransfer.create({
        data: {
          fromCashId: parseInt(fromCashId),
          toCashId: parseInt(toCashId),
          amount: transferAmount,
          reason,
          userId: req.user.id
        },
        include: {
          fromCash: true,
          toCash: true,
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }),
      prisma.cash.update({
        where: { id: parseInt(fromCashId) },
        data: { balance: newFromBalance }
      }),
      prisma.cash.update({
        where: { id: parseInt(toCashId) },
        data: { balance: newToBalance }
      })
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'CASH',
        action: 'TRANSFER',
        details: `Transfirió $${amount} de "${fromCash.name}" a "${toCash.name}"`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(transfer);

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Error al realizar transferencia' });
  }
};

// Obtener flujo de caja (últimos 30 días)
export const getCashFlow = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movements = await prisma.cashMovement.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        type: true,
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Agrupar por día
    const flowByDay = {};
    movements.forEach(m => {
      const date = new Date(m.createdAt).toISOString().split('T')[0];
      if (!flowByDay[date]) {
        flowByDay[date] = { date, income: 0, expense: 0 };
      }
      
      if (m.type === 'INCOME') {
        flowByDay[date].income += parseFloat(m.amount);
      } else {
        flowByDay[date].expense += parseFloat(m.amount);
      }
    });

    const flow = Object.values(flowByDay);

    res.json(flow);

  } catch (error) {
    console.error('Get cash flow error:', error);
    res.status(500).json({ error: 'Error al obtener flujo de caja' });
  }
};

// Cerrar caja
export const closeCash = async (req, res) => {
  try {
    const { cashId, closureDate, physicalBalance, observations, denominations } = req.body;

    const cash = await prisma.cash.findUnique({
      where: { id: parseInt(cashId) }
    });

    if (!cash) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    // Obtener movimientos del día
    const startOfDay = new Date(closureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(closureDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [income, expense, lastClosure] = await Promise.all([
      prisma.cashMovement.aggregate({
        where: {
          cashId: parseInt(cashId),
          type: 'INCOME',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: { amount: true }
      }),
      prisma.cashMovement.aggregate({
        where: {
          cashId: parseInt(cashId),
          type: 'EXPENSE',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: { amount: true }
      }),
      prisma.cashClosure.findFirst({
        where: {
          cashId: parseInt(cashId)
        },
        orderBy: { closureDate: 'desc' }
      })
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const initialBalance = lastClosure ? lastClosure.physicalBalance : 0;
    const theoreticalBalance = parseFloat(initialBalance) + parseFloat(totalIncome) - parseFloat(totalExpense);
    const difference = parseFloat(physicalBalance) - theoreticalBalance;

    const closure = await prisma.cashClosure.create({
      data: {
        cashId: parseInt(cashId),
        closureDate: new Date(closureDate),
        initialBalance: parseFloat(initialBalance),
        totalIncome: parseFloat(totalIncome),
        totalExpense: parseFloat(totalExpense),
        theoreticalBalance: parseFloat(theoreticalBalance),
        physicalBalance: parseFloat(physicalBalance),
        difference: parseFloat(difference),
        observations,
        denominations: denominations || null,
        userId: req.user.id
      },
      include: {
        cash: true,
        user: {
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
        module: 'CASH',
        action: 'CLOSE',
        details: `Cierre de caja "${cash.name}" - Diferencia: $${difference}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(closure);

  } catch (error) {
    console.error('Close cash error:', error);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
};

// Obtener cierres de caja
export const getCashClosures = async (req, res) => {
  try {
    const { cashId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = cashId ? { cashId: parseInt(cashId) } : {};

    const [closures, total] = await Promise.all([
      prisma.cashClosure.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          cash: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: { closureDate: 'desc' }
      }),
      prisma.cashClosure.count({ where })
    ]);

    res.json({
      closures,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get closures error:', error);
    res.status(500).json({ error: 'Error al obtener cierres' });
  }
};