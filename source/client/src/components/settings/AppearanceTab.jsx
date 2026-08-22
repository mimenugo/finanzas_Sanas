import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Save, Sparkles } from 'lucide-react';
import { DEFAULT_VISUAL_THEME, visualThemes } from '@/constants/visualThemes';

export default function AppearanceTab({ settings, onSave }) {
  const [selectedTheme, setSelectedTheme] = useState(settings.app_theme || localStorage.getItem('app_theme') || DEFAULT_VISUAL_THEME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.visualTheme = selectedTheme;
    localStorage.setItem('app_theme', selectedTheme);
  }, [selectedTheme]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave('appearance', { app_theme: selectedTheme });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Palette className="w-5 h-5" />
            Apariencia y Visualizaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Selecciona una visualización premium. El cambio mantiene la estructura del sistema y ajusta colores, superficies, navegación, tarjetas y profundidad visual.
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visualThemes.map((theme) => {
              const selected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`appearance-option rounded-xl border p-4 text-left transition ${
                    selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200 hover:border-primary-200'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{theme.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{theme.tagline}</p>
                    </div>
                    {selected && (
                      <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                        Activo
                      </span>
                    )}
                  </div>

                  <div className="theme-preview overflow-hidden rounded-lg border border-white/60 shadow-sm" style={{ background: theme.preview[0] }}>
                    <div className="flex h-40">
                      <div className="w-16 p-3" style={{ background: theme.preview[3] }}>
                        <div className="mb-4 h-7 w-7 rounded-lg" style={{ background: theme.preview[2] }} />
                        <div className="space-y-2">
                          <div className="h-2 rounded-full bg-white/70" />
                          <div className="h-2 rounded-full bg-white/30" />
                          <div className="h-2 rounded-full bg-white/30" />
                        </div>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="h-3 w-28 rounded-full" style={{ background: theme.preview[3] }} />
                          <div className="h-7 w-20 rounded-full" style={{ background: theme.preview[2] }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((item) => (
                            <div key={item} className="h-16 rounded-lg p-2" style={{ background: theme.preview[1] }}>
                              <div className="mb-3 h-2 w-10 rounded-full opacity-50" style={{ background: theme.preview[3] }} />
                              <div className="h-3 w-14 rounded-full" style={{ background: theme.preview[2] }} />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 h-12 rounded-lg" style={{ background: theme.preview[1] }}>
                          <div className="h-full w-2/3 rounded-lg opacity-80" style={{ background: `linear-gradient(90deg, ${theme.preview[2]}, transparent)` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="appearance-live-preview rounded-xl border p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-primary-700">
                  <Sparkles className="h-4 w-4" />
                  Vista aplicada al sistema
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">Finanzas Sanas</h3>
              </div>
              <div className="rounded-full border px-3 py-1 text-sm">Cartera saludable</div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Saldo administrado</p>
                <p className="mt-2 text-2xl font-bold">$186,540.00</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Pagos confirmados</p>
                <p className="mt-2 text-2xl font-bold">128</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Tiempo promedio</p>
                <p className="mt-2 text-2xl font-bold">16 días</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar apariencia'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
