import type { Language, LangCode, SourceLang } from '../types'

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

export function getLangName(code: LangCode | SourceLang): string {
  if (code === 'auto') return 'Определить автоматически'
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

/** Initial speech locale when source is auto */
export function guessSpeechLangFromBrowser(): LangCode {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  const short = nav.slice(0, 2) as LangCode
  if (short in SPEECH_LOCALES) return short
  return 'ru'
}
