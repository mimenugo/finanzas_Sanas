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
import { approvalService } from '@/services/approvalService';
import { toast } from 'sonner';
import { CheckCircle, X } from 'lucide-react';

const approvalSchema = z.object({
  approvedAmount: z.string().min(1, 'Ingresa el monto'),
  interestRate: z.string().min(1, 'Ingresa la tasa de interés'),
  term: z.string().min(1, 'Ingresa el plazo'),
  frequency: z.string().min(1, 'Selecciona la frecuencia'),
  observations: z.string().optional(),
});

export default function ApprovalModal({ open, onClose, application, onSuccess }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      approvedAmount: '',
      interestRate: '20',
      term: '',
      frequency: 'MONTHLY',
      observations: ''
    }
  });

  useEffect(() => {
    if (application && open) {
      reset({
        approvedAmount: application.requestedAmount.toString(),
        interestRate: '20',
        term: application.term.toString(),
        frequency: application.frequency,
        observations: ''
      });
    }
  }, [application, open, reset]);

  const onSubmit = async (data) => {
    try {
      await approvalService.approve(application.id, {
        approvedAmount: parseFloat(data.approvedAmount),
        interestRate: parseFloat(data.interestRate),
        term: parseInt(data.term),
        frequency: data.frequency,
        observations: data.observations
      });
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al aprobar solicitud';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Aprobar Solicitud
          </DialogTitle>
          <DialogDescription>
            Define los terminos finales del acuerdo para el cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Info del Cliente */}
          {application && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-semibold text-gray-900">
                {application.customer.firstName} {application.customer.lastName}
              </p>
              <p className="text-sm text-gray-600 mt-2">Monto Solicitado</p>
              <p className="text-xl font-bold text-gray-900">
                ${parseFloat(application.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Términos de Aprobación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Aprobado <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('approvedAmount')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="1000.00"
              />
              {errors.approvedAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.approvedAmount.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Puede ser diferente al solicitado
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa de Interés Anual (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('interestRate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="20.00"
              />
              {errors.interestRate && (
                <p className="text-sm text-red-600 mt-1">{errors.interestRate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plazo (cuotas) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('term')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="12"
              />
              {errors.term && (
                <p className="text-sm text-red-600 mt-1">{errors.term.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frecuencia <span className="text-red-500">*</span>
              </label>
              <select
                {...register('frequency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              {...register('observations')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Comentarios adicionales sobre la aprobación..."
            />
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
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Aprobando...' : 'Aprobar Solicitud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
