import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { userService } from '@/services/userService';
import { toast } from 'sonner';
import { User, Mail, Phone, Shield, Lock } from 'lucide-react';

export default function UserModal({ open, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'COBRADOR',
    phone: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        password: '',
        role: user.role,
        phone: user.phone || '',
        status: user.status
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'COBRADOR',
        phone: '',
        status: 'ACTIVE'
      });
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.role) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (!user && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);

      if (user) {
        const updateData = {
          fullName: formData.fullName,
          role: formData.role,
          phone: formData.phone,
          status: formData.status
        };
        await userService.update(user.id, updateData);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await userService.create(formData);
        toast.success('Usuario creado exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al guardar usuario';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Juan Pérez"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={!!user}
              required
            />
            {user && (
              <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
            )}
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Contraseña *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Shield className="w-4 h-4 inline mr-1" />
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="ADMIN">Administrador</option>
              <option value="ANALISTA">Analista</option>
              <option value="COBRADOR">Cobrador</option>
              <option value="CONSULTA">Consulta</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.role === 'ADMIN' && 'Acceso total al sistema'}
              {formData.role === 'ANALISTA' && 'Puede aprobar solicitudes y ver reportes'}
              {formData.role === 'COBRADOR' && 'Gestiona cobros y su cartera'}
              {formData.role === 'CONSULTA' && 'Solo puede consultar información'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+51 999 999 999"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
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
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}