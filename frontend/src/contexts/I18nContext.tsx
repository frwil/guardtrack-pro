'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import fr from '../i18n/locales/fr.json';
import en from '../i18n/locales/en.json';

export type Locale = 'fr' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en'];

const LOCALES: Record<Locale, typeof fr> = { fr, en };

const LOCALE_STORAGE_KEY = 'guardtrack_locale';

// Résout une clé pointée ("chat.title") dans un objet imbriqué
function resolve(obj: Record<string, any>, key: string): string | undefined {
  const parts = key.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

// Remplace {{param}} par les valeurs fournies
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
    str,
  );
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fr',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  // Démarrer avec 'fr' pour éviter les erreurs d'hydratation SSR
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = LOCALES[locale] as Record<string, any>;
    const value = resolve(dict, key) ?? resolve(LOCALES['fr'] as Record<string, any>, key) ?? key;
    return interpolate(value, params);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
