import { useEffect, useState } from 'react';
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
import { XCircle, X } from 'lucide-react';

const rejectionSchema = z.object({
  quickReason: z.string().optional(),
  detailedReason: z.string().optional(),
}).refine((data) => {
  // Al menos uno debe tener contenido
  const hasQuickReason = data.quickReason && data.quickReason !== '';
  const hasDetailedReason = data.detailedReason && data.detailedReason.length >= 10;
  return hasQuickReason || hasDetailedReason;
}, {
  message: 'Selecciona un motivo o escribe al menos 10 caracteres',
  path: ['detailedReason']
});

export default function RejectionModal({ open, onClose, applicationId, onSuccess }) {
  const [selectedQuickReason, setSelectedQuickReason] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      quickReason: '',
      detailedReason: ''
    }
  });

  useEffect(() => {
    if (open) {
      reset({ quickReason: '', detailedReason: '' });
      setSelectedQuickReason('');
    }
  }, [open, reset]);

  const handleQuickReasonChange = (e) => {
    const value = e.target.value;
    setSelectedQuickReason(value);
    setValue('quickReason', value);
  };

  const onSubmit = async (data) => {
    try {
      // Combinar el motivo rápido y el detallado
      let finalReason = '';
      
      if (data.quickReason) {
        finalReason = data.quickReason;
      }
      
      if (data.detailedReason && data.detailedReason.trim()) {
        finalReason = finalReason 
          ? `${finalReason}. ${data.detailedReason}` 
          : data.detailedReason;
      }

      await approvalService.reject(applicationId, { rejectionReason: finalReason });
      toast.success('Solicitud rechazada');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al rechazar solicitud';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-red-600">
            <XCircle className="w-6 h-6" />
            Rechazar Solicitud
          </DialogTitle>
          <DialogDescription>
            Especifica el motivo del rechazo de esta solicitud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Esta acción marcará la solicitud como rechazada y el cliente será notificado.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del Rechazo <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedQuickReason}
              onChange={handleQuickReasonChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-3"
            >
              <option value="">Selecciona un motivo</option>
              <option value="Capacidad de pago insuficiente">Capacidad de pago insuficiente</option>
              <option value="Historial crediticio negativo">Historial crediticio negativo</option>
              <option value="Documentación incompleta">Documentación incompleta</option>
              <option value="Monto solicitado muy alto">Monto solicitado muy alto</option>
              <option value="No cumple con políticas internas">No cumple con políticas internas</option>
            </select>

            <p className="text-sm text-gray-600 mb-2">
              O describe detalladamente (opcional):
            </p>
            <textarea
              {...register('detailedReason')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Describe detalladamente el motivo del rechazo..."
            />
            {errors.detailedReason && (
              <p className="text-sm text-red-600 mt-1">{errors.detailedReason.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 10 caracteres si escribes manualmente
            </p>
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
              {isSubmitting ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}