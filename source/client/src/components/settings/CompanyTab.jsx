import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Save, Building2, Globe, Facebook, Instagram, Linkedin } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';
import { BRAND_NAME, PORTAL_NAME, normalizeBrandName } from '@/constants/branding';
import { buildServerUrl } from '@/config/apiConfig';

export default function CompanyTab({ settings, onSave }) {
  const [formData, setFormData] = useState({
    company_name: normalizeBrandName(settings.company_name || BRAND_NAME),
    company_legal_name: normalizeBrandName(settings.company_legal_name || PORTAL_NAME),
    company_tax_id: settings.company_tax_id || '',
    company_address: settings.company_address || '',
    company_phone: settings.company_phone || '',
    company_phone_secondary: settings.company_phone_secondary || '',
    company_email: settings.company_email || '',
    company_website: settings.company_website || '',
    company_logo: settings.company_logo || '',
    company_social_facebook: settings.company_social_facebook || '',
    company_social_instagram: settings.company_social_instagram || '',
    company_social_linkedin: settings.company_social_linkedin || '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('El logo no debe superar 500KB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG o PNG');
      return;
    }

    try {
      setUploading(true);
      const result = await settingsService.uploadLogo(file);
      setFormData(prev => ({ ...prev, company_logo: result.logoUrl }));
      toast.success('Logo actualizado');
    } catch (error) {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave('company', formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Building2 className="w-5 h-5" />
            Información de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label className="text-gray-900">Logo de la Empresa</Label>
            <div className="flex items-center gap-4">
              {formData.company_logo ? (
                <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={buildServerUrl(formData.company_logo)}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Logo'}
                </Button>
                <p className="text-sm text-gray-600">
                  JPG o PNG, máximo 500KB
                </p>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-gray-900">
                Nombre Comercial *
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                required
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_legal_name" className="text-gray-900">
                Razón Social *
              </Label>
              <Input
                id="company_legal_name"
                value={formData.company_legal_name}
                onChange={(e) => handleChange('company_legal_name', e.target.value)}
                required
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_tax_id" className="text-gray-900">
                RUC/RFC/NIT
              </Label>
              <Input
                id="company_tax_id"
                value={formData.company_tax_id}
                onChange={(e) => handleChange('company_tax_id', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_email" className="text-gray-900">
                Email de Contacto
              </Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => handleChange('company_email', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone" className="text-gray-900">
                Teléfono Principal
              </Label>
              <Input
                id="company_phone"
                value={formData.company_phone}
                onChange={(e) => handleChange('company_phone', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone_secondary" className="text-gray-900">
                Teléfono Secundario
              </Label>
              <Input
                id="company_phone_secondary"
                value={formData.company_phone_secondary}
                onChange={(e) => handleChange('company_phone_secondary', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="company_address" className="text-gray-900">
              Dirección Completa
            </Label>
            <Input
              id="company_address"
              value={formData.company_address}
              onChange={(e) => handleChange('company_address', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Web y Redes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_website" className="text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Sitio Web
              </Label>
              <Input
                id="company_website"
                type="url"
                placeholder="https://ejemplo.com"
                value={formData.company_website}
                onChange={(e) => handleChange('company_website', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_social_facebook" className="text-gray-900 flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Facebook
              </Label>
              <Input
                id="company_social_facebook"
                placeholder="https://facebook.com/..."
                value={formData.company_social_facebook}
                onChange={(e) => handleChange('company_social_facebook', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_social_instagram" className="text-gray-900 flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </Label>
              <Input
                id="company_social_instagram"
                placeholder="https://instagram.com/..."
                value={formData.company_social_instagram}
                onChange={(e) => handleChange('company_social_instagram', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_social_linkedin" className="text-gray-900 flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Label>
              <Input
                id="company_social_linkedin"
                placeholder="https://linkedin.com/company/..."
                value={formData.company_social_linkedin}
                onChange={(e) => handleChange('company_social_linkedin', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
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
