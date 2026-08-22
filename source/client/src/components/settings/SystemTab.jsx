import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Globe, DollarSign, Calendar, Hash } from 'lucide-react';

export default function SystemTab({ settings, onSave }) {
  const [formData, setFormData] = useState({
    system_timezone: settings.system_timezone || 'America/Lima',
    system_currency: settings.system_currency || 'USD',
    system_date_format: settings.system_date_format || 'DD/MM/YYYY',
    system_number_format: settings.system_number_format || '1,000.00',
  });

  const [saving, setSaving] = useState(false);

  // Mapeo de monedas con símbolo
  const currencies = {
    USD: { symbol: '$', name: 'Dólar' },
    PEN: { symbol: 'S/', name: 'Sol Peruano' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'Libra Esterlina' },
    MXN: { symbol: '$', name: 'Peso Mexicano' },
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave('system', formData);
    } finally {
      setSaving(false);
    }
  };

  const currentCurrency = currencies[formData.system_currency] || currencies.USD;

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Globe className="w-5 h-5" />
            Configuración del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zona Horaria */}
            <div className="space-y-2">
              <Label className="text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Zona Horaria
              </Label>
              <Select
                value={formData.system_timezone}
                onValueChange={(value) => handleChange('system_timezone', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                  <SelectItem value="America/Tijuana">Tijuana (GMT-8/GMT-7)</SelectItem>
                  <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                  <SelectItem value="America/Bogota">Bogotá (GMT-5)</SelectItem>
                  <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                  <SelectItem value="America/Santiago">Santiago (GMT-4)</SelectItem>
                  <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                  <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <Label className="text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Moneda
              </Label>
              <Select
                value={formData.system_currency}
                onValueChange={(value) => handleChange('system_currency', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="USD">
                    {currencies.USD.symbol} USD - {currencies.USD.name}
                  </SelectItem>
                  <SelectItem value="PEN">
                    {currencies.PEN.symbol} PEN - {currencies.PEN.name}
                  </SelectItem>
                  <SelectItem value="EUR">
                    {currencies.EUR.symbol} EUR - {currencies.EUR.name}
                  </SelectItem>
                  <SelectItem value="GBP">
                    {currencies.GBP.symbol} GBP - {currencies.GBP.name}
                  </SelectItem>
                  <SelectItem value="MXN">
                    {currencies.MXN.symbol} MXN - {currencies.MXN.name}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Símbolo actual: <span className="font-semibold">{currentCurrency.symbol}</span>
              </p>
            </div>

            {/* Formato Fecha */}
            <div className="space-y-2">
              <Label className="text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Formato de Fecha
              </Label>
              <Select
                value={formData.system_date_format}
                onValueChange={(value) => handleChange('system_date_format', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (23/12/2024)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/23/2024)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-23)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Formato Número */}
            <div className="space-y-2">
              <Label className="text-gray-900 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Formato de Números
              </Label>
              <Select
                value={formData.system_number_format}
                onValueChange={(value) => handleChange('system_number_format', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="1,000.00">1,000.00 (coma)</SelectItem>
                  <SelectItem value="1.000,00">1.000,00 (punto)</SelectItem>
                  <SelectItem value="1 000,00">1 000,00 (espacio)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Vista previa: <span className="font-semibold">{formData.system_number_format}</span>
              </p>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
