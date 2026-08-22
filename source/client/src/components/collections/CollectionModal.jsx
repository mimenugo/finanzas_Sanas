import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collectionService } from '@/services/collectionService';
import { toast } from 'sonner';
import { Phone, MessageSquare, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';

export default function CollectionModal({ open, onClose, loan, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactType: 'CALL',
    result: '',
    promiseDate: '',
    promiseAmount: '',
    nextFollowUp: '',
    observations: ''
  });

  const contactTypes = [
    { value: 'CALL', label: 'Llamada', icon: Phone },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
    { value: 'SMS', label: 'SMS', icon: MessageSquare },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'VISIT', label: 'Visita Domicilio', icon: MapPin }
  ];

  const results = [
    'Promesa de pago',
    'No contesta',
    'Número erróneo',
    'Telefono apagado',
    'No puede pagar',
    'Pagará mañana',
    'Pagará en fecha específica',
    'Cliente molesto',
    'Solicita refinanciamiento',
    'Otro'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.result) {
      toast.error('Selecciona un resultado');
      return;
    }

    try {
      setLoading(true);
      await collectionService.createLog({
        loanId: loan.id,
        ...formData
      });

      toast.success('Gestión registrada exitosamente');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error('Error al registrar gestión');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      contactType: 'CALL',
      result: '',
      promiseDate: '',
      promiseAmount: '',
      nextFollowUp: '',
      observations: ''
    });
    onClose();
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Gestión de Cobranza</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Cliente:</span>
              <p className="font-semibold">{loan.customer.firstName} {loan.customer.lastName}</p>
            </div>
            <div>
              <span className="text-gray-600">Cuenta:</span>
              <p className="font-semibold">#{loan.id}</p>
            </div>
            <div>
              <span className="text-gray-600">Días de mora:</span>
              <p className="font-semibold text-red-600">{loan.daysOverdue} días</p>
            </div>
            <div>
              <span className="text-gray-600">Monto vencido:</span>
              <p className="font-semibold text-red-600">
                ${parseFloat(loan.overdueAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de contacto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Contacto
            </label>
            <div className="grid grid-cols-5 gap-2">
              {contactTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, contactType: type.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.contactType === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resultado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultado *
            </label>
            <select
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Seleccionar resultado...</option>
              {results.map(result => (
                <option key={result} value={result}>{result}</option>
              ))}
            </select>
          </div>

          {/* Si es promesa de pago */}
          {(formData.result === 'Promesa de pago' || formData.result === 'Pagará en fecha específica') && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Compromiso
                </label>
                <input
                  type="date"
                  value={formData.promiseDate}
                  onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Monto Comprometido
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.promiseAmount}
                  onChange={(e) => setFormData({ ...formData, promiseAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Próximo seguimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Próximo Seguimiento
            </label>
            <input
              type="datetime-local"
              value={formData.nextFollowUp}
              onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              rows={3}
              placeholder="Detalles adicionales de la gestión..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Gestión'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
