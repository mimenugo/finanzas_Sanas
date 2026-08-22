import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export const useSettings = () => {
  const { 
    settings, 
    loading, 
    error, 
    loadPublicSettings,
    getSetting,
    getRates,
    getCompany,
    getSystem,
    getAvailableFrequencies,
    validateAmount,
    validateTerm
  } = useSettingsStore();

  // Cargar settings al montar
  useEffect(() => {
    if (!settings && !loading) {
      loadPublicSettings();
    }
  }, [settings, loading, loadPublicSettings]);

  return {
    settings,
    loading,
    error,
    getSetting,
    rates: getRates(),
    company: getCompany(),
    system: getSystem(),
    availableFrequencies: getAvailableFrequencies(),
    validateAmount,
    validateTerm,
    reload: loadPublicSettings,
  };
};