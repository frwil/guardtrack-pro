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

  const restoreFromCache = useCallback(() => {
    const cachedName = localStorage.getItem('guardtrack_company_name');
    const cachedLogo = localStorage.getItem('guardtrack_logo_b64');
    const cachedCurrency = localStorage.getItem('guardtrack_currency');
    if (cachedName) setCompanyName(cachedName);
    if (cachedLogo) setCompanyLogo(cachedLogo);
    if (cachedCurrency) setCurrency(cachedCurrency);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Offline: use cache only
    if (!navigator.onLine) {
      restoreFromCache();
      return;
    }

    try {
      const apiUrl = apiConfig.getApiUrl();
      const res = await fetch(`${apiUrl}/settings/public`, {
        headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) { restoreFromCache(); return; }

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
        // Priorité au base64 mis en cache lors de l'upload (pas de CORS)
        const cachedB64 = localStorage.getItem('guardtrack_logo_b64');
        if (cachedB64) {
          setCompanyLogo(cachedB64);
        } else {
          // Fallback : URL complète du backend (img tag ne souffre pas des CORS)
          const baseUrl = apiConfig.getApiUrl().replace(/\/api\/?$/, '');
          const fullUrl = `${baseUrl}${data.company_logo}`;
          localStorage.setItem('guardtrack_logo_url', fullUrl);
          setCompanyLogo(fullUrl);
        }
      } else {
        // Pas de logo sur le serveur → nettoyer le cache
        localStorage.removeItem('guardtrack_logo_b64');
        localStorage.removeItem('guardtrack_logo_url');
        setCompanyLogo(null);
      }
    } catch {
      restoreFromCache();
    }
  }, [restoreFromCache]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const currencySymbol = CURRENCY_SYMBOL[currency] ?? currency;

  return (
    <AppSettingsContext.Provider value={{ companyName, companyLogo, currency, currencySymbol, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
