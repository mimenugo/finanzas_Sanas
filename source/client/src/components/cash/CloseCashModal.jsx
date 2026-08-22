import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { cashService } from '../../services/cashService';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export default function CloseCashModal({ open, onClose, onSuccess, cash }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    closureDate: new Date().toISOString().split('T')[0],
    physicalBalance: '',
    observations: '',
    denominations: {
      bill_200: 0,
      bill_100: 0,
      bill_50: 0,
      bill_20: 0,
      bill_10: 0,
      coin_5: 0,
      coin_2: 0,
      coin_1: 0,
      coin_050: 0,
      coin_020: 0,
      coin_010: 0
    }
  });

  const [theoreticalBalance, setTheoreticalBalance] = useState(0);
  const [difference, setDifference] = useState(0);

  // Calcular total de denominaciones
  const calculateDenominationsTotal = () => {
    const { denominations } = formData;
    return (
      denominations.bill_200 * 200 +
      denominations.bill_100 * 100 +
      denominations.bill_50 * 50 +
      denominations.bill_20 * 20 +
      denominations.bill_10 * 10 +
      denominations.coin_5 * 5 +
      denominations.coin_2 * 2 +
      denominations.coin_1 * 1 +
      denominations.coin_050 * 0.50 +
      denominations.coin_020 * 0.20 +
      denominations.coin_010 * 0.10
    );
  };

  // Actualizar físico cuando cambian denominaciones
  useEffect(() => {
    const total = calculateDenominationsTotal();
    setFormData(prev => ({ ...prev, physicalBalance: total.toFixed(2) }));
  }, [formData.denominations]);

  // Calcular diferencia
  useEffect(() => {
    const physical = parseFloat(formData.physicalBalance) || 0;
    const diff = physical - theoreticalBalance;
    setDifference(diff);
  }, [formData.physicalBalance, theoreticalBalance]);

  // Cargar balance teórico (saldo actual de la caja)
  useEffect(() => {
    if (cash) {
      setTheoreticalBalance(parseFloat(cash.balance));
    }
  }, [cash]);

  const handleDenominationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      denominations: {
        ...prev.denominations,
        [key]: parseInt(value) || 0
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await cashService.closeCash({
        cashId: cash.id,
        ...formData
      });
      toast.success('Cierre de caja realizado exitosamente');
      onSuccess();
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      toast.error(error.response?.data?.error || 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cierre de Caja: {cash?.name}</DialogTitle>
          <DialogDescription>
            Registra el arqueo de efectivo y cierra la caja del día
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha de cierre */}
          <div>
            <Label htmlFor="closureDate">Fecha de Cierre</Label>
            <Input
              id="closureDate"
              type="date"
              value={formData.closureDate}
              onChange={(e) => setFormData({ ...formData, closureDate: e.target.value })}
              required
            />
          </div>

          {/* Resumen */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Teórico</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(theoreticalBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Físico</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(formData.physicalBalance || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Diferencia</p>
                <p className={`text-xl font-bold ${
                  difference === 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(difference)}
                </p>
              </div>
            </div>
          </Card>

          {/* Arqueo de denominaciones */}
          <div>
            <Label className="text-base mb-3 block">Arqueo de Efectivo</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Billetes */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Billetes de S/ 200</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.bill_200}
                  onChange={(e) => handleDenominationChange('bill_200', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.bill_200 * 200)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Billetes de S/ 100</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.bill_100}
                  onChange={(e) => handleDenominationChange('bill_100', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.bill_100 * 100)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Billetes de S/ 50</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.bill_50}
                  onChange={(e) => handleDenominationChange('bill_50', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.bill_50 * 50)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Billetes de S/ 20</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.bill_20}
                  onChange={(e) => handleDenominationChange('bill_20', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.bill_20 * 20)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Billetes de S/ 10</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.bill_10}
                  onChange={(e) => handleDenominationChange('bill_10', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.bill_10 * 10)}
                </p>
              </div>

              {/* Monedas */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 5</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_5}
                  onChange={(e) => handleDenominationChange('coin_5', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_5 * 5)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 2</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_2}
                  onChange={(e) => handleDenominationChange('coin_2', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_2 * 2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 1</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_1}
                  onChange={(e) => handleDenominationChange('coin_1', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_1 * 1)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 0.50</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_050}
                  onChange={(e) => handleDenominationChange('coin_050', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_050 * 0.50)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 0.20</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_020}
                  onChange={(e) => handleDenominationChange('coin_020', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_020 * 0.20)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Monedas de S/ 0.10</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.denominations.coin_010}
                  onChange={(e) => handleDenominationChange('coin_010', e.target.value)}
                  className="text-right"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  = {formatCurrency(formData.denominations.coin_010 * 0.10)}
                </p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <Label htmlFor="observations">Observaciones {difference !== 0 && '(Obligatorio si hay diferencia)'}</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Detalles del cierre de caja"
              rows={3}
              required={difference !== 0}
            />
          </div>

          {/* Alerta si hay diferencia */}
          {difference !== 0 && (
            <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    Diferencia detectada
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {difference > 0 
                      ? `Hay un sobrante de ${formatCurrency(Math.abs(difference))}`
                      : `Hay un faltante de ${formatCurrency(Math.abs(difference))}`
                    }. Por favor, explica la diferencia en las observaciones.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}