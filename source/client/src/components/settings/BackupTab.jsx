import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BackupTab() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await settingsService.listBackups();
      setBackups(data);
    } catch (error) {
      toast.error('Error al cargar respaldos');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await settingsService.generateBackup();
      toast.success('Backup generado exitosamente');
      loadBackups();
    } catch (error) {
      toast.error('Error al generar backup');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      // Usar fetch con token en header (el interceptor de axios maneja refresh automático)
      const response = await fetch(`http://localhost:5000/api/settings/backup/download/${fileName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al descargar backup');
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear un link temporal y descargarlo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Backup descargado correctamente');
      
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Error al descargar el backup');
    }
  };

  const handleDelete = async (fileName) => {
    if (!confirm('¿Estás seguro de eliminar este backup?')) return;
    
    try {
      await settingsService.deleteBackup(fileName);
      toast.success('Backup eliminado');
      loadBackups();
    } catch (error) {
      toast.error('Error al eliminar backup');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Generar Backup */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Database className="w-5 h-5" />
            Generar Respaldo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-blue-900 font-medium">
                Importante
              </p>
              <p className="text-sm text-blue-700">
                Los backups incluyen toda la base de datos: usuarios, clientes, cuentas,
                pagos y configuraciones. Guárdalos en un lugar seguro.
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary-500 hover:bg-primary-600 w-full sm:w-auto"
          >
            <Database className="w-4 h-4 mr-2" />
            {generating ? 'Generando Backup...' : 'Generar Backup Ahora'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900">
            <span className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Respaldos Disponibles
            </span>
            {backups.length > 0 && (
              <span className="text-sm font-normal text-gray-600">
                {backups.length} backup{backups.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay backups disponibles</p>
              <p className="text-sm text-gray-500 mt-1">
                Genera tu primer respaldo usando el botón de arriba
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.fileName}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 font-medium truncate">
                        {backup.fileName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>
                          {format(new Date(backup.createdAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(backup.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.fileName)}
                      className="hover:bg-primary-50 border-gray-300"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(backup.fileName)}
                      className="hover:bg-red-50 text-red-600 border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Adicional */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <CheckCircle className="w-5 h-5" />
            Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Genera backups regularmente, especialmente antes de actualizaciones importantes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Guarda los backups en un almacenamiento externo seguro (Google Drive, Dropbox, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Prueba restaurar los backups periódicamente para verificar su integridad</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Mantén al menos 3 backups recientes en todo momento</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
