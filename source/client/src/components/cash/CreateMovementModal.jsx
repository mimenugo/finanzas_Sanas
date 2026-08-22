import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cashService } from '../../services/cashService';
import { toast } from 'sonner';

export default function CreateMovementModal({ open, onClose, onSuccess, cashes }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cashId: '',
    type: 'INCOME',
    concept: '',
    amount: '',
    observations: '',
    reference: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await cashService.createMovement(formData);
      toast.success('Movimiento registrado exitosamente');
      onSuccess();
      setFormData({
        cashId: '',
        type: 'INCOME',
        concept: '',
        amount: '',
        observations: '',
        reference: ''
      });
    } catch (error) {
      console.error('Error al crear movimiento:', error);
      toast.error(error.response?.data?.error || 'Error al crear movimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento</DialogTitle>
          <DialogDescription>
            Registra un ingreso o egreso manual
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cashId">Caja</Label>
            <Select
              value={formData.cashId}
              onValueChange={(value) => setFormData({ ...formData, cashId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar caja" />
              </SelectTrigger>
              <SelectContent>
                {cashes.map((cash) => (
                  <SelectItem key={cash.id} value={cash.id.toString()}>
                    {cash.name} - {cash.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Ingreso</SelectItem>
                <SelectItem value="EXPENSE">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="concept">Concepto</Label>
            <Input
              id="concept"
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
              placeholder="Ej: Pago de cuota, Gasto operativo"
              required
            />
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
            <Label htmlFor="observations">Observaciones (Opcional)</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Detalles adicionales"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="reference">Referencia (Opcional)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Ej: Factura #, ID Cuenta"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
