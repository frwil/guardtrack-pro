'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiConfig } from '../services/api/config';

export const CURRENCIES: Array<{ code: string; name: string; symbol: string }> = [
  { code: 'XOF', name: 'Franc CFA (BCEAO)',     symbol: 'F CFA' },
  { code: 'XAF', name: 'Franc CFA (BEAC)',       symbol: 'FCFA'  },
  { code: 'EUR', name: 'Euro',                   symbol: '€'     },
  { code: 'USD', name: 'Dollar américain',       symbol: '$'     },
  { code: 'GBP', name: 'Livre sterling',         symbol: '£'     },
  { code: 'MAD', name: 'Dirham marocain',        symbol: 'DH'    },
  { code: 'DZD', name: 'Dinar algérien',         symbol: 'DA'    },
  { code: 'TND', name: 'Dinar tunisien',         symbol: 'DT'    },
  { code: 'NGN', name: 'Naira nigérian',         symbol: '₦'     },
  { code: 'GHS', name: 'Cedi ghanéen',           symbol: 'GH₵'   },
  { code: 'KES', name: 'Shilling kenyan',        symbol: 'KSh'   },
  { code: 'ZAR', name: 'Rand sud-africain',      symbol: 'R'     },
  { code: 'CHF', name: 'Franc suisse',           symbol: 'CHF'   },
  { code: 'CAD', name: 'Dollar canadien',        symbol: 'CA$'   },
];

const CURRENCY_SYMBOL: Record<string, string> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c.symbol])
);

interface AppSettingsContextType {
  companyName: string;
  companyLogo: string | null;
  currency: string;
  currencySymbol: string;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  companyName: 'GuardTrack Pro',
  companyLogo: null,
  currency: 'XOF',
  currencySymbol: 'F CFA',
  refreshSettings: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('GuardTrack Pro');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [currency, setCurrency] = useState('XOF');

  const cacheLogoAsBase64 = useCallback(async (relativePath: string): Promise<string | null> => {
    try {
      const baseUrl = apiConfig.getApiUrl().replace(/\/api\/?$/, '');
      const fullUrl = `${baseUrl}${relativePath}`;
      const res = await fetch(fullUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    // Offline: restore from cache
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const cachedName = localStorage.getItem('guardtrack_company_name');
      const cachedLogo = localStorage.getItem('guardtrack_logo_b64');
      const cachedCurrency = localStorage.getItem('guardtrack_currency');
      if (cachedName) setCompanyName(cachedName);
      if (cachedLogo) setCompanyLogo(cachedLogo);
      if (cachedCurrency) setCurrency(cachedCurrency);
      return;
    }

    try {
      const apiUrl = apiConfig.getApiUrl();
      const res = await fetch(`${apiUrl}/settings/public`, {
        headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) {
        // Fall back to cached values on error
        const cachedName = localStorage.getItem('guardtrack_company_name');
        const cachedLogo = localStorage.getItem('guardtrack_logo_b64');
        const cachedCurrency = localStorage.getItem('guardtrack_currency');
        if (cachedName) setCompanyName(cachedName);
        if (cachedLogo) setCompanyLogo(cachedLogo);
        if (cachedCurrency) setCurrency(cachedCurrency);
        return;
      }
      const data = await res.json();

      if (data.company_name) {
        setCompanyName(data.company_name);
        localStorage.setItem('guardtrack_company_name', data.company_name);
      }
      if (data.company_currency) {
        setCurrency(data.company_currency);
        localStorage.setItem('guardtrack_currency', data.company_currency);
      }

      if (data.company_logo) {
        const b64 = await cacheLogoAsBase64(data.company_logo);
        if (b64) {
          localStorage.setItem('guardtrack_logo_b64', b64);
          setCompanyLogo(b64);
        } else {
          // Fallback to cached
          const cached = localStorage.getItem('guardtrack_logo_b64');
          setCompanyLogo(cached || null);
        }
      } else {
        setCompanyLogo(null);
      }
    } catch {
      // Network error — use cache
      const cachedName = localStorage.getItem('guardtrack_company_name');
      const cachedLogo = localStorage.getItem('guardtrack_logo_b64');
      const cachedCurrency = localStorage.getItem('guardtrack_currency');
      if (cachedName) setCompanyName(cachedName);
      if (cachedLogo) setCompanyLogo(cachedLogo);
      if (cachedCurrency) setCurrency(cachedCurrency);
    }
  }, [cacheLogoAsBase64]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const currencySymbol = CURRENCY_SYMBOL[currency] ?? currency;

  return (
    <AppSettingsContext.Provider value={{ companyName, companyLogo, currency, currencySymbol, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
