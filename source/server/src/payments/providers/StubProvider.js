import { PaymentProviderInterface } from './PaymentProviderInterface.js';

export class StubProvider extends PaymentProviderInterface {
  async createPaymentIntent({ amount, reference }) {
    return {
      status: 'PENDING',
      providerTransactionId: `stub-${Date.now()}`,
      reference,
      amount,
      raw: {
        message: 'Proveedor preparado. Configure credenciales reales para operar cargos.',
      },
    };
  }

  async createReference({ reference, amount, expiresAt }) {
    return {
      status: 'PENDING',
      reference,
      barcode: reference,
      amount,
      expiresAt,
      raw: {
        message: 'Referencia generada localmente.',
      },
    };
  }

  async handleWebhook(payload) {
    return {
      status: payload?.status || 'PENDING',
      providerTransactionId: payload?.id || null,
      raw: payload,
    };
  }
}
