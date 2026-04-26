'use client';

import { useTranslation, SUPPORTED_LOCALES, Locale } from '../contexts/I18nContext';

const FLAG: Record<Locale, string> = { fr: '🇫🇷', en: '🇬🇧' };

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
            className={`text-xl px-1.5 py-0.5 rounded transition-all ${
              locale === l
                ? 'ring-2 ring-indigo-500 ring-offset-1 opacity-100'
                : 'opacity-50 hover:opacity-80'
            }`}
          >
            {FLAG[l]}
          </button>
        ))}
      </div>
    );
  }

  // compact: toggle vers la prochaine langue
  const next = SUPPORTED_LOCALES.find((l) => l !== locale) ?? 'en';
  return (
    <button
      onClick={() => setLocale(next)}
      title={t('language.select')}
      className={`text-xl px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors ${className}`}
    >
      {FLAG[locale]}
    </button>
  );
}
