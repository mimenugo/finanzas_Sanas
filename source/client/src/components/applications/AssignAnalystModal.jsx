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
import { applicationService } from '@/services/applicationService';
import api from '@/services/api';
import { toast } from 'sonner';
import { UserCog, X } from 'lucide-react';

const assignSchema = z.object({
  analystId: z.string().min(1, 'Selecciona un analista'),
});

export default function AssignAnalystModal({ open, onClose, application, onSuccess }) {
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      analystId: ''
    }
  });

  useEffect(() => {
    if (open) {
      fetchAnalysts();
      reset({ analystId: application?.analystId?.toString() || '' });
    }
  }, [open, application, reset]);

  const fetchAnalysts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/users?role=ANALISTA');
      setAnalysts(data);
    } catch (error) {
      console.error('Error fetching analysts:', error);
      toast.error('Error al cargar analistas');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await applicationService.assignAnalyst(application.id, parseInt(data.analystId));
      toast.success('Analista asignado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al asignar analista';
      toast.error(message);
    }
  };

  if (!application) return null;

  return (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-2xl flex items-center gap-2">
          <UserCog className="w-6 h-6 text-primary" />
          {application.analystId ? 'Reasignar Analista' : 'Asignar Analista'}
        </DialogTitle>
        <DialogDescription>
          Solicitud #{application.id} - {application.customer.firstName} {application.customer.lastName}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monto Solicitado</p>
              <p className="font-semibold text-gray-900">
                ${parseFloat(application.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {application.status === 'PENDING' && 'Pendiente'}
                {application.status === 'APPROVED' && 'Aprobada'}
                {application.status === 'REJECTED' && 'Rechazada'}
              </span>
            </div>
          </div>
        </div>

        {application.analystId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Analista actual:</strong> Ya hay un analista asignado a esta solicitud. Puedes cambiarlo si es necesario.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Analista <span className="text-red-500">*</span>
          </label>
          <select
            {...register('analystId')}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">
              {loading ? 'Cargando analistas...' : 'Selecciona un analista'}
            </option>
            {analysts.map((analyst) => (
              <option key={analyst.id} value={analyst.id}>
                {analyst.fullName}
              </option>
            ))}
          </select>
          {errors.analystId && (
            <p className="text-sm text-red-600 mt-1">{errors.analystId.message}</p>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> El analista recibirá una notificación de la asignación (funcionalidad futura).
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
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <UserCog className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? 'Asignando...' : (application.analystId ? 'Reasignar' : 'Asignar')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);
}