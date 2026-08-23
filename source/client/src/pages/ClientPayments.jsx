import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentCollectionsService } from '@/services/paymentCollectionsService';
import { toast } from 'sonner';
import { Building2, CalendarDays, CheckCircle2, Clock3, CreditCard, ReceiptText, Search, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import { PORTAL_NAME, PUBLIC_DESCRIPTION } from '@/constants/branding';

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const statusLabels = {
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencido',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'En proceso',
  REJECTED: 'Rechazado',
  CANCELED: 'Cancelado',
};

const statusClass = (status) => {
  if (status === 'PAID' || status === 'CONFIRMED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'OVERDUE' || status === 'REJECTED' || status === 'CANCELED') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'PROCESSING') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

export default function ClientPayments() {
  const [phone, setPhone] = useState('');
  const [loanNumber, setLoanNumber] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationStep, setVerificationStep] = useState('identify');
  const [verificationCode, setVerificationCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [stripeResult, setStripeResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const documentFromUrl = params.get('documentNumber');
    const phoneFromUrl = params.get('phone');
    const loanFromUrl = params.get('loanId');
    const stripeStatus = params.get('stripe');
    const transactionId = params.get('transactionId');

    if (phoneFromUrl && loanFromUrl) {
      setPhone(phoneFromUrl);
      setLoanNumber(loanFromUrl);
      const storedToken = sessionStorage.getItem(`clientPortalToken:${phoneFromUrl}:${loanFromUrl}`);
      if (storedToken) {
        setVerificationStep('verified');
        load({ phone: phoneFromUrl, loanId: loanFromUrl });
      } else {
        setVerificationStep('identify');
      }
    } else if (documentFromUrl) {
      load(documentFromUrl);
    }

    if (stripeStatus === 'success') {
      setStripeResult({ status: 'success', transactionId });
      toast.success('Pago enviado. Se reflejara cuando Stripe confirme el webhook.');
    }

    if (stripeStatus === 'cancel') {
      setStripeResult({ status: 'cancel', transactionId });
      toast.info('Pago cancelado por el cliente.');
    }
  }, []);

  const load = async (overrideLookup) => {
    try {
      setLoading(true);
      const lookup = typeof overrideLookup === 'object'
        ? overrideLookup
        : { phone, loanId: loanNumber };

      const result = overrideLookup && typeof overrideLookup === 'string'
        ? await paymentCollectionsService.clientPortal(overrideLookup)
        : await paymentCollectionsService.clientPortalByPhoneLoan(lookup);

      setData(result);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se encontro informacion');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async () => {
    try {
      setRequestingCode(true);
      setDebugCode('');
      const result = await paymentCollectionsService.requestClientPortalCode({
        phone,
        loanId: loanNumber,
      });
      setMaskedEmail(result.maskedEmail || '');
      setDebugCode(result.debugCode || '');
      setVerificationStep('code');
      toast.success(result.message || 'Codigo enviado al correo registrado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo enviar el codigo');
    } finally {
      setRequestingCode(false);
    }
  };

  const verifyCode = async () => {
    try {
      setVerifyingCode(true);
      await paymentCollectionsService.verifyClientPortalCode({
        phone,
        loanId: loanNumber,
        code: verificationCode,
      });
      setVerificationStep('verified');
      toast.success('Codigo validado correctamente');
      await load({ phone, loanId: loanNumber });
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo validar el codigo');
    } finally {
      setVerifyingCode(false);
    }
  };

  const resetVerification = () => {
    setData(null);
    setVerificationStep('identify');
    setVerificationCode('');
    setMaskedEmail('');
    setDebugCode('');
    if (phone && loanNumber) {
      sessionStorage.removeItem(`clientPortalToken:${phone}:${loanNumber}`);
    }
  };

  const hasStripe = data?.methods?.some((method) => method.active && method.providerCode === 'STRIPE');

  const payWithStripe = async (loan, installment) => {
    try {
      setCheckoutLoading(installment.id);
      const result = await paymentCollectionsService.createStripeCheckout({
        phone,
        loanId: loan.id,
        installmentId: installment.id,
      });

      if (!result.checkoutUrl) {
        throw new Error('Stripe no devolvio URL de pago');
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'No se pudo iniciar pago con Stripe');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {stripeResult?.status === 'success' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-lg font-semibold text-emerald-950">Pago recibido por Stripe</p>
                  <p className="text-sm text-emerald-800">
                    Tu pago fue enviado correctamente. Estamos esperando la confirmacion automatica de Stripe para reflejarlo en tu cuenta.
                  </p>
                  {stripeResult.transactionId && (
                    <p className="mt-1 text-xs text-emerald-700">Operacion interna: {stripeResult.transactionId}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Clock3 className="h-4 w-4" />
                En proceso de confirmacion
              </div>
            </CardContent>
          </Card>
        )}

        {stripeResult?.status === 'cancel' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 p-5">
              <XCircle className="mt-0.5 h-6 w-6 text-red-600" />
              <div>
                <p className="text-lg font-semibold text-red-950">Pago cancelado</p>
                <p className="text-sm text-red-800">No se realizo ningun cargo. Puedes volver a intentar el pago cuando lo necesites.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> {PORTAL_NAME}</CardTitle>
            <p className="text-sm text-gray-500">{PUBLIC_DESCRIPTION}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {['Identificacion', 'Codigo por correo', 'Consulta'].map((label, index) => {
                const activeIndex = verificationStep === 'identify' ? 0 : verificationStep === 'code' ? 1 : 2;
                return (
                  <div key={label} className={`rounded-lg border px-3 py-2 text-sm ${index <= activeIndex ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>
                    <span className="font-semibold">{index + 1}.</span> {label}
                  </div>
                );
              })}
            </div>

            {verificationStep === 'identify' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Telefono del cliente"
                  inputMode="tel"
                  className="rounded-lg border px-3 py-2"
                />
                <input
                  value={loanNumber}
                  onChange={(event) => setLoanNumber(event.target.value)}
                  placeholder="No. cuenta"
                  inputMode="numeric"
                  className="rounded-lg border px-3 py-2"
                />
                <Button onClick={requestCode} disabled={requestingCode || !phone || !loanNumber}>
                  <Search className="mr-2 h-4 w-4" />
                  {requestingCode ? 'Enviando...' : 'Enviar codigo'}
                </Button>
              </div>
            )}

            {verificationStep === 'code' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  Enviamos un codigo al correo registrado {maskedEmail && <strong>{maskedEmail}</strong>}. El codigo expira en pocos minutos.
                  {debugCode && (
                    <p className="mt-2 rounded bg-white px-3 py-2 font-mono text-blue-800">
                      Codigo local de prueba: {debugCode}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_auto_auto]">
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Codigo"
                    inputMode="numeric"
                    className="rounded-lg border px-3 py-2 text-center tracking-[0.35em]"
                  />
                  <Button onClick={verifyCode} disabled={verifyingCode || verificationCode.length !== 6}>
                    {verifyingCode ? 'Validando...' : 'Validar y consultar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={requestCode} disabled={requestingCode}>
                    Reenviar codigo
                  </Button>
                </div>
                <button type="button" className="text-sm text-gray-500 underline" onClick={resetVerification}>
                  Cambiar telefono o numero de cuenta
                </button>
              </div>
            )}

            {verificationStep === 'verified' && (
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:flex-row md:items-center md:justify-between">
                <span>Correo validado. Puedes consultar pagos y calendario de esta cuenta.</span>
                <Button type="button" variant="outline" onClick={resetVerification}>
                  Consultar otra cuenta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {data && (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-lg font-semibold">{data.customer.firstName} {data.customer.lastName}</p>
                <p className="text-sm text-gray-500">Telefono: {data.customer.phone}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Datos para recibir recursos</CardTitle>
              </CardHeader>
              <CardContent>
                {data.disbursementDestination ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-emerald-950">{data.disbursementDestination.bank}</p>
                      <p className="text-sm text-emerald-900">Titular: {data.disbursementDestination.accountHolder}</p>
                      <p className="font-mono text-sm text-emerald-900">CLABE {data.disbursementDestination.destinationMasked}</p>
                      {data.disbursement?.reference && <p className="mt-1 text-xs text-emerald-800">Referencia de dispersión: {data.disbursement.reference}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-800"><ShieldCheck className="h-5 w-5" /> Cuenta verificada</div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
                    Aun no existe una cuenta de recepcion asignada a esta cuenta. Contacta a la administracion para actualizarla.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.customer.loans.map((loan) => (
                <Card key={loan.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>Cuenta #{loan.id}</span>
                      <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(loan.status)}`}>
                        {statusLabels[loan.status] || loan.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Saldo pendiente: <strong>{formatCurrency(loan.balance)}</strong></p>
                    <p>Monto original: <strong>{formatCurrency(loan.amount)}</strong></p>
                    <p>Cuotas pendientes: {loan.installments.filter((item) => item.status !== 'PAID').length}</p>
                    <div className="pt-2 space-y-2">
                      {loan.installments
                        .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
                        .slice(0, 3)
                        .map((installment) => {
                          const total = Number(installment.total) + Number(installment.lateFee || 0);
                          return (
                            <div key={installment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                              <div>
                                <p className="font-medium">Cuota {installment.installmentNumber} de {loan.term}</p>
                                <p className="flex items-center gap-1 text-xs text-gray-500">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  Fecha limite: {formatDate(installment.dueDate)}
                                </p>
                                <p className="text-xs text-gray-500">{formatCurrency(total)} | {statusLabels[installment.status] || installment.status}</p>
                              </div>
                              {hasStripe && (
                                <Button size="sm" onClick={() => payWithStripe(loan, installment)} disabled={checkoutLoading === installment.id}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  {checkoutLoading === installment.id ? 'Creando...' : 'Pagar Stripe'}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    <div className="pt-3">
                      <p className="mb-2 font-semibold">Calendario de cuotas</p>
                      <div className="space-y-2">
                        {loan.installments.map((installment) => {
                          const total = Number(installment.total) + Number(installment.lateFee || 0);
                          return (
                            <div key={installment.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2">
                              <div>
                                <p className="font-medium">Cuota {installment.installmentNumber} de {loan.term}</p>
                                <p className="text-xs text-gray-500">Fecha limite: {formatDate(installment.dueDate)}</p>
                                {installment.paidAt && (
                                  <p className="text-xs text-emerald-700">Pagada el {formatDate(installment.paidAt)}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(total)}</p>
                                <span className={`inline-block rounded-full border px-2 py-1 text-xs ${statusClass(installment.status)}`}>
                                  {statusLabels[installment.status] || installment.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3">
                      <p className="mb-2 flex items-center gap-2 font-semibold">
                        <ReceiptText className="h-4 w-4" />
                        Pagos realizados
                      </p>
                      {loan.payments.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
                          Aun no hay pagos registrados para esta cuenta.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Fecha operacion</th>
                                <th className="px-3 py-2">Metodo</th>
                                <th className="px-3 py-2">Monto</th>
                                <th className="px-3 py-2">Estatus</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loan.payments.map((payment) => (
                                <tr key={payment.id} className="border-t">
                                  <td className="px-3 py-2">{formatDate(payment.paymentDate || payment.createdAt)}</td>
                                  <td className="px-3 py-2">{payment.paymentMethod}</td>
                                  <td className="px-3 py-2 font-semibold">{formatCurrency(payment.amount)}</td>
                                  <td className="px-3 py-2">
                                    <span className={`rounded-full border px-2 py-1 ${statusClass('CONFIRMED')}`}>Confirmado</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Metodos disponibles</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.methods.map((method) => (
                  <div key={method.id} className="rounded-lg border p-3">
                    <p className="font-medium">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
