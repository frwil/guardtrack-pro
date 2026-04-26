'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiConfig } from '../services/api/config';

interface AppBranding {
  companyName: string;
  companyLogo: string | null;
  refreshBranding: () => Promise<void>;
}

const AppSettingsContext = createContext<AppBranding>({
  companyName: 'GuardTrack Pro',
  companyLogo: null,
  refreshBranding: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('GuardTrack Pro');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    try {
      const apiUrl = apiConfig.getApiUrl();
      const response = await fetch(`${apiUrl}/settings/public`, {
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.company_name) setCompanyName(data.company_name);
      setCompanyLogo(data.company_logo || null);
    } catch {
      // Keep defaults on network error
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <AppSettingsContext.Provider value={{ companyName, companyLogo, refreshBranding: fetchBranding }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
