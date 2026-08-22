import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, MailCheck, Save, Send } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { BRAND_NAME } from '@/constants/branding';
import { toast } from 'sonner';

export default function NotificationsTab({ settings, onSave }) {
  const [formData, setFormData] = useState({
    smtp_host: settings.smtp_host || '',
    smtp_port: settings.smtp_port || '587',
    smtp_user: settings.smtp_user || '',
    smtp_password: '',
    smtp_from_name: settings.smtp_from_name || BRAND_NAME,
    smtp_from_email: settings.smtp_from_email || '',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const payload = () => {
    const values = { ...formData };
    if (!values.smtp_password) delete values.smtp_password;
    return values;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave('notifications', payload());
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await settingsService.testSmtp({
        host: formData.smtp_host,
        port: formData.smtp_port,
        user: formData.smtp_user,
        password: formData.smtp_password,
      });

      if (result.success) {
        setTestResult(result);
        toast.success(result.message || 'Conexion SMTP exitosa');
      } else {
        setTestResult(result);
        toast.error(result.message || 'No se pudo conectar al SMTP');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo probar SMTP');
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Bell className="w-5 h-5" />
            Notificaciones por Correo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Configura el correo saliente para enviar codigos de acceso a Mis Pagos. Gmail normalmente requiere contrasena de aplicacion. Outlook/Hotmail puede bloquear usuario y contraseña si tiene autenticacion basica deshabilitada.
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                handleChange('smtp_host', 'smtp.gmail.com');
                handleChange('smtp_port', '587');
              }}
            >
              <span className="font-semibold">Gmail</span>
              <span className="block text-xs text-gray-500">smtp.gmail.com / 587 / App Password</span>
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                handleChange('smtp_host', 'smtp.office365.com');
                handleChange('smtp_port', '587');
              }}
            >
              <span className="font-semibold">Microsoft 365</span>
              <span className="block text-xs text-gray-500">smtp.office365.com / 587 / SMTP AUTH activo</span>
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                handleChange('smtp_host', 'smtp-relay.brevo.com');
                handleChange('smtp_port', '587');
              }}
            >
              <span className="font-semibold">Brevo/SendGrid</span>
              <span className="block text-xs text-gray-500">Recomendado para produccion con API/SMTP key</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Servidor SMTP *</Label>
              <Input
                id="smtp_host"
                value={formData.smtp_host}
                onChange={(event) => handleChange('smtp_host', event.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_port">Puerto *</Label>
              <Input
                id="smtp_port"
                value={formData.smtp_port}
                onChange={(event) => handleChange('smtp_port', event.target.value)}
                placeholder="587"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_user">Usuario SMTP *</Label>
              <Input
                id="smtp_user"
                value={formData.smtp_user}
                onChange={(event) => handleChange('smtp_user', event.target.value)}
                placeholder="correo@dominio.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">Contraseña SMTP</Label>
              <Input
                id="smtp_password"
                type="password"
                value={formData.smtp_password}
                onChange={(event) => handleChange('smtp_password', event.target.value)}
                placeholder={settings.smtp_user ? 'Dejar vacio para conservar la actual' : 'Contraseña o app password'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_from_name">Nombre del remitente</Label>
              <Input
                id="smtp_from_name"
                value={formData.smtp_from_name}
                onChange={(event) => handleChange('smtp_from_name', event.target.value)}
                placeholder={BRAND_NAME}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_from_email">Correo remitente</Label>
              <Input
                id="smtp_from_email"
                type="email"
                value={formData.smtp_from_email}
                onChange={(event) => handleChange('smtp_from_email', event.target.value)}
                placeholder="correo@dominio.com"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Para probar la conexion es necesario escribir la contraseña SMTP en esta pantalla. Por seguridad, el sistema no muestra la contraseña guardada.
          </div>

          {testResult && (
            <div className={`rounded-lg border p-4 text-sm ${testResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
              <p className="font-semibold">{testResult.message}</p>
              {testResult.recommendation && (
                <p className="mt-2">{testResult.recommendation}</p>
              )}
              {!testResult.success && testResult.rawMessage && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium">Ver detalle tecnico</summary>
                  <p className="mt-2 break-words rounded bg-white/70 p-2 font-mono text-xs">{testResult.rawMessage}</p>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="outline" onClick={testConnection} disabled={testing || !formData.smtp_host || !formData.smtp_user || !formData.smtp_password}>
              <MailCheck className="w-4 h-4 mr-2" />
              {testing ? 'Probando...' : 'Probar conexion'}
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.open('/mis-pagos', '_blank')}>
              <Send className="w-4 h-4 mr-2" />
              Probar Mis Pagos
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
