import cron from 'node-cron';
import prisma from '../config/database.js';

// Ejecutar todos los días a las 00:01 AM
export const updateOverdueInstallments = cron.schedule('1 0 * * *', async () => {
  try {
    console.log('Running overdue installments update...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener configuración de mora
    const [lateFeeRateSetting, graceDaysSetting, lateFeeOnSetting, maxLateFeePercentSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'rate_late_fee_rate' } }),
      prisma.settings.findUnique({ where: { key: 'rate_grace_days' } }),
      prisma.settings.findUnique({ where: { key: 'rate_late_fee_on' } }),
      prisma.settings.findUnique({ where: { key: 'rate_max_late_fee_percent' } })
    ]);
    
    const lateFeeRate = parseFloat(lateFeeRateSetting?.value || 2);
    const graceDays = parseInt(graceDaysSetting?.value || 0);
    const lateFeeOn = lateFeeOnSetting?.value || 'OVERDUE_INSTALLMENT';
    const maxLateFeePercent = parseFloat(maxLateFeePercentSetting?.value || 50);

    // Obtener todas las cuotas pendientes
    const pendingInstallments = await prisma.installment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: today }
      },
      include: {
        loan: {
          select: {
            amount: true,
            status: true
          }
        }
      }
    });

    console.log(` Found ${pendingInstallments.length} overdue installments`);

    let updated = 0;
    let updatedLoans = new Set();

    for (const inst of pendingInstallments) {
      const dueDate = new Date(inst.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Calcular días de mora
      const diffTime = Math.abs(today - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays - graceDays);
      
      if (daysOverdue > 0) {
        // Calcular mora
        const base = lateFeeOn === 'OVERDUE_CAPITAL' 
          ? parseFloat(inst.principal) 
          : parseFloat(inst.total);
        
        let lateFee = base * (lateFeeRate / 100) * daysOverdue;
        
        // Aplicar límite máximo de mora
        const maxLateFee = parseFloat(inst.loan.amount) * (maxLateFeePercent / 100);
        lateFee = Math.min(lateFee, maxLateFee);
        lateFee = parseFloat(lateFee.toFixed(2));

        // Actualizar cuota
        await prisma.installment.update({
          where: { id: inst.id },
          data: {
            status: 'OVERDUE',
            lateFee: lateFee
          }
        });

        updatedLoans.add(inst.loanId);
        updated++;
      }
    }

    // Actualizar estado de préstamos a DEFAULTED si tienen mora
    if (updatedLoans.size > 0) {
      await prisma.loan.updateMany({
        where: {
          id: { in: Array.from(updatedLoans) },
          status: 'ACTIVE'
        },
        data: {
          status: 'DEFAULTED'
        }
      });
    }

    console.log(` Updated ${updated} installments to OVERDUE`);
    console.log(` Updated ${updatedLoans.size} loans to DEFAULTED`);
    
  } catch (error) {
    console.error(' Error updating overdue installments:', error);
  }
}, {
  timezone: "America/Lima"
});

// Iniciar todos los cron jobs
export const startCronJobs = () => {
  updateOverdueInstallments.start();
  console.log(' Cron jobs started');
};

// Detener todos los cron jobs
export const stopCronJobs = () => {
  updateOverdueInstallments.stop();
  console.log(' Cron jobs stopped');
};