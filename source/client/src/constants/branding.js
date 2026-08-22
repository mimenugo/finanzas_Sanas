export const BRAND_NAME = 'Finanzas Sanas';
export const PORTAL_NAME = 'Portal Finanzas Sanas y Bienestar Financiero';
export const PUBLIC_DESCRIPTION = 'Plataforma de administracion financiera para consulta de pagos, calendarios, comprobantes y seguimiento de cuentas personales.';

export const normalizeBrandName = (value) => {
  const text = String(value || '').trim();
  if (!text || /credi?t?manager/i.test(text)) return BRAND_NAME;
  return text;
};
