import { StubProvider } from './StubProvider.js';

const providers = {
  STRIPE: StubProvider,
  OPENPAY: StubProvider,
  CONEKTA: StubProvider,
  MERCADO_PAGO: StubProvider,
  PAYPAL: StubProvider,
  SPEI: StubProvider,
  OXXO: StubProvider,
  BANK_REFERENCE: StubProvider,
};

export const getPaymentProvider = (code, config) => {
  const Provider = providers[code] || StubProvider;
  return new Provider(config);
};

export const registeredProviderCodes = Object.keys(providers);
