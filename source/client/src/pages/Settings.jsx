import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Percent, 
  Settings as SettingsIcon, 
  Database,
  FileSpreadsheet,
  Bell,
  Palette
} from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';
import CompanyTab from '@/components/settings/CompanyTab';
import RatesTab from '@/components/settings/RatesTab';
import SystemTab from '@/components/settings/SystemTab';
import BackupTab from '@/components/settings/BackupTab';
import GoogleSheetsTab from '@/components/settings/GoogleSheetsTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import AppearanceTab from '@/components/settings/AppearanceTab';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getAll();
      setSettings(data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category, values) => {
    try {
      await settingsService.update(values);
      toast.success('Configuración actualizada');
      loadSettings();
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-2">
          Personaliza el sistema según tus necesidades
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger 
            value="company" 
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger 
            value="rates" 
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <Percent className="w-4 h-4" />
            Tasas
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <Palette className="w-4 h-4" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger 
            value="backup" 
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <Database className="w-4 h-4" />
            Respaldos
          </TabsTrigger>
          <TabsTrigger
            value="google-sheets"
            className="data-[state=active]:bg-primary-500 data-[state=active]:text-white gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="min-h-[calc(100vh-20rem)]">
          <CompanyTab 
            settings={settings?.company || {}} 
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="rates" className="min-h-[calc(100vh-20rem)]">
          <RatesTab 
            settings={settings?.rates || {}} 
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="system" className="min-h-[calc(100vh-20rem)]">
          <SystemTab 
            settings={settings?.system || {}} 
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="appearance" className="min-h-[calc(100vh-20rem)]">
          <AppearanceTab
            settings={settings?.appearance || {}}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="notifications" className="min-h-[calc(100vh-20rem)]">
          <NotificationsTab
            settings={settings?.notifications || {}}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="backup" className="min-h-[calc(100vh-20rem)]">
          <BackupTab />
        </TabsContent>

        <TabsContent value="google-sheets" className="min-h-[calc(100vh-20rem)]">
          <GoogleSheetsTab settings={settings?.google || {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
