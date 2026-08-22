import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cashService } from '../../services/cashService';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';

export default function TransferModal({ open, onClose, onSuccess, cashes }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromCashId: '',
    toCashId: '',
    amount: '',
    reason: ''
  });

  const fromCash = cashes.find(c => c.id === parseInt(formData.fromCashId));
  const availableToCashes = cashes.filter(c => c.id !== parseInt(formData.fromCashId));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.fromCashId === formData.toCashId) {
      toast.error('No se puede transferir a la misma caja');
      return;
    }
    
    try {
      setLoading(true);
      await cashService.transferBetweenCashes(formData);
      toast.success('Transferencia realizada exitosamente');
      onSuccess();
      setFormData({
        fromCashId: '',
        toCashId: '',
        amount: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error al transferir:', error);
      toast.error(error.response?.data?.error || 'Error al realizar transferencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Entre Cajas</DialogTitle>
          <DialogDescription>
            Mueve fondos de una caja a otra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fromCashId">Caja Origen</Label>
            <Select
              value={formData.fromCashId}
              onValueChange={(value) => setFormData({ ...formData, fromCashId: value, toCashId: '' })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar origen" />
              </SelectTrigger>
              <SelectContent>
                {cashes.map((cash) => (
                  <SelectItem key={cash.id} value={cash.id.toString()}>
                    {cash.name} - {formatCurrency(cash.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromCash && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Disponible: {formatCurrency(fromCash.balance)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="toCashId">Caja Destino</Label>
            <Select
              value={formData.toCashId}
              onValueChange={(value) => setFormData({ ...formData, toCashId: value })}
              required
              disabled={!formData.fromCashId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar destino" />
              </SelectTrigger>
              <SelectContent>
                {availableToCashes.map((cash) => (
                  <SelectItem key={cash.id} value={cash.id.toString()}>
                    {cash.name} - {cash.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Motivo (Opcional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Razón de la transferencia"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Transfiriendo...' : 'Transferir Fondos'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}