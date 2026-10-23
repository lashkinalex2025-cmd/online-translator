import type { LangCode } from '../types'
import { SPEECH_LOCALES } from '../constants/languages'

export function speakText(text: string, lang: LangCode): void {
  if (!text.trim()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('Синтез речи не поддерживается в этом браузере')
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LOCALES[lang]
  utterance.rate = 1
  utterance.pitch = 1

  const voices = window.speechSynthesis.getVoices()
  const match = voices.find((v) => v.lang.startsWith(lang))
  if (match) utterance.voice = match

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
