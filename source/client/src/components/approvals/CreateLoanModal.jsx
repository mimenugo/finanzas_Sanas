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
import { loanService } from '@/services/loanService';
import { cashService } from '@/services/cashService'; // ← AGREGAR
import api from '@/services/api';
import { toast } from 'sonner';
import { DollarSign, X, Wallet } from 'lucide-react'; // ← AGREGAR Wallet

const loanSchema = z.object({
  collectorId: z.string().min(1, 'Selecciona un cobrador'),
  cashId: z.string().min(1, 'Selecciona una caja'), // ← AGREGAR
  disbursementDate: z.string().min(1, 'Selecciona la fecha'),
  disbursementMethod: z.string().min(1, 'Selecciona el método'),
});

export default function CreateLoanModal({ open, onClose, application, onSuccess }) {
  const [collectors, setCollectors] = useState([]);
  const [cashes, setCashes] = useState([]); // ← AGREGAR
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch, // ← AGREGAR
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      collectorId: '',
      cashId: '', // ← AGREGAR
      disbursementDate: new Date().toISOString().split('T')[0],
      disbursementMethod: 'TRANSFER'
    }
  });

  const selectedCashId = watch('cashId'); // ← AGREGAR

  useEffect(() => {
    if (open) {
      fetchCollectors();
      fetchCashes(); // ← AGREGAR
      reset({
        collectorId: '',
        cashId: '', // ← AGREGAR
        disbursementDate: new Date().toISOString().split('T')[0],
        disbursementMethod: 'TRANSFER'
      });
    }
  }, [open, reset]);

  const fetchCollectors = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/users?role=COBRADOR');
      const admins = await api.get('/auth/users?role=ADMIN');
      const allCollectors = [...data, ...admins.data];
      setCollectors(allCollectors);
    } catch (error) {
      console.error('Error fetching collectors:', error);
      toast.error('Error al cargar cobradores');
    } finally {
      setLoading(false);
    }
  };

  // ← AGREGAR ESTA FUNCIÓN
  const fetchCashes = async () => {
    try {
      const response = await cashService.getCashes();
      setCashes(response.data);
    } catch (error) {
      console.error('Error fetching cashes:', error);
      toast.error('Error al cargar cajas');
    }
  };

  const onSubmit = async (data) => {
    try {
      await loanService.create({
        applicationId: application.id,
        collectorId: parseInt(data.collectorId),
        cashId: parseInt(data.cashId), // ← AGREGAR
        disbursementDate: data.disbursementDate,
        disbursementMethod: data.disbursementMethod
      });
      toast.success('Cuenta creada exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al crear cuenta';
      toast.error(message);
    }
  };

  // ← AGREGAR ESTA FUNCIÓN
  const selectedCash = cashes.find(c => c.id === parseInt(selectedCashId));
  const loanAmount = parseFloat(application?.approval?.approvedAmount || 0);
  const hasSufficientBalance = selectedCash ? parseFloat(selectedCash.balance) >= loanAmount : false;

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Crear Cuenta
          </DialogTitle>
          <DialogDescription>
            Activa el acuerdo aprobado para el cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Info de la Aprobación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="font-semibold text-gray-900">
                  {application.customer.firstName} {application.customer.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto Aprobado</p>
                <p className="text-xl font-bold text-gray-900">
                  ${loanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasa de Interés</p>
                <p className="font-semibold text-gray-900">{application.approval?.interestRate}% anual</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plazo</p>
                <p className="font-semibold text-gray-900">
                  {application.approval?.term} cuotas
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cobrador Asignado <span className="text-red-500">*</span>
              </label>
              <select
                {...register('collectorId')}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loading ? 'Cargando cobradores...' : 'Selecciona un cobrador'}
                </option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.fullName} ({collector.role})
                  </option>
                ))}
              </select>
              {errors.collectorId && (
                <p className="text-sm text-red-600 mt-1">{errors.collectorId.message}</p>
              )}
            </div>

            {/* ← AGREGAR ESTE SELECT DE CAJA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Wallet className="w-4 h-4 inline mr-1" />
                Caja de entrega <span className="text-red-500">*</span>
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
              
              {/* Advertencia de saldo insuficiente */}
              {selectedCash && !hasSufficientBalance && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Saldo insuficiente:</strong> La caja seleccionada tiene ${parseFloat(selectedCash.balance).toFixed(2)} pero la cuenta requiere ${loanAmount.toFixed(2)}
                  </p>
                </div>
              )}
              
              {selectedCash && hasSufficientBalance && (
                <p className="text-xs text-green-600 mt-1">
                  Saldo disponible despues de la entrega: ${(parseFloat(selectedCash.balance) - loanAmount).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de activacion <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('disbursementDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.disbursementDate && (
                <p className="text-sm text-red-600 mt-1">{errors.disbursementDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metodo de entrega <span className="text-red-500">*</span>
              </label>
              <select
                {...register('disbursementMethod')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CHECK">Cheque</option>
              </select>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Al crear la cuenta se generara automaticamente el calendario de cuotas y se descontara el monto de la caja seleccionada.
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
              disabled={isSubmitting || loading || (selectedCash && !hasSufficientBalance)}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Creando...' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
