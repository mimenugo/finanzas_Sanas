import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Percent, DollarSign, Calendar } from 'lucide-react';

export default function RatesTab({ settings, onSave }) {
  const [formData, setFormData] = useState({
    rate_interest_default: settings.rate_interest_default || '2.5',
    rate_calculation_method: settings.rate_calculation_method || 'compound',
    rate_frequencies: settings.rate_frequencies || ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    rate_late_fee_rate: settings.rate_late_fee_rate || '2.0',
    rate_grace_days: settings.rate_grace_days || '0',
    rate_late_fee_on: settings.rate_late_fee_on || 'OVERDUE_INSTALLMENT',
    rate_late_fee_max_percent: settings.rate_late_fee_max_percent || '50',
    loan_amount_min: settings.loan_amount_min || '100',
    loan_amount_max: settings.loan_amount_max || '50000',
    loan_term_min: settings.loan_term_min || '1',
    loan_term_max: settings.loan_term_max || '52',
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFrequencyToggle = (frequency) => {
    const current = Array.isArray(formData.rate_frequencies) 
      ? formData.rate_frequencies 
      : ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
    
    const updated = current.includes(frequency)
      ? current.filter(f => f !== frequency)
      : [...current, frequency];
    
    handleChange('rate_frequencies', updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave('rates', formData);
    } finally {
      setSaving(false);
    }
  };

  const frequencies = Array.isArray(formData.rate_frequencies) 
    ? formData.rate_frequencies 
    : ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 min-h-screen pb-20">
      {/* Interés */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Percent className="w-5 h-5" />
            Tasas de Interés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_interest_default" className="text-gray-900">
                Tasa Anual Default (%)
              </Label>
              <Input
                id="rate_interest_default"
                type="number"
                step="0.01"
                value={formData.rate_interest_default}
                onChange={(e) => handleChange('rate_interest_default', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="2.5"
              />
              <p className="text-xs text-gray-500">Tasa de interés anual por defecto</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_calculation_method" className="text-gray-900">
                Método de Cálculo
              </Label>
              <Select
                value={formData.rate_calculation_method}
                onValueChange={(value) => handleChange('rate_calculation_method', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="compound">Compuesto (Francés)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Método usado para calcular intereses</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-gray-900">Frecuencias de Pago Disponibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'DAILY', label: 'Diario' },
                { value: 'WEEKLY', label: 'Semanal' },
                { value: 'BIWEEKLY', label: 'Quincenal' },
                { value: 'MONTHLY', label: 'Mensual' },
              ].map((freq) => (
                <div key={freq.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={freq.value}
                    checked={frequencies.includes(freq.value)}
                    onCheckedChange={() => handleFrequencyToggle(freq.value)}
                    className="border-gray-300"
                  />
                  <Label
                    htmlFor={freq.value}
                    className="text-gray-900 cursor-pointer"
                  >
                    {freq.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Frecuencias disponibles al crear cuentas</p>
          </div>
        </CardContent>
      </Card>

      {/* Mora */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calendar className="w-5 h-5" />
            Configuración de Mora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_late_fee_rate" className="text-gray-900">
                Tasa Diaria de Mora (%)
              </Label>
              <Input
                id="rate_late_fee_rate"
                type="number"
                step="0.01"
                value={formData.rate_late_fee_rate}
                onChange={(e) => handleChange('rate_late_fee_rate', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="2.0"
              />
              <p className="text-xs text-gray-500">Porcentaje diario aplicado a cuotas vencidas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_grace_days" className="text-gray-900">
                Días de Gracia
              </Label>
              <Input
                id="rate_grace_days"
                type="number"
                value={formData.rate_grace_days}
                onChange={(e) => handleChange('rate_grace_days', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Días antes de aplicar mora después del vencimiento</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_late_fee_on" className="text-gray-900">
                Aplicar Mora Sobre
              </Label>
              <Select
                value={formData.rate_late_fee_on}
                onValueChange={(value) => handleChange('rate_late_fee_on', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="OVERDUE_CAPITAL">Capital Vencido</SelectItem>
                  <SelectItem value="OVERDUE_INSTALLMENT">Cuota Vencida</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Base sobre la cual se calcula la mora</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_late_fee_max_percent" className="text-gray-900">
                Mora Máxima (% del Capital)
              </Label>
              <Input
                id="rate_late_fee_max_percent"
                type="number"
                value={formData.rate_late_fee_max_percent}
                onChange={(e) => handleChange('rate_late_fee_max_percent', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="50"
              />
              <p className="text-xs text-gray-500">Límite máximo de mora acumulable</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Límites de cuenta */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <DollarSign className="w-5 h-5" />
            Límites de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loan_amount_min" className="text-gray-900">
                Monto Mínimo
              </Label>
              <Input
                id="loan_amount_min"
                type="number"
                value={formData.loan_amount_min}
                onChange={(e) => handleChange('loan_amount_min', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="100"
              />
              <p className="text-xs text-gray-500">Monto mínimo permitido para cuentas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan_amount_max" className="text-gray-900">
                Monto Máximo
              </Label>
              <Input
                id="loan_amount_max"
                type="number"
                value={formData.loan_amount_max}
                onChange={(e) => handleChange('loan_amount_max', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="50000"
              />
              <p className="text-xs text-gray-500">Monto máximo permitido para cuentas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan_term_min" className="text-gray-900">
                Plazo Mínimo (períodos)
              </Label>
              <Input
                id="loan_term_min"
                type="number"
                value={formData.loan_term_min}
                onChange={(e) => handleChange('loan_term_min', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="1"
              />
              <p className="text-xs text-gray-500">Cantidad mínima de cuotas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan_term_max" className="text-gray-900">
                Plazo Máximo (períodos)
              </Label>
              <Input
                id="loan_term_max"
                type="number"
                value={formData.loan_term_max}
                onChange={(e) => handleChange('loan_term_max', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="52"
              />
              <p className="text-xs text-gray-500">Cantidad máxima de cuotas (semanas típicamente)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={saving}
          className="bg-primary-500 hover:bg-primary-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
