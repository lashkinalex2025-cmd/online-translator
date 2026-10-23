import type { Language, LangCode } from '../types'

export const LANGUAGES: Language[] = [
  { code: 'ru', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'Английский', nativeName: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Немецкий', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Французский', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Испанский', nativeName: 'Español', flag: '🇪🇸' },
]

export const LANG_MAP: Record<LangCode, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
) as Record<LangCode, Language>

export function getLangName(code: LangCode): string {
  return LANG_MAP[code]?.name ?? code
}

/** BCP-47 locale for Web Speech API */
export const SPEECH_LOCALES: Record<LangCode, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
}
