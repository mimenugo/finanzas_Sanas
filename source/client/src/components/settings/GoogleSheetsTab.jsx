import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';
import { Download, ExternalLink, FileSpreadsheet, PlugZap, Save, UploadCloud } from 'lucide-react';

const defaultRedirectUri = 'http://localhost:5000/api/settings/google-sheets/oauth/callback';
const expectedPaymentHeaders = [
  'folio_pago',
  'fecha_pago',
  'referencia_pago',
  'telefono_cliente',
  'numero_prestamo',
  'numero_cuota',
  'monto_pagado',
  'metodo_pago',
  'referencia_operacion',
  'banco_origen',
  'banco_destino',
  'estatus',
  'observaciones',
  'procesado',
];

const normalizeHeader = (value) => String(value || '').trim().toLowerCase();

export default function GoogleSheetsTab({ settings }) {
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: defaultRedirectUri,
    spreadsheetId: '',
    range: 'Pagos!A:N',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    setFormData({
      clientId: settings.google_sheets_client_id || '',
      clientSecret: settings.google_sheets_client_secret || '',
      redirectUri: settings.google_sheets_redirect_uri || defaultRedirectUri,
      spreadsheetId: settings.google_sheets_spreadsheet_id || '',
      range: settings.google_sheets_range || 'Pagos!A:N',
    });
  }, [settings]);

  const connected = Boolean(settings.google_sheets_refresh_token);
  const readHeaders = testResult?.headers || [];
  const normalizedReadHeaders = readHeaders.map(normalizeHeader);
  const missingHeaders = expectedPaymentHeaders.filter((header) => !normalizedReadHeaders.includes(header));
  const extraHeaders = readHeaders.filter((header) => !expectedPaymentHeaders.includes(normalizeHeader(header)));

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const saveConfig = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await settingsService.saveGoogleSheets(formData);
      toast.success('Configuracion de Google Sheets guardada');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar Google Sheets');
    } finally {
      setSaving(false);
    }
  };

  const connectGoogle = async () => {
    try {
      await settingsService.saveGoogleSheets(formData);
      const { authUrl } = await settingsService.getGoogleSheetsAuthUrl();
      window.open(authUrl, '_blank', 'noopener,noreferrer');
      toast.info('Autoriza Google Sheets en la ventana nueva');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo generar la autorizacion de Google');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await settingsService.testGoogleSheets();
      setTestResult(result);
      toast.success('Conexion exitosa con Google Sheets');
    } catch (error) {
      const message = error.response?.data?.message || 'No se pudo leer la hoja';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await settingsService.downloadPaymentsTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla_importacion_pagos_google_sheets.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('No se pudo descargar la plantilla');
    }
  };

  const importPayments = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await settingsService.importGoogleSheetPayments();
      setImportResult(result);
      toast.success(`Importacion finalizada: ${result.summary?.imported || 0} pagos aplicados`);
      await testConnection();
    } catch (error) {
      const message = error.response?.data?.message || 'No se pudieron importar pagos validos';
      setImportResult({
        message,
        summary: { imported: 0, skipped: 0, invalid: 0, total: 0 },
        results: error.response?.data?.results || [],
      });
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileSpreadsheet className="w-5 h-5" />
            Google Sheets para importacion de pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveConfig} className="space-y-5">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Usa OAuth si Google Cloud no permite crear llaves JSON de Service Account. Configura el OAuth Client ID como Web application y agrega la URL de callback que aparece abajo.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Google Client ID</Label>
                <input
                  value={formData.clientId}
                  onChange={(event) => handleChange('clientId', event.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                <Label>Google Client Secret</Label>
                <input
                  type="password"
                  value={formData.clientSecret}
                  onChange={(event) => handleChange('clientSecret', event.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Authorized redirect URI</Label>
                <input
                  value={formData.redirectUri}
                  onChange={(event) => handleChange('redirectUri', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Copia esta URL en Google Cloud &gt; OAuth Client &gt; Authorized redirect URIs.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Spreadsheet ID</Label>
                <input
                  value={formData.spreadsheetId}
                  onChange={(event) => handleChange('spreadsheetId', event.target.value)}
                  placeholder="ID entre /d/ y /edit en la URL de Google Sheets"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                <Label>Rango</Label>
                <input
                  value={formData.range}
                  onChange={(event) => handleChange('range', event.target.value)}
                  placeholder="Pagos!A:N"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm">
                <span className={`rounded-full border px-3 py-1 ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {connected ? 'Google conectado' : 'Google no conectado'}
                </span>
                {settings.google_sheets_connected_email && (
                  <span className="ml-2 text-gray-500">{settings.google_sheets_connected_email}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar plantilla
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" onClick={connectGoogle}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Conectar Google
                </Button>
                <Button type="button" variant="outline" onClick={testConnection} disabled={testing || !connected}>
                  <PlugZap className="w-4 h-4 mr-2" />
                  {testing ? 'Probando...' : 'Probar lectura'}
                </Button>
                <Button type="button" onClick={importPayments} disabled={importing || !connected}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {importing ? 'Importando...' : 'Importar pagos validos'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {testResult && (
        <Card className={testResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-4 text-sm">
            <p className="font-semibold">{testResult.message}</p>
            {testResult.success && (
              <div className="mt-3 space-y-4">
                <p>Total de filas leidas: {testResult.totalRows}</p>
                {testResult.availableSheets?.length > 0 && (
                  <p>Pestanas encontradas: {testResult.availableSheets.join(', ')}</p>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-white p-3">
                    <p className="font-medium text-emerald-700">Columnas coincidentes</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">
                      {expectedPaymentHeaders.length - missingHeaders.length}/{expectedPaymentHeaders.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white p-3">
                    <p className="font-medium text-amber-700">Faltantes</p>
                    <p className="mt-1 text-sm text-amber-800">{missingHeaders.length ? missingHeaders.join(', ') : 'Ninguna'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="font-medium text-slate-700">Extras detectadas</p>
                    <p className="mt-1 text-sm text-slate-600">{extraHeaders.length ? extraHeaders.join(', ') : 'Ninguna'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2">Columna esperada</th>
                        <th className="px-3 py-2">Columna leida</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expectedPaymentHeaders.map((expected, index) => {
                        const read = readHeaders[index] || '';
                        const matches = normalizeHeader(read) === expected;
                        const existsElsewhere = normalizedReadHeaders.includes(expected);
                        return (
                          <tr key={expected} className="border-t">
                            <td className="px-3 py-2 font-mono">{expected}</td>
                            <td className="px-3 py-2 font-mono">{read || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full border px-2 py-1 ${matches ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : existsElsewhere ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                {matches ? 'Correcta' : existsElsewhere ? 'En otra posicion' : 'Falta'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {testResult.preview?.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {readHeaders.map((header, index) => (
                            <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2 font-semibold">
                              {header || `Columna ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.preview.map((row, index) => (
                          <tr key={`${index}-${row.join('-')}`} className="border-t">
                            {readHeaders.map((header, cellIndex) => (
                              <td key={`${header}-${cellIndex}`} className="whitespace-nowrap px-3 py-2">{row[cellIndex] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {!testResult.success && testResult.availableSheets?.length > 0 && (
              <div className="mt-3">
                <p className="font-medium">Pestanas encontradas en el archivo:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {testResult.availableSheets.map((sheet) => (
                    <span key={sheet} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs">
                      {sheet}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs">
                  Usa una de estas pestanas en el rango. Ejemplo: {testResult.availableSheets[0]}!A:L
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <UploadCloud className="w-5 h-5" />
              Resultado de importacion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="font-semibold">{importResult.message}</p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-emerald-700">Importados</p>
                <p className="text-2xl font-bold text-emerald-800">{importResult.summary?.imported || 0}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-amber-700">Omitidos</p>
                <p className="text-2xl font-bold text-amber-800">{importResult.summary?.skipped || 0}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-red-700">Invalidos</p>
                <p className="text-2xl font-bold text-red-800">{importResult.summary?.invalid || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-700">Total</p>
                <p className="text-2xl font-bold text-slate-800">{importResult.summary?.total || 0}</p>
              </div>
            </div>

            {importResult.results?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.results.map((row) => (
                      <tr key={`${row.rowNumber}-${row.status}`} className="border-t">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full border px-2 py-1 ${
                            row.status === 'IMPORTED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : row.status === 'SKIPPED'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
