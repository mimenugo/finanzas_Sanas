// Calcular períodos por año según frecuencia
const getPeriodsPerYear = (frequency) => {
  switch (frequency) {
    case 'DAILY': return 365;
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    default: return 12;
  }
};

// Calcular siguiente fecha según frecuencia
const getNextDueDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + 15);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date;
};

// SISTEMA FRANCÉS (Cuota Fija - Interés sobre saldo pendiente)
export const calculateFrenchSystem = (amount, annualRate, term, frequency, startDate) => {
  const installments = [];
  const periodsPerYear = getPeriodsPerYear(frequency);
  const periodRate = (annualRate / 100) / periodsPerYear;

  // Fórmula Sistema Francés: C = P * [r * (1+r)^n] / [(1+r)^n - 1]
  const installmentAmount = amount * 
    (periodRate * Math.pow(1 + periodRate, term)) / 
    (Math.pow(1 + periodRate, term) - 1);

  let remainingBalance = amount;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= term; i++) {
    currentDate = getNextDueDate(currentDate, frequency);

    const interest = remainingBalance * periodRate;
    let principal = installmentAmount - interest;
    
    // Ajustar última cuota para cerrar exactamente en 0
    if (i === term) {
      principal = remainingBalance;
    }

    const total = principal + interest;
    remainingBalance -= principal;

    // Evitar balances negativos por redondeo
    if (remainingBalance < 0.01) remainingBalance = 0;

    installments.push({
      installmentNumber: i,
      dueDate: new Date(currentDate),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status: 'PENDING'
    });
  }

  return installments;
};

// INTERÉS SIMPLE (Capital e interés fijos por cuota)
export const calculateSimpleInterest = (amount, annualRate, term, frequency, startDate) => {
  const installments = [];
  const periodsPerYear = getPeriodsPerYear(frequency);
  
  // Interés simple: I = P * r * t
  const totalInterest = amount * (annualRate / 100) * (term / periodsPerYear);
  const totalAmount = amount + totalInterest;
  const installmentAmount = totalAmount / term;
  
  // En interés simple, el capital se divide equitativamente
  const principalPerInstallment = amount / term;
  const interestPerInstallment = totalInterest / term;

  let currentDate = new Date(startDate);

  for (let i = 1; i <= term; i++) {
    currentDate = getNextDueDate(currentDate, frequency);

    installments.push({
      installmentNumber: i,
      dueDate: new Date(currentDate),
      principal: parseFloat(principalPerInstallment.toFixed(2)),
      interest: parseFloat(interestPerInstallment.toFixed(2)),
      total: parseFloat(installmentAmount.toFixed(2)),
      status: 'PENDING'
    });
  }

  return installments;
};

// FUNCIÓN PRINCIPAL: Decide qué método usar según configuración
export const calculateInstallments = (amount, annualRate, term, frequency, startDate, method = 'compound') => {
  if (method === 'simple') {
    return calculateSimpleInterest(amount, annualRate, term, frequency, startDate);
  } else {
    return calculateFrenchSystem(amount, annualRate, term, frequency, startDate);
  }
};