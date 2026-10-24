import type { LangCode } from '../types'

export type AudioFormat = 'mp3' | 'm4a'

const VOICE_BY_LANG: Record<LangCode, string> = {
  ru: 'ru',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
}

type EspeakInstance = {
  synthesize: (
    text: string,
    options?: { voice?: string; endPause?: boolean },
  ) => { samples: Int16Array; sampleRate: number }
  loadLanguages: (languages: string[]) => Promise<void>
}

let espeakPromise: Promise<EspeakInstance> | null = null

async function getEspeak(): Promise<EspeakInstance> {
  if (!espeakPromise) {
    espeakPromise = (async () => {
      const { createEspeak } = await import('@spelling-creator/spellophone')
      return createEspeak({
        cdn: 'jsdelivr',
        languages: ['en', 'ru', 'de', 'fr', 'es'],
        fallback: () => import('@spelling-creator/spellophone/wasm2js'),
      })
    })().catch((err) => {
      espeakPromise = null
      throw err
    })
  }
  return espeakPromise
}

async function synthesizePcm(
  text: string,
  lang: LangCode,
): Promise<{ samples: Int16Array; sampleRate: number }> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Нет текста перевода для озвучивания')
  }

  const espeak = await getEspeak()
  const voice = VOICE_BY_LANG[lang]

  try {
    const result = espeak.synthesize(trimmed, { voice, endPause: true })
    if (!result.samples.length) throw new Error('Пустой аудиорезультат')
    return { samples: result.samples, sampleRate: result.sampleRate }
  } catch {
    await espeak.loadLanguages([voice])
    const result = espeak.synthesize(trimmed, { voice, endPause: true })
    if (!result.samples.length) {
      throw new Error('Не удалось синтезировать речь')
    }
    return { samples: result.samples, sampleRate: result.sampleRate }
  }
}

async function encodeMp3(samples: Int16Array, sampleRate: number): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const encoder = new Mp3Encoder(1, sampleRate, 128)
  const block = 1152
  const parts: BlobPart[] = []

  for (let i = 0; i < samples.length; i += block) {
    const chunk = samples.subarray(i, i + block)
    const buf = encoder.encodeBuffer(chunk)
    if (buf.length > 0) parts.push(Uint8Array.from(buf))
  }

  const flush = encoder.flush()
  if (flush.length > 0) parts.push(Uint8Array.from(flush))

  return new Blob(parts, { type: 'audio/mpeg' })
}

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'audio/mp4',
    'audio/aac',
    'audio/mp4;codecs=mp4a.40.2',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

async function encodeM4a(
  samples: Int16Array,
  sampleRate: number,
): Promise<Blob> {
  const mime = pickRecorderMime()
  if (!mime) {
    throw new Error(
      'Формат M4A не поддерживается в этом браузере. Выберите MP3.',
    )
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) {
    throw new Error('Web Audio API недоступен для конвертации в M4A')
  }

  const { encodeWav } = await import('@spelling-creator/spellophone')
  const wavBytes = encodeWav(samples, sampleRate)
  const wavCopy = wavBytes.buffer.slice(
    wavBytes.byteOffset,
    wavBytes.byteOffset + wavBytes.byteLength,
  )

  const ctx = new AudioCtx()
  try {
    if (ctx.state === 'suspended') await ctx.resume()

    const buffer = await ctx.decodeAudioData(wavCopy)
    const dest = ctx.createMediaStreamDestination()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(dest)
    // Некоторые движки не пишут MediaRecorder, пока цепочка не связана с destination
    const mute = ctx.createGain()
    mute.gain.value = 0
    source.connect(mute)
    mute.connect(ctx.destination)

    const recorder = new MediaRecorder(dest.stream, { mimeType: mime })
    const chunks: BlobPart[] = []

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onerror = () => reject(new Error('Ошибка записи M4A'))
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/mp4' }))
    })

    const durationMs = Math.ceil(buffer.duration * 1000) + 500
    recorder.start(50)
    source.start(0)
    await new Promise((r) => setTimeout(r, durationMs))
    if (recorder.state !== 'inactive') recorder.stop()

    const result = await done
    if (!result.size) throw new Error('Пустой файл M4A')
    return result
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

function buildFileName(lang: LangCode, format: AudioFormat): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `perevod-${lang}-${stamp}.${format}`
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Не удалять ссылку и blob сразу — иначе Chrome отменяет скачивание
  window.setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 15000)
}

/** Скачать озвучку перевода в выбранном формате (mp3 | m4a). */
export async function downloadTranslationAudio(
  text: string,
  lang: LangCode,
  format: AudioFormat,
): Promise<{ format: AudioFormat; fallbackFromM4a?: boolean }> {
  const { samples, sampleRate } = await synthesizePcm(text, lang)

  if (format === 'mp3') {
    const mp3 = await encodeMp3(samples, sampleRate)
    triggerDownload(mp3, buildFileName(lang, 'mp3'))
    return { format: 'mp3' }
  }

  try {
    const m4a = await Promise.race([
      encodeM4a(samples, sampleRate),
      new Promise<Blob>((_, reject) => {
        window.setTimeout(
          () => reject(new Error('Таймаут записи M4A')),
          30000,
        )
      }),
    ])
    triggerDownload(m4a, buildFileName(lang, 'm4a'))
    return { format: 'm4a' }
  } catch {
    // В части браузеров MediaRecorder+AudioContext не даёт M4A — сохраняем MP3.
    const mp3 = await encodeMp3(samples, sampleRate)
    triggerDownload(mp3, buildFileName(lang, 'mp3'))
    return { format: 'mp3', fallbackFromM4a: true }
  }
}

export function isAudioDownloadSupported(): boolean {
  return typeof document !== 'undefined' && typeof WebAssembly !== 'undefined'
}
