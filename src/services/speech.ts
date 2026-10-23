import type { LangCode } from '../types'
import { SPEECH_LOCALES } from '../constants/languages'

export type SpeechCallbacks = {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (message: string) => void
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

export class ContinuousSpeechRecognizer {
  private recognition: RecognitionInstance | null = null
  private shouldContinue = false
  private callbacks: SpeechCallbacks = {}

  start(lang: LangCode, callbacks: SpeechCallbacks): void {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      callbacks.onError?.('Распознавание речи не поддерживается в этом браузере. Используйте Chrome или Edge.')
      return
    }

    this.stop()
    this.callbacks = callbacks
    this.shouldContinue = true

    const recognition = new Ctor()
    recognition.lang = SPEECH_LOCALES[lang]
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      this.callbacks.onStart?.()
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalChunk += transcript
        } else {
          interim += transcript
        }
      }

      if (interim) this.callbacks.onInterim?.(interim)
      if (finalChunk.trim()) this.callbacks.onFinal?.(finalChunk.trim())
    }

    recognition.onerror = (event) => {
      const map: Record<string, string> = {
        'not-allowed': 'Доступ к микрофону запрещён. Разрешите микрофон в настройках браузера.',
        'service-not-allowed': 'Сервис распознавания речи недоступен.',
        'audio-capture': 'Микрофон недоступен. Проверьте подключение устройства.',
        'no-speech': 'Речь не обнаружена. Говорите громче или ближе к микрофону.',
        network: 'Ошибка сети при распознавании речи.',
        aborted: '',
      }
      const msg = map[event.error]
      if (msg) this.callbacks.onError?.(msg)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        this.shouldContinue = false
      }
    }

    recognition.onend = () => {
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
      this.callbacks.onError?.('Не удалось запустить распознавание речи.')
      this.shouldContinue = false
    }
  }

  stop(): void {
    this.shouldContinue = false
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

  setLanguage(lang: LangCode): void {
    if (this.recognition) {
      this.recognition.lang = SPEECH_LOCALES[lang]
    }
  }
}
