'use client';

import { useTranslation, SUPPORTED_LOCALES, Locale } from '../contexts/I18nContext';

const FLAG: Record<Locale, string> = { fr: '🇫🇷', en: '🇬🇧' };
const LABEL: Record<Locale, string> = { fr: 'FR', en: 'EN' };

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LanguageSwitcher({ variant = 'compact', className = '' }: Props) {
  const { locale, setLocale, t } = useTranslation();

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {SUPPORTED_LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            title={t(`language.${l}`)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              locale === l
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <span>{FLAG[l]}</span>
            <span>{LABEL[l]}</span>
          </button>
        ))}
      </div>
    );
  }

  // compact: simple toggle entre les deux langues
  const next = SUPPORTED_LOCALES.find((l) => l !== locale) ?? 'en';
  return (
    <button
      onClick={() => setLocale(next)}
      title={t('language.select')}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors ${className}`}
    >
      <span>{FLAG[locale]}</span>
      <span>{LABEL[locale]}</span>
    </button>
  );
}
