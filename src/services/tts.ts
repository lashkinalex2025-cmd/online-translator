import type { LangCode } from '../types'
import { SPEECH_LOCALES } from '../constants/languages'

let voicesReady = false

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([])
  }

  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0 || voicesReady) {
    voicesReady = true
    return Promise.resolve(existing)
  }

  return new Promise((resolve) => {
    const done = () => {
      voicesReady = true
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    // Fallback if voiceschanged never fires (some mobile browsers)
    window.setTimeout(done, 400)
  })
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: LangCode,
): SpeechSynthesisVoice | null {
  const locale = SPEECH_LOCALES[lang].toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === locale) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  )
}

/**
 * Speak text. Works on desktop and mobile (user gesture required on phones).
 */
export async function speakText(text: string, lang: LangCode): Promise<void> {
  if (!text.trim()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('Синтез речи не поддерживается в этом браузере')
  }

  // iOS / some Android browsers need resume after cancel
  window.speechSynthesis.cancel()
  try {
    window.speechSynthesis.resume()
  } catch {
    // ignore
  }

  const voices = await ensureVoicesLoaded()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LOCALES[lang]
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1

  const match = pickVoice(voices, lang)
  if (match) utterance.voice = match

  // Chrome Android sometimes drops first utterance after cancel
  window.setTimeout(() => {
    window.speechSynthesis.speak(utterance)
  }, 50)
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
