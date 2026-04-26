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

  const fetchSettings = useCallback(async () => {
    try {
      const apiUrl = apiConfig.getApiUrl();
      const res = await fetch(`${apiUrl}/settings/public`, {
        headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.company_name) setCompanyName(data.company_name);
      if (data.company_currency) setCurrency(data.company_currency);
      setCompanyLogo(data.company_logo || null);
    } catch {
      // silencieux — valeurs par défaut conservées
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const currencySymbol = CURRENCY_SYMBOL[currency] ?? currency;

  return (
    <AppSettingsContext.Provider value={{ companyName, companyLogo, currency, currencySymbol, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
