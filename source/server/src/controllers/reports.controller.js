import prisma from '../config/database.js';

// 1. REPORTE DE CARTERA TOTAL
export const getPortfolioReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereFilter = req.user.role === 'COBRADOR' 
      ? { collectorId: req.user.id } 
      : {};

    if (startDate && endDate) {
      whereFilter.disbursementDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const loans = await prisma.loan.findMany({
      where: whereFilter,
      include: {
        installments: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            documentNumber: true
          }
        },
        collector: {
          select: {
            fullName: true
          }
        }
      }
    });

    const portfolioData = {
      active: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0, lateFee: 0 }
    };

    const detailedLoans = loans.map(loan => {
      const totalAmount = parseFloat(loan.amount);
      const balance = loan.installments
        .filter(i => i.status !== 'PAID')
        .reduce((sum, i) => sum + parseFloat(i.total) + parseFloat(i.lateFee || 0), 0);
      
      const hasOverdue = loan.installments.some(i => i.status === 'OVERDUE');
      const overdueAmount = loan.installments
        .filter(i => i.status === 'OVERDUE')
        .reduce((sum, i) => sum + parseFloat(i.total), 0);
      
      const lateFeeAmount = loan.installments
        .filter(i => i.status === 'OVERDUE')
        .reduce((sum, i) => sum + parseFloat(i.lateFee || 0), 0);

      if (loan.status === 'PAID') {
        portfolioData.paid.count++;
        portfolioData.paid.amount += totalAmount;
      } else if (hasOverdue) {
        portfolioData.overdue.count++;
        portfolioData.overdue.amount += overdueAmount;
        portfolioData.overdue.lateFee += lateFeeAmount;
      } else {
        portfolioData.active.count++;
        portfolioData.active.amount += balance;
      }

      return {
        id: loan.id,
        customer: `${loan.customer.firstName} ${loan.customer.lastName}`,
        documentNumber: loan.customer.documentNumber,
        collector: loan.collector.fullName,
        amount: totalAmount,
        balance: balance,
        status: loan.status,
        hasOverdue: hasOverdue,
        overdueAmount: overdueAmount,
        lateFee: lateFeeAmount,
        disbursementDate: loan.disbursementDate
      };
    });

    res.json({
      summary: portfolioData,
      loans: detailedLoans,
      total: {
        loans: loans.length,
        amount: loans.reduce((sum, l) => sum + parseFloat(l.amount), 0)
      }
    });

  } catch (error) {
    console.error('Portfolio report error:', error);
    res.status(500).json({ error: 'Failed to generate portfolio report' });
  }
};

// 2. REPORTE DE INGRESOS POR PERÍODO
export const getIncomeReport = async (req, res) => {
  try {
    const { startDate, endDate, collectorId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const whereFilter = {
      paymentDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (req.user.role === 'COBRADOR') {
      whereFilter.collectedBy = req.user.id;
    } else if (collectorId) {
      whereFilter.collectedBy = parseInt(collectorId);
    }

    const payments = await prisma.payment.findMany({
      where: whereFilter,
      include: {
        loan: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        collector: {
          select: {
            fullName: true
          }
        },
        installments: {
          include: {
            installment: true
          }
        }
      },
      orderBy: { paymentDate: 'asc' }
    });

    const dailyIncome = {};
    const methodBreakdown = {};
    let totalIncome = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalLateFee = 0;

    const detailedPayments = payments.map(payment => {
      const amount = parseFloat(payment.amount);
      totalIncome += amount;

      const dateKey = payment.paymentDate.toISOString().split('T')[0];
      dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + amount;

      methodBreakdown[payment.paymentMethod] = 
        (methodBreakdown[payment.paymentMethod] || 0) + amount;

      let principal = 0;
      let interest = 0;
      let lateFee = 0;

      payment.installments.forEach(pi => {
        const inst = pi.installment;
        const allocatedAmount = parseFloat(pi.amount);
        const instPrincipal = parseFloat(inst.principal);
        const instInterest = parseFloat(inst.interest);
        const instLateFee = parseFloat(inst.lateFee || 0);
        const instTotal = instPrincipal + instInterest + instLateFee;

        if (instTotal > 0) {
          principal += (instPrincipal / instTotal) * allocatedAmount;
          interest += (instInterest / instTotal) * allocatedAmount;
          lateFee += (instLateFee / instTotal) * allocatedAmount;
        }
      });

      totalPrincipal += principal;
      totalInterest += interest;
      totalLateFee += lateFee;

      return {
        id: payment.id,
        date: payment.paymentDate,
        customer: `${payment.loan.customer.firstName} ${payment.loan.customer.lastName}`,
        loanId: payment.loanId,
        amount: amount,
        method: payment.paymentMethod,
        collector: payment.collector.fullName,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        lateFee: Math.round(lateFee * 100) / 100,
        reference: payment.reference
      };
    });

    const dailyData = Object.entries(dailyIncome).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100
    }));

    res.json({
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalPrincipal: Math.round(totalPrincipal * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalLateFee: Math.round(totalLateFee * 100) / 100,
        paymentCount: payments.length
      },
      dailyIncome: dailyData,
      methodBreakdown: Object.entries(methodBreakdown).map(([method, amount]) => ({
        method,
        amount: Math.round(amount * 100) / 100
      })),
      payments: detailedPayments
    });

  } catch (error) {
    console.error('Income report error:', error);
    res.status(500).json({ error: 'Failed to generate income report' });
  }
};

// 3. REPORTE DE PRÉSTAMOS DESEMBOLSADOS
export const getDisbursementReport = async (req, res) => {
  try {
    const { startDate, endDate, collectorId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const whereFilter = {
      disbursementDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (req.user.role === 'COBRADOR') {
      whereFilter.collectorId = req.user.id;
    } else if (collectorId) {
      whereFilter.collectorId = parseInt(collectorId);
    }

    const loans = await prisma.loan.findMany({
      where: whereFilter,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true
          }
        },
        collector: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: { disbursementDate: 'desc' }
    });

    const dailyDisbursements = {};
    const methodBreakdown = {};
    const frequencyBreakdown = {};
    let totalAmount = 0;

    const detailedLoans = loans.map(loan => {
      const amount = parseFloat(loan.amount);
      totalAmount += amount;

      const dateKey = loan.disbursementDate.toISOString().split('T')[0];
      dailyDisbursements[dateKey] = {
        count: (dailyDisbursements[dateKey]?.count || 0) + 1,
        amount: (dailyDisbursements[dateKey]?.amount || 0) + amount
      };

      methodBreakdown[loan.disbursementMethod] = 
        (methodBreakdown[loan.disbursementMethod] || 0) + amount;

      frequencyBreakdown[loan.frequency] = 
        (frequencyBreakdown[loan.frequency] || 0) + 1;

      return {
        id: loan.id,
        date: loan.disbursementDate,
        customer: `${loan.customer.firstName} ${loan.customer.lastName}`,
        documentNumber: loan.customer.documentNumber,
        phone: loan.customer.phone,
        amount: amount,
        interestRate: parseFloat(loan.interestRate),
        term: loan.term,
        frequency: loan.frequency,
        method: loan.disbursementMethod,
        collector: loan.collector.fullName
      };
    });

    const dailyData = Object.entries(dailyDisbursements).map(([date, data]) => ({
      date,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100
    }));

    res.json({
      summary: {
        totalLoans: loans.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        averageAmount: loans.length > 0 
          ? Math.round((totalAmount / loans.length) * 100) / 100 
          : 0
      },
      dailyDisbursements: dailyData,
      methodBreakdown: Object.entries(methodBreakdown).map(([method, amount]) => ({
        method,
        amount: Math.round(amount * 100) / 100
      })),
      frequencyBreakdown: Object.entries(frequencyBreakdown).map(([freq, count]) => ({
        frequency: freq,
        count
      })),
      loans: detailedLoans
    });

  } catch (error) {
    console.error('Disbursement report error:', error);
    res.status(500).json({ error: 'Failed to generate disbursement report' });
  }
};

// 4. REPORTE DE MORA DETALLADA
export const getOverdueReport = async (req, res) => {
  try {
    const { collectorId, daysRange } = req.query;

    const whereFilter = {
      status: { in: ['ACTIVE', 'DEFAULTED'] },
      installments: {
        some: { status: 'OVERDUE' }
      }
    };

    if (req.user.role === 'COBRADOR') {
      whereFilter.collectorId = req.user.id;
    } else if (collectorId) {
      whereFilter.collectorId = parseInt(collectorId);
    }

    const loans = await prisma.loan.findMany({
      where: whereFilter,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            documentNumber: true,
            phone: true
          }
        },
        collector: {
          select: {
            fullName: true
          }
        },
        installments: {
          where: { status: 'OVERDUE' },
          orderBy: { dueDate: 'asc' }
        },
        collectionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            collector: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    const today = new Date();
    const rangeBreakdown = {
      '1-7': { count: 0, amount: 0 },
      '8-15': { count: 0, amount: 0 },
      '16-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61+': { count: 0, amount: 0 }
    };

    let totalOverdue = 0;
    let totalLateFee = 0;

    const detailedLoans = loans.map(loan => {
      const oldestInstallment = loan.installments[0];
      const daysOverdue = oldestInstallment 
        ? Math.floor((today - new Date(oldestInstallment.dueDate)) / (1000 * 60 * 60 * 24))
        : 0;

      const overdueAmount = loan.installments.reduce((sum, inst) => 
        sum + parseFloat(inst.total), 0
      );

      const lateFeeAmount = loan.installments.reduce((sum, inst) => 
        sum + parseFloat(inst.lateFee || 0), 0
      );

      totalOverdue += overdueAmount;
      totalLateFee += lateFeeAmount;

      let range = '61+';
      if (daysOverdue <= 7) range = '1-7';
      else if (daysOverdue <= 15) range = '8-15';
      else if (daysOverdue <= 30) range = '16-30';
      else if (daysOverdue <= 60) range = '31-60';

      rangeBreakdown[range].count++;
      rangeBreakdown[range].amount += overdueAmount + lateFeeAmount;

      return {
        id: loan.id,
        customer: `${loan.customer.firstName} ${loan.customer.lastName}`,
        documentNumber: loan.customer.documentNumber,
        phone: loan.customer.phone,
        collector: loan.collector.fullName,
        daysOverdue: daysOverdue,
        overdueInstallments: loan.installments.length,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        lateFee: Math.round(lateFeeAmount * 100) / 100,
        totalDebt: Math.round((overdueAmount + lateFeeAmount) * 100) / 100,
        lastContact: loan.collectionLogs[0] || null
      };
    });

    let filteredLoans = detailedLoans;
    if (daysRange) {
      const [min, max] = daysRange.split('-').map(Number);
      filteredLoans = detailedLoans.filter(loan => {
        if (max) {
          return loan.daysOverdue >= min && loan.daysOverdue <= max;
        } else {
          return loan.daysOverdue >= min;
        }
      });
    }

    filteredLoans.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      summary: {
        totalLoans: filteredLoans.length,
        totalOverdueAmount: Math.round(totalOverdue * 100) / 100,
        totalLateFee: Math.round(totalLateFee * 100) / 100,
        totalDebt: Math.round((totalOverdue + totalLateFee) * 100) / 100
      },
      rangeBreakdown: Object.entries(rangeBreakdown).map(([range, data]) => ({
        range,
        count: data.count,
        amount: Math.round(data.amount * 100) / 100
      })),
      loans: filteredLoans
    });

  } catch (error) {
    console.error('Overdue report error:', error);
    res.status(500).json({ error: 'Failed to generate overdue report' });
  }
};

// 5. REPORTE DE RENDIMIENTO POR COBRADOR
export const getCollectorPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (req.user.role === 'COBRADOR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    const collectors = await prisma.user.findMany({
      where: {
        role: 'COBRADOR',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    const performanceData = await Promise.all(collectors.map(async (collector) => {
      const activeLoans = await prisma.loan.count({
        where: {
          collectorId: collector.id,
          status: 'ACTIVE'
        }
      });

      const overdueLoans = await prisma.loan.count({
        where: {
          collectorId: collector.id,
          status: { in: ['ACTIVE', 'DEFAULTED'] },
          installments: {
            some: { status: 'OVERDUE' }
          }
        }
      });

      const paymentsFilter = {
        collectedBy: collector.id
      };
      if (dateFilter) {
        paymentsFilter.paymentDate = dateFilter;
      }

      const payments = await prisma.payment.findMany({
        where: paymentsFilter
      });

      const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const collectionLogs = await prisma.collectionLog.count({
        where: {
          collectorId: collector.id,
          ...(dateFilter ? { createdAt: dateFilter } : {})
        }
      });

      const portfolioLoans = await prisma.loan.findMany({
        where: {
          collectorId: collector.id,
          status: { in: ['ACTIVE', 'DEFAULTED'] }
        },
        include: {
          installments: {
            where: { status: { in: ['PENDING', 'OVERDUE'] } }
          }
        }
      });

      const portfolioBalance = portfolioLoans.reduce((sum, loan) => {
        return sum + loan.installments.reduce((s, inst) => 
          s + parseFloat(inst.total) + parseFloat(inst.lateFee || 0), 0
        );
      }, 0);

      const overdueBalance = portfolioLoans.reduce((sum, loan) => {
        return sum + loan.installments
          .filter(i => i.status === 'OVERDUE')
          .reduce((s, inst) => s + parseFloat(inst.total) + parseFloat(inst.lateFee || 0), 0);
      }, 0);

      const recoveryRate = portfolioBalance > 0 
        ? ((portfolioBalance - overdueBalance) / portfolioBalance) * 100 
        : 0;

      return {
        id: collector.id,
        name: collector.fullName,
        email: collector.email,
        activeLoans: activeLoans,
        overdueLoans: overdueLoans,
        portfolioBalance: Math.round(portfolioBalance * 100) / 100,
        overdueBalance: Math.round(overdueBalance * 100) / 100,
        collectedAmount: Math.round(totalCollected * 100) / 100,
        paymentsCount: payments.length,
        collectionLogsCount: collectionLogs,
        recoveryRate: Math.round(recoveryRate * 100) / 100
      };
    }));

    performanceData.sort((a, b) => b.collectedAmount - a.collectedAmount);

    res.json({
      collectors: performanceData,
      summary: {
        totalCollectors: collectors.length,
        totalCollected: Math.round(
          performanceData.reduce((sum, c) => sum + c.collectedAmount, 0) * 100
        ) / 100,
        totalActiveLoans: performanceData.reduce((sum, c) => sum + c.activeLoans, 0),
        totalOverdueLoans: performanceData.reduce((sum, c) => sum + c.overdueLoans, 0)
      }
    });

  } catch (error) {
    console.error('Collector performance report error:', error);
    res.status(500).json({ error: 'Failed to generate collector performance report' });
  }
};

// 6. REPORTE DE CLIENTES
export const getCustomerReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const whereFilter = {};

    if (startDate && endDate) {
      whereFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (status) {
      whereFilter.status = status;
    }

    const customers = await prisma.customer.findMany({
      where: whereFilter,
      include: {
        loans: {
          include: {
            installments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const monthlyData = {};
    let totalNewCustomers = 0;
    let totalScore = 0;

    const detailedCustomers = customers.map(customer => {
      const monthKey = customer.createdAt.toISOString().slice(0, 7);
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      totalNewCustomers++;
      totalScore += customer.internalScore;

      const totalLoans = customer.loans.length;
      const activeLoans = customer.loans.filter(l => l.status === 'ACTIVE').length;
      const paidLoans = customer.loans.filter(l => l.status === 'PAID').length;

      const totalBorrowed = customer.loans.reduce((sum, l) => 
        sum + parseFloat(l.amount), 0
      );

      const currentBalance = customer.loans
        .filter(l => l.status === 'ACTIVE')
        .reduce((sum, loan) => {
          return sum + loan.installments
            .filter(i => i.status !== 'PAID')
            .reduce((s, inst) => s + parseFloat(inst.total) + parseFloat(inst.lateFee || 0), 0);
        }, 0);

      const hasOverdue = customer.loans.some(l => 
        l.installments.some(i => i.status === 'OVERDUE')
      );

      return {
        id: customer.id,
        fullName: `${customer.firstName} ${customer.lastName}`,
        documentNumber: customer.documentNumber,
        phone: customer.phone,
        email: customer.email,
        registrationDate: customer.createdAt,
        internalScore: customer.internalScore,
        status: customer.status,
        totalLoans: totalLoans,
        activeLoans: activeLoans,
        paidLoans: paidLoans,
        totalBorrowed: Math.round(totalBorrowed * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100,
        hasOverdue: hasOverdue
      };
    });

    const monthlyNewCustomers = Object.entries(monthlyData).map(([month, count]) => ({
      month,
      count
    }));

    res.json({
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'ACTIVE').length,
        inactiveCustomers: customers.filter(c => c.status === 'INACTIVE').length,
        averageScore: totalNewCustomers > 0 
          ? Math.round((totalScore / totalNewCustomers) * 100) / 100 
          : 0
      },
      monthlyNewCustomers: monthlyNewCustomers,
      customers: detailedCustomers
    });

  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({ error: 'Failed to generate customer report' });
  }
};

// 7. REPORTE DE AUDITORÍA
export const getAuditReport = async (req, res) => {
  try {
    const { startDate, endDate, userId, module, action } = req.query;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereFilter = {};

    if (startDate && endDate) {
      whereFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (userId) {
      whereFilter.userId = parseInt(userId);
    }

    if (module) {
      whereFilter.module = module;
    }

    if (action) {
      whereFilter.action = action;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereFilter,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    const moduleBreakdown = {};
    const actionBreakdown = {};
    const userBreakdown = {};

    auditLogs.forEach(log => {
      moduleBreakdown[log.module] = (moduleBreakdown[log.module] || 0) + 1;
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      userBreakdown[log.user.fullName] = (userBreakdown[log.user.fullName] || 0) + 1;
    });

    const detailedLogs = auditLogs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      user: log.user.fullName,
      role: log.user.role,
      module: log.module,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress
    }));

    res.json({
      summary: {
        totalLogs: auditLogs.length,
        uniqueUsers: Object.keys(userBreakdown).length,
        uniqueModules: Object.keys(moduleBreakdown).length
      },
      moduleBreakdown: Object.entries(moduleBreakdown).map(([module, count]) => ({
        module,
        count
      })),
      actionBreakdown: Object.entries(actionBreakdown).map(([action, count]) => ({
        action,
        count
      })),
      userBreakdown: Object.entries(userBreakdown).map(([user, count]) => ({
        user,
        count
      })),
      logs: detailedLogs
    });

  } catch (error) {
    console.error('Audit report error:', error);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
};