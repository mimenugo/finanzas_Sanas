import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { userService } from '@/services/userService';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function DeleteModal({ open, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await userService.delete(user.id);
      toast.success('Usuario desactivado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al desactivar usuario';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Desactivar Usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-2">
                  ¿Estás seguro de desactivar este usuario?
                </p>
                <div className="text-sm text-red-800 space-y-1">
                  <p><strong>Usuario:</strong> {user.fullName}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Rol:</strong> {user.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> El usuario será desactivado pero no se eliminará de la base de datos. 
              Sus cuentas y registros históricos se mantendrán intactos. Podrás reactivarlo más tarde si es necesario.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Desactivando...' : 'Sí, Desactivar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
