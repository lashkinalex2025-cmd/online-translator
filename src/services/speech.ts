import type { LangCode } from '../types'
import { SPEECH_LOCALES } from '../constants/languages'

export type SpeechCallbacks = {
  onInterim?: (text: string) => void
  onError?: (message: string) => void
  onFinal?: (text: string) => void
  onStart?: () => void
  onEnd?: () => void
}

type RecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

function getRecognitionCtor(): (new () => RecognitionInstance) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionInstance
    webkitSpeechRecognition?: new () => RecognitionInstance
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

const ERROR_MAP: Record<string, string> = {
  'not-allowed':
    'Нет доступа к микрофону. Разрешите его использование в настройках браузера.',
  'service-not-allowed': 'Служба распознавания речи сейчас недоступна.',
  'audio-capture': 'Микрофон не найден. Проверьте подключение устройства.',
  'no-speech': 'Речь не распознана. Говорите громче или ближе к микрофону.',
  network: 'Ошибка сети при распознавании речи.',
  aborted: '',
}

export class ContinuousSpeechRecognizer {
  private recognition: RecognitionInstance | null = null
  private shouldContinue = false
  private switchingLang = false
  private callbacks: SpeechCallbacks = {}
  private currentLang: LangCode = 'ru'

  get language(): LangCode {
    return this.currentLang
  }

  start(lang: LangCode, callbacks: SpeechCallbacks): void {
    if (!getRecognitionCtor()) {
      callbacks.onError?.(
        'Распознавание речи не поддерживается в этом браузере. Откройте приложение в Chrome или Edge.',
      )
      return
    }

    this.stop()
    this.callbacks = callbacks
    this.shouldContinue = true
    this.currentLang = lang
    this.createAndStart()
  }

  stop(): void {
    this.shouldContinue = false
    this.switchingLang = false
    if (this.recognition) {
      try {
        this.recognition.onend = null
        this.recognition.stop()
      } catch {
        // ignore
      }
      this.recognition = null
    }
  }

  /**
   * Switch recognition language and restart the engine so the locale applies.
   */
  setLanguage(lang: LangCode): void {
    if (lang === this.currentLang) return
    this.currentLang = lang
    if (!this.shouldContinue) return

    this.switchingLang = true
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {
        this.switchingLang = false
        this.createAndStart()
      }
    } else {
      this.switchingLang = false
      this.createAndStart()
    }
  }

  private createAndStart(): void {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = SPEECH_LOCALES[this.currentLang]
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      this.callbacks.onStart?.()
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalChunk += transcript
        else interim += transcript
      }

      if (interim) this.callbacks.onInterim?.(interim)
      if (finalChunk.trim()) this.callbacks.onFinal?.(finalChunk.trim())
    }

    recognition.onerror = (event) => {
      const msg = ERROR_MAP[event.error]
      if (msg) this.callbacks.onError?.(msg)
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture'
      ) {
        this.shouldContinue = false
      }
    }

    recognition.onend = () => {
      if (this.switchingLang) {
        this.switchingLang = false
        if (this.shouldContinue) this.createAndStart()
        return
      }
      if (this.shouldContinue) {
        try {
          recognition.start()
        } catch {
          this.shouldContinue = false
          this.callbacks.onEnd?.()
        }
      } else {
        this.callbacks.onEnd?.()
      }
    }

    this.recognition = recognition
    try {
      recognition.start()
    } catch {
      this.callbacks.onError?.('Не удалось начать распознавание речи.')
      this.shouldContinue = false
    }
  }
}
