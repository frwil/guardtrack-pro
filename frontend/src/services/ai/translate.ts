import { apiClient } from '../api/client';
import type { Locale } from '../../contexts/I18nContext';

export type SupportedLanguage = Locale | 'es' | 'de' | 'it' | 'pt' | 'ar';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
};

// Marqueur de préfixe pour les messages traduits stockés en base
const TR_PREFIX = '__TR__';

export interface TranslatedContent {
  original: string;
  translated: string;
  fromLang: SupportedLanguage;
  toLang: SupportedLanguage;
}

export function encodeTranslatedMessage(content: TranslatedContent): string {
  return TR_PREFIX + JSON.stringify({
    o: content.original,
    t: content.translated,
    fl: content.fromLang,
    tl: content.toLang,
  });
}

export function decodeTranslatedMessage(raw: string): TranslatedContent | null {
  if (!raw.startsWith(TR_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(TR_PREFIX.length));
    if (!parsed.o || !parsed.t || !parsed.fl || !parsed.tl) return null;
    return { original: parsed.o, translated: parsed.t, fromLang: parsed.fl, toLang: parsed.tl };
  } catch {
    return null;
  }
}

export async function translateText(
  text: string,
  fromLang: SupportedLanguage | 'auto',
  toLang: SupportedLanguage,
): Promise<string> {
  const res = await apiClient.post<{ translated: string }>('/ai/translate', { text, fromLang, toLang });
  if (!res.data?.translated) throw new Error(res.error ?? 'Translation failed');
  return res.data.translated;
}
