import prisma from '../config/database.js';

// Helper para actualizar estados de cuotas (igual que en loans.controller.js)
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

export const getDashboardStats = async (req, res) => {
  try {
    const whereFilter = req.user.role === 'COBRADOR' 
      ? { collectorId: req.user.id } 
      : {};

    // PRIMERO: Actualizar estados de todas las cuotas activas
    const allActiveInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        loan: {
          ...whereFilter,
          status: 'ACTIVE'
        }
      },
      select: { id: true, status: true, dueDate: true, lateFee: true }
    });

    if (allActiveInstallments.length > 0) {
      await updateInstallmentStatuses(allActiveInstallments);
    }

    // Summary stats
    const [
      totalActiveLoans,
      totalPaidLoans,
      activeLoans,
      thisMonthPayments,
      pendingApplications,
      loansWithOverdue
    ] = await Promise.all([
      prisma.loan.count({ where: { ...whereFilter, status: 'ACTIVE' } }),
      prisma.loan.count({ where: { ...whereFilter, status: 'PAID' } }),
      prisma.loan.findMany({
        where: { ...whereFilter, status: 'ACTIVE' },
        select: { amount: true, balance: true }
      }),
      prisma.payment.findMany({
        where: {
          ...whereFilter,
          paymentDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        select: { amount: true }
      }),
      prisma.loanApplication.count({
        where: { status: 'PENDING' }
      }),
      // Contar préstamos con cuotas OVERDUE
      prisma.loan.count({
        where: {
          ...whereFilter,
          status: 'ACTIVE',
          installments: {
            some: {
              status: 'OVERDUE'
            }
          }
        }
      })
    ]);

    const totalDisbursed = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
    const totalPending = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.balance), 0);
    const recoveredThisMonth = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Overdue amount CON MORA
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        status: 'OVERDUE',
        loan: whereFilter
      },
      select: { 
        total: true,
        lateFee: true
      }
    });
    
    const overdueAmount = overdueInstallments.reduce((sum, i) => {
      const base = parseFloat(i.total);
      const mora = parseFloat(i.lateFee || 0);
      return sum + base + mora;
    }, 0);

    // Monthly stats (últimos 12 meses) - CORREGIDO
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const [activeCount, paidCount, overdueCount] = await Promise.all([
        prisma.loan.count({
          where: {
            ...whereFilter,
            status: 'ACTIVE',
            createdAt: { lte: monthEnd }
          }
        }),
        prisma.loan.count({
          where: {
            ...whereFilter,
            status: 'PAID',
            updatedAt: { lte: monthEnd }
          }
        }),
        // Contar préstamos con cuotas OVERDUE en ese mes
        prisma.loan.count({
          where: {
            ...whereFilter,
            status: 'ACTIVE',
            createdAt: { lte: monthEnd },
            installments: {
              some: {
                status: 'OVERDUE'
              }
            }
          }
        })
      ]);

      monthlyStats.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        activos: activeCount,
        pagados: paidCount,
        mora: overdueCount
      });
    }

    // Pie chart data - CORREGIDO
    const pieData = [
      { name: 'Activos', value: totalActiveLoans, color: '#10b981' },
      { name: 'Pagados', value: totalPaidLoans, color: '#3b82f6' },
      { name: 'En Mora', value: loansWithOverdue, color: '#ef4444' }
    ];

    // Próximos vencimientos (7 días)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingInstallments = await prisma.installment.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: today,
          lte: nextWeek
        },
        loan: {
          ...whereFilter,
          status: 'ACTIVE'
        }
      },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 7
    });

    // Top 5 clientes en mora CON MORA
    const overdueLoans = await prisma.loan.findMany({
      where: {
        ...whereFilter,
        status: 'ACTIVE',
        installments: {
          some: {
            status: 'OVERDUE'
          }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true
          }
        },
        installments: {
          where: {
            status: 'OVERDUE'
          },
          orderBy: {
            dueDate: 'asc'
          }
        }
      }
    });

    const clientsWithOverdue = overdueLoans.map(loan => {
      const oldestOverdue = loan.installments[0];
      const daysOverdue = Math.floor(
        (today - new Date(oldestOverdue.dueDate)) / (1000 * 60 * 60 * 24)
      );
      
      // Incluir mora en el cálculo
      const totalOverdue = loan.installments.reduce((sum, inst) => {
        const base = parseFloat(inst.total);
        const mora = parseFloat(inst.lateFee || 0);
        return sum + base + mora;
      }, 0);

      return {
        customerId: loan.customer.id,
        customerName: `${loan.customer.firstName} ${loan.customer.lastName}`,
        documentNumber: loan.customer.documentNumber,
        loanId: loan.id,
        daysOverdue,
        overdueAmount: totalOverdue,
        installmentsCount: loan.installments.length
      };
    });

    const topOverdueClients = clientsWithOverdue
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    res.json({
      summary: {
        totalActiveLoans,
        totalPaidLoans,
        totalDefaultedLoans: loansWithOverdue,
        totalDisbursed,
        totalPending,
        recoveredThisMonth,
        overdueAmount,
        pendingApplications
      },
      monthlyStats,
      pieData,
      upcomingInstallments: upcomingInstallments.map(inst => ({
        id: inst.id,
        loanId: inst.loanId,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: parseFloat(inst.total),
        customer: {
          id: inst.loan.customer.id,
          name: `${inst.loan.customer.firstName} ${inst.loan.customer.lastName}`
        }
      })),
      topOverdueClients
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};