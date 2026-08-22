import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea un monto usando la configuración del sistema
 * @param {number} amount - Monto a formatear
 * @param {object} settings - Configuraciones del sistema (opcional)
 * @returns {string} Monto formateado
 */
export const formatCurrency = (amount, settings = null) => {
  const currency = settings?.system?.system_currency || 'USD';
  const locale = settings?.system?.system_locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback si hay error con la configuración
    return `$${parseFloat(amount).toFixed(2)}`;
  }
};

/**
 * Formatea una fecha usando la configuración del sistema
 * @param {Date|string} date - Fecha a formatear
 * @param {object} settings - Configuraciones del sistema (opcional)
 * @param {string} customFormat - Formato personalizado (opcional)
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, settings = null, customFormat = null) => {
  if (!date) return '-';
  
  const dateFormat = customFormat || settings?.system?.system_date_format || 'MM/dd/yyyy';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    // Mapear formatos de configuración a date-fns
    const formatMap = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD-MM-YYYY': 'dd-MM-yyyy'
    };
    
    const finalFormat = formatMap[dateFormat] || dateFormat;
    
    return format(parsedDate, finalFormat, { locale: es });
  } catch (error) {
    return new Date(date).toLocaleDateString();
  }
};

/**
 * Formatea una fecha y hora
 * @param {Date|string} date - Fecha a formatear
 * @param {object} settings - Configuraciones del sistema (opcional)
 * @returns {string} Fecha y hora formateada
 */
export const formatDateTime = (date, settings = null) => {
  if (!date) return '-';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return new Date(date).toLocaleString();
  }
};

/**
 * Formatea un número con separador de miles
 * @param {number} value - Valor a formatear
 * @param {object} settings - Configuraciones del sistema (opcional)
 * @returns {string} Número formateado
 */
export const formatNumber = (value, settings = null) => {
  const locale = settings?.system?.system_locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    return value.toString();
  }
};

/**
 * Formatea un porcentaje
 * @param {number} value - Valor a formatear (0-100)
 * @param {number} decimals - Número de decimales (default: 2)
 * @returns {string} Porcentaje formateado
 */
export const formatPercentage = (value, decimals = 2) => {
  return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Parsea un monto formateado a número
 * @param {string} formatted - Monto formateado
 * @returns {number} Número parseado
 */
export const parseCurrency = (formatted) => {
  if (typeof formatted === 'number') return formatted;
  

  const cleaned = formatted.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Formatea la frecuencia de préstamo
 * @param {string} frequency - DAILY, WEEKLY, BIWEEKLY, MONTHLY
 * @returns {string} Frecuencia traducida
 */
export const formatFrequency = (frequency) => {
  const map = {
    'DAILY': 'Diario',
    'WEEKLY': 'Semanal',
    'BIWEEKLY': 'Quincenal',
    'MONTHLY': 'Mensual'
  };
  return map[frequency] || frequency;
};

/**
 * Formatea el estado de préstamo
 * @param {string} status - ACTIVE, PAID, DEFAULTED
 * @returns {string} Estado traducido
 */
export const formatLoanStatus = (status) => {
  const map = {
    'ACTIVE': 'Activo',
    'PAID': 'Pagado',
    'DEFAULTED': 'En Mora'
  };
  return map[status] || status;
};

/**
 * Formatea el estado de cuota
 * @param {string} status - PENDING, PAID, OVERDUE
 * @returns {string} Estado traducido
 */
export const formatInstallmentStatus = (status) => {
  const map = {
    'PENDING': 'Pendiente',
    'PAID': 'Pagado',
    'OVERDUE': 'Vencido'
  };
  return map[status] || status;
};

/**

 * @param {string} status 
 * @returns {string} 
 */
export const getInstallmentStatusColor = (status) => {
  const map = {
    'PENDING': 'text-yellow-600 bg-yellow-100',
    'PAID': 'text-green-600 bg-green-100',
    'OVERDUE': 'text-red-600 bg-red-100'
  };
  return map[status] || 'text-gray-600 bg-gray-100';
};

/**
 * Redondea un valor a 2 decimales (evita errores de punto flotante)
 * @param {number} value - Valor a redondear
 * @returns {number} Valor redondeado
 */
export const roundCurrency = (value) => {
  return Math.round(parseFloat(value) * 100) / 100;
};