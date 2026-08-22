import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { paymentService } from '@/services/paymentService';
import { cashService } from '@/services/cashService'; 
import { toast } from 'sonner';
import { DollarSign, X, AlertCircle, AlertTriangle, Wallet } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Ingresa el monto').refine((val) => parseFloat(val) > 0, {
    message: 'El monto debe ser mayor a 0',
  }),
  cashId: z.string().min(1, 'Selecciona una caja'),
  paymentDate: z.string().min(1, 'Selecciona la fecha'),
  paymentMethod: z.string().min(1, 'Selecciona el método'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export default function PaymentModal({ open, onClose, loan, onSuccess }) {
  const [preview, setPreview] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [orderWarning, setOrderWarning] = useState(false);
  const [cashes , setCashes ] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: '',
      cashId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      reference: '',
      notes: ''
    }
  });

  const amount = watch('amount');
  const paymentDate = watch('paymentDate');

  useEffect(() => {
    if (open && loan) {
      reset({
        amount: '',
        cashId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        reference: '',
        notes: ''
      });
      setPreview(null);
      setOrderWarning(false);
      fetchCashes();
    }
  }, [open, loan, reset]);

   const fetchCashes = async () => {
    try {
      const response = await cashService.getCashes();
      setCashes(response.data);
    } catch (error) {
      console.error('Error fetching cashes:', error);
      toast.error('Error al cargar cajas');
    }
  };

  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && paymentDate && loan) {
      calculatePreview();
    } else {
      setPreview(null);
      setOrderWarning(false);
    }
  }, [amount, paymentDate, loan]);

  const calculatePreview = () => {
    setCalculating(true);
    setOrderWarning(false);
    
    setTimeout(() => {
      const paymentAmount = parseFloat(amount);
      
      // Ordenar cuotas pendientes por número
      const pendingInstallments = loan.installments
        .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
        .sort((a, b) => a.installmentNumber - b.installmentNumber);

      if (pendingInstallments.length === 0) {
        setPreview({
          installmentsToPay: [],
          totalLatePaymentFee: 0,
          remainingAmount: paymentAmount,
          insufficientAmount: false,
          allPaid: true
        });
        setCalculating(false);
        return;
      }

      // Verificar si hay cuotas anteriores sin pagar
      const firstPending = pendingInstallments[0];
      const hasUnpaidBefore = loan.installments.some(
        inst => inst.installmentNumber < firstPending.installmentNumber && 
                (inst.status === 'PENDING' || inst.status === 'OVERDUE')
      );

      if (hasUnpaidBefore) {
        setOrderWarning(true);
      }

      let remaining = paymentAmount;
      const installmentsToPay = [];
      let totalLatePaymentFee = 0;

      const today = new Date(paymentDate);

      for (const inst of pendingInstallments) {
        // IMPORTANTE: Detener si remaining es 0 o negativo
        if (remaining <= 0.005) break;

        const latePaymentFee = parseFloat(inst.lateFee || 0);
        const installmentBase = parseFloat(inst.total);

        // Calcular días de mora solo para display
        const dueDate = new Date(inst.dueDate);
        const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
      
        // Total a pagar = Cuota base + Mora ya calculada
        const totalDue = installmentBase + latePaymentFee;

        // TOLERANCIA MÁS ESTRICTA: Solo 0.5 centavos
        const tolerance = 0.005;
        
        if (remaining >= totalDue - tolerance) {
          installmentsToPay.push({
            ...inst,
            latePaymentFee, 
            daysLate,
            totalDue,
            installmentBase
          });
          totalLatePaymentFee += latePaymentFee;
          remaining -= totalDue;

          // Redondear para evitar errores flotantes
          remaining = Math.max(0, Math.round(remaining * 100) / 100);
        } else {
          // No alcanza para esta cuota - DETENER INMEDIATAMENTE
          break;
        }
      }

      setPreview({
        installmentsToPay,
        totalLatePaymentFee,
        remainingAmount: remaining,
        insufficientAmount: installmentsToPay.length === 0,
        allPaid: false
      });
      
      setCalculating(false);
    }, 300);
  };

  const onSubmit = async (data) => {
    if (preview && preview.allPaid) {
      toast.error('Esta cuenta ya está completamente pagada');
      return;
    }

    if (preview && preview.insufficientAmount) {
      toast.error('El monto es insuficiente para cubrir al menos una cuota');
      return;
    }

    if (orderWarning) {
      toast.error('Debe pagar las cuotas en orden. Pague primero las cuotas anteriores.');
      return;
    }

    try {
      await paymentService.create({
        loanId: loan.id,
        amount: parseFloat(data.amount),
        cashId: parseInt(data.cashId),
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null
      });
      toast.success('Pago registrado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al registrar pago';
      toast.error(message);
    }
  };

  if (!loan) return null;

  const pendingInstallments = loan.installments.filter(i => i.status !== 'PAID');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Cuenta #{loan.id} - {loan.customer.firstName} {loan.customer.lastName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Info de la cuenta */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Saldo Pendiente</p>
                <p className="text-xl font-bold text-gray-900">
                  ${(() => {
                    const realBalance = loan.installments
                    .filter(i => i.status !== 'PAID')
                    .reduce((sum, i) => {
                      const installmentBase = parseFloat(i.total);
                      const latePaymentFee = parseFloat(i.lateFee || 0);
                      return sum + installmentBase + latePaymentFee;
                    }, 0);
                    return realBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Incluye intereses y moras
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cuotas Pendientes</p>
                <p className="text-xl font-bold text-gray-900">
                  {pendingInstallments.length}
                </p>
                {pendingInstallments.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Próxima cuota: #{pendingInstallments[0].installmentNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advertencia de orden */}
          {orderWarning && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Pago fuera de orden</p>
                <p className="text-sm text-red-700 mt-1">
                  Debe pagar las cuotas en orden. Complete primero las cuotas anteriores antes de pagar las siguientes.
                </p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto a Pagar <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                {...register('amount')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Wallet className="w-4 h-4 inline mr-1" />
                Caja de Cobro <span className="text-red-500">*</span>
              </label>
              <select
                {...register('cashId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecciona una caja</option>
                {cashes.map((cash) => (
                  <option key={cash.id} value={cash.id}>
                    {cash.name} - Saldo: ${parseFloat(cash.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              {errors.cashId && (
                <p className="text-sm text-red-600 mt-1">{errors.cashId.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                El monto será agregado a esta caja
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                {...register('paymentDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.paymentDate && (
                <p className="text-sm text-red-600 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="DEPOSIT">Depósito</option>
                <option value="CHECK">Cheque</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia
              </label>
              <input
                type="text"
                {...register('reference')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="N° de transferencia, cheque, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className={`border-2 rounded-lg p-4 ${
              preview.allPaid ? 'bg-blue-50 border-blue-300' :
              preview.insufficientAmount ? 'bg-red-50 border-red-300' : 
              orderWarning ? 'bg-orange-50 border-orange-300' :
              'bg-green-50 border-green-300'
            }`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${
                preview.allPaid ? 'text-blue-800' :
                preview.insufficientAmount ? 'text-red-800' : 
                orderWarning ? 'text-orange-800' :
                'text-green-800'
              }`}>
                {preview.allPaid ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Cuenta Completada
                  </>
                ) : preview.insufficientAmount ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Monto Insuficiente
                  </>
                ) : orderWarning ? (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    Pago Fuera de Orden
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Se pagarán {preview.installmentsToPay.length} cuota(s)
                  </>
                )}
              </h3>

              {preview.allPaid ? (
                <p className="text-sm text-blue-700">
                  Esta cuenta ya está completamente pagada.
                </p>
              ) : preview.insufficientAmount ? (
                <p className="text-sm text-red-700">
                  El monto ingresado no es suficiente para cubrir ninguna cuota completa.
                  {pendingInstallments[0] && (
                    <> La primera cuota pendiente (#{ pendingInstallments[0].installmentNumber}) es de ${parseFloat(pendingInstallments[0].total).toFixed(2)}</>
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {preview.installmentsToPay.map((inst) => (
                    <div key={inst.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">
                            Cuota #{inst.installmentNumber}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            Vence: {new Date(inst.dueDate).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          ${inst.totalDue.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Cuota base:</span>
                          <span>${inst.installmentBase.toFixed(2)}</span>
                        </div>
                        
                        {inst.latePaymentFee > 0 && (
                          <div className="flex justify-between text-red-600 font-medium">
                            <span>Mora ({inst.daysLate} días):</span>
                            <span>+ ${inst.latePaymentFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Resumen */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-300 space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Subtotal cuotas:</span>
                      <span>${preview.installmentsToPay.reduce((sum, i) => sum + i.installmentBase, 0).toFixed(2)}</span>
                    </div>
                    
                    {preview.totalLatePaymentFee > 0 && (
                      <div className="flex justify-between text-sm font-medium text-red-700">
                        <span>Total mora:</span>
                        <span>+ ${preview.totalLatePaymentFee.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Total a pagar:</span>
                      <span>${preview.installmentsToPay.reduce((sum, i) => sum + i.totalDue, 0).toFixed(2)}</span>
                    </div>

                    {preview.remainingAmount > 0.01 && (
                      <div className="flex justify-between text-sm text-orange-600 pt-2 border-t border-gray-200">
                        <span>Sobrante (no aplicado):</span>
                        <span>${preview.remainingAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting || 
                calculating || 
                orderWarning ||
                (preview && (preview.insufficientAmount || preview.allPaid))
              }
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
