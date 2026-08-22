import { useEffect } from 'react';
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
import { toast } from 'sonner';
import { XCircle, X, AlertTriangle } from 'lucide-react';

const voidSchema = z.object({
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
});

export default function VoidPaymentModal({ open, onClose, payment, onSuccess }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(voidSchema),
    defaultValues: {
      reason: ''
    }
  });

  useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    try {
      await paymentService.voidPayment(payment.id, data.reason);
      toast.success('Pago anulado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al anular pago';
      toast.error(message);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-red-600">
            <XCircle className="w-6 h-6" />
            Anular Pago
          </DialogTitle>
          <DialogDescription>
            Pago #{payment.id} - ${parseFloat(payment.amount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-1">¡Acción irreversible!</p>
                <p className="text-sm text-red-800">
                  Al anular este pago se revertiran las cuotas pagadas y se restaurara el saldo de la cuenta. 
                  Esta acción quedará registrada en la auditoría.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cliente:</p>
                <p className="font-semibold text-gray-900">
                  {payment.loan?.customer?.firstName} {payment.loan?.customer?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Cuenta:</p>
                <p className="font-semibold text-gray-900">#{payment.loanId}</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha de Pago:</p>
                <p className="font-semibold text-gray-900">
                  {new Date(payment.paymentDate).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Método:</p>
                <p className="font-semibold text-gray-900">{payment.paymentMethod}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de Anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('reason')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Explica detalladamente por qué se anula este pago..."
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres</p>
          </div>

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
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Anulando...' : 'Confirmar Anulación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
