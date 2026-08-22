export class PaymentProviderInterface {
  constructor(config = {}) {
    this.config = config;
  }

  async createPaymentIntent() {
    throw new Error('createPaymentIntent must be implemented by provider adapter');
  }

  async createReference() {
    throw new Error('createReference must be implemented by provider adapter');
  }

  async handleWebhook() {
    throw new Error('handleWebhook must be implemented by provider adapter');
  }
}
