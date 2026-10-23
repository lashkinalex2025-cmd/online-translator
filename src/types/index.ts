export type LangCode = 'ru' | 'en' | 'de' | 'fr' | 'es'

/** Source language can be fixed or auto-detected from text/speech */
export type SourceLang = LangCode | 'auto'

export interface Language {
  code: LangCode
  name: string
  nativeName: string
  flag: string
}

export interface TranslationRecord {
  id: string
  sourceText: string
  translatedText: string
  sourceLang: LangCode
  targetLang: LangCode
  createdAt: number
  favorite?: boolean
}

export type AppTab = 'translate' | 'voice' | 'history' | 'favorites'

export type VoiceStatus = 'idle' | 'listening' | 'translating' | 'stopped' | 'error'

export interface VoiceState {
  status: VoiceStatus
  interimText: string
  finalText: string
  translatedText: string
  error: string | null
}
