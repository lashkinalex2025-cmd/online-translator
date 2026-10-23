import type { LangCode } from '../types'
import { SPEECH_LOCALES } from '../constants/languages'

let warmedUp = false

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: LangCode,
): SpeechSynthesisVoice | null {
  const locale = SPEECH_LOCALES[lang].toLowerCase()
  const langPrefix = lang.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === locale) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
    voices.find((v) => v.lang.toLowerCase().includes(langPrefix)) ??
    null
  )
}

/** Preload voices and unlock audio — call early and on first tap. */
export function warmupTts(): void {
  const synth = getSynth()
  if (!synth) return

  const loadVoices = () => {
    synth.getVoices()
  }
  loadVoices()
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', loadVoices)
  }

  if (warmedUp) return
  warmedUp = true

  // Unlock speech engine inside a user gesture / early session (critical for iOS)
  try {
    const unlock = new SpeechSynthesisUtterance('\u200B')
    unlock.volume = 0
    unlock.rate = 1
    unlock.pitch = 1
    synth.speak(unlock)
    synth.cancel()
    synth.resume()
  } catch {
    // ignore
  }
}

/**
 * Speak text. Must be called directly from a click/tap handler on mobile:
 * speak() runs synchronously so iOS keeps the user-gesture permission.
 */
export function speakText(text: string, lang: LangCode): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return Promise.resolve()

  const synth = getSynth()
  if (!synth) {
    return Promise.reject(
      new Error('Озвучивание текста не поддерживается в этом браузере'),
    )
  }

  warmupTts()

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.lang = SPEECH_LOCALES[lang]
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    const voices = synth.getVoices()
    const match = pickVoice(voices, lang)
    if (match) {
      utterance.voice = match
      utterance.lang = match.lang || SPEECH_LOCALES[lang]
    }

    let settled = false
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve()
    }

    utterance.onend = () => finish()
    utterance.onerror = (event) => {
      // 'interrupted' / 'canceled' — обычная смена фразы, не ошибка для пользователя
      const typ = (event as SpeechSynthesisErrorEvent).error
      if (typ === 'interrupted' || typ === 'canceled') {
        finish()
        return
      }
      finish(new Error('Не удалось озвучить текст на этом устройстве'))
    }

    const speakNow = () => {
      try {
        synth.resume()
      } catch {
        // ignore
      }
      synth.speak(utterance)

      // iOS иногда ставит очередь на паузу — «подталкиваем» resume
      if (isIOS()) {
        window.setTimeout(() => {
          try {
            synth.resume()
          } catch {
            // ignore
          }
        }, 250)
      }
    }

    if (synth.speaking || synth.pending) {
      synth.cancel()
      // Android часто теряет фразу, если speak сразу после cancel
      if (isAndroid()) {
        window.setTimeout(speakNow, 60)
      } else {
        // iOS: speak в том же жесте, без ожидания
        speakNow()
      }
    } else {
      speakNow()
    }
  })
}

export function stopSpeaking(): void {
  const synth = getSynth()
  if (synth) synth.cancel()
}

export function isTtsSupported(): boolean {
  return getSynth() !== null
}
