import type { LangCode } from '../types'

const cache = new Map<string, string>()

function cacheKey(text: string, from: LangCode, to: LangCode): string {
  return `${from}|${to}|${text}`
}

type Replacement = [RegExp, string]

/**
 * Граница слова с поддержкой Unicode.
 * В JS обычный `\b` считает «словом» только ASCII [A-Za-z0-9_], поэтому
 * кириллица/диакритика через `\b` не находятся.
 */
function uw(pattern: string, flags = 'gi'): RegExp {
  const f = flags.includes('u') ? flags : `${flags}u`
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, f)
}

/** Общая нормализация пробелов и базовой пунктуации для всех языков. */
function normalizeSpacingAndPunctuation(text: string): string {
  let result = text.trim()
  if (!result) return result

  result = result
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    // Пробел после конца предложения, если склеены сегменты API
    .replace(/([.!?…»"”])([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝŸА-ЯЁ])/g, '$1 $2')
    .replace(/([.!?…])([a-zàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿа-яё])/gi, '$1 $2')
    .replace(/\s+([.,:;!?…])/g, '$1')
    .replace(/([«„“"])\s+/g, '$1')
    .replace(/\s+([»”"'])/g, '$1')
    .replace(/([({\[])\s+/g, '$1')
    .replace(/\s+([)}\]])/g, '$1')
    .replace(/,\s*/g, ', ')
    .replace(/;\s*/g, '; ')
    .replace(/:\s*/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.!?…])/g, '$1')
    .trim()

  return result
}

function applyReplacements(text: string, replacements: Replacement[]): string {
  let result = text
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/** Заглавная буква в начале текста и после конца предложения. */
function capitalizeSentences(
  text: string,
  letterClass: string,
): string {
  const re = new RegExp(`(^|[.!?…]["»”']?\\s+)([${letterClass}])`, 'g')
  return text.replace(re, (_, prefix: string, letter: string) => {
    return prefix + letter.toUpperCase()
  })
}

/**
 * Русский: пунктуация, регистр, запятые перед союзами, типичные кальки МП.
 */
function polishRussian(text: string): string {
  let result = normalizeSpacingAndPunctuation(text)
  if (!result) return result

  // «то что» → «то, что»
  result = result.replace(uw('то\\s+что'), 'то, что')

  // Запятая перед подчинительными союзами после слова ≥3 букв (не трогаем «а что», «ну что»)
  result = result.replace(
    /([А-Яа-яЁёA-Za-z]{3,})\s+(что|чтобы|который|которая|которое|которые|которых|которого|которой|куда|когда|потому\s+что|так\s+как)(?![\p{L}\p{N}_])/giu,
    '$1, $2',
  )
  result = result.replace(/,\s*,+/g, ',')

  result = applyReplacements(result, [
    [uw('пожалуйста\\s*,\\s*'), 'пожалуйста, '],
    [/Пожалуйста\s+(?=[а-яё])/g, 'Пожалуйста, '],
    [/пожалуйста\s+(?=[а-яё])/g, 'пожалуйста, '],
    [uw('Я\\s+есть'), 'Я'],
    [uw('я\\s+есть'), 'я'],
    [uw('Это\\s+есть'), 'Это'],
    [uw('это\\s+есть'), 'это'],
    [uw('Он\\s+есть'), 'Он'],
    [uw('он\\s+есть'), 'он'],
    [uw('Она\\s+есть'), 'Она'],
    [uw('она\\s+есть'), 'она'],
    [uw('Мы\\s+есть'), 'Мы'],
    [uw('мы\\s+есть'), 'мы'],
    [uw('в\\s+течении'), 'в течение'],
    [uw('во\\s+время\\s+того\\s*,\\s*как'), 'пока'],
    [uw('по\\s+поводу\\s+того\\s*,\\s*что'), 'о том, что'],
    [uw('из[- ]за\\s+того\\s+факта\\s*,\\s*что'), 'из-за того, что'],
    // Частый UI-калек: «сделайте щелчок/клик по кнопке»
    [uw('(?:сделайте|Сделайте)\\s+(?:клик|щелчок)\\s+по\\s+кнопке'), 'Нажмите кнопку'],
    [uw('(?:сделать|Сделать)\\s+(?:клик|щелчок)\\s+по\\s+кнопке'), 'нажать кнопку'],
    [uw('(?:клик|щелчок)\\s+по\\s+кнопке'), 'нажатие кнопки'],
    [uw('сделайте\\s+(?:клик|щелчок)\\s+по'), 'нажмите'],
    [uw('Сделайте\\s+(?:клик|щелчок)\\s+по'), 'Нажмите'],
    [uw('сделать\\s+(?:клик|щелчок)\\s+по'), 'нажать'],
    [uw('Сделать\\s+(?:клик|щелчок)\\s+по'), 'Нажать'],
    [uw('сделать\\s+(?:клик|щелчок)'), 'нажать'],
    [uw('Сделать\\s+(?:клик|щелчок)'), 'Нажать'],
    [uw('сделайте\\s+(?:клик|щелчок)'), 'нажмите'],
    [uw('Сделайте\\s+(?:клик|щелчок)'), 'Нажмите'],
    [uw('более\\s+лучше'), 'лучше'],
    [uw('самый\\s+лучший'), 'лучший'],
    [uw('свободное\\s+время\\s+провождения'), 'досуг'],
    [uw('принять\\s+решение\\s+о\\s+том\\s*,\\s*чтобы'), 'решить'],
    [uw('я\\s+имею\\s+нужду'), 'мне нужно'],
    [uw('Я\\s+имею\\s+нужду'), 'Мне нужно'],
    [uw('делать\\s+ошибку'), 'ошибиться'],
    [uw('идти\\s+пешком\\s+ногой'), 'идти пешком'],
    [/\s+[—–-]\s+/g, ' — '],
  ])

  result = capitalizeSentences(result, 'а-яё')
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * English: punctuation, sentence case, common MT grammar slips.
 */
function polishEnglish(text: string): string {
  let result = normalizeSpacingAndPunctuation(text)
  if (!result) return result

  result = applyReplacements(result, [
    [/\bmore\s+better\b/gi, 'better'],
    [/\bmost\s+best\b/gi, 'best'],
    [/\bdidn'?t\s+said\b/gi, "didn't say"],
    [/\bdid\s+went\b/gi, 'went'],
    [/\bhe\s+don't\b/gi, "he doesn't"],
    [/\bshe\s+don't\b/gi, "she doesn't"],
    [/\bit\s+don't\b/gi, "it doesn't"],
    [/\bi\s+is\b/g, 'I am'],
    [/\bI\s+is\b/g, 'I am'],
    [/\bi\s+are\b/g, 'I am'],
    [/\bI\s+are\b/g, 'I am'],
    [/\s+[—–]\s+/g, ' — '],
  ])

  result = capitalizeSentences(result, 'a-z')
  // «I» всегда с заглавной
  result = result.replace(/(^|[^\w])i(?=['\s.,!?;:]|$)/g, '$1I')

  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * German: Satzanfänge, Leerzeichen, häufige MT-Fehler.
 */
function polishGerman(text: string): string {
  let result = normalizeSpacingAndPunctuation(text)
  if (!result) return result

  result = applyReplacements(result, [
    [uw('ich\\s+bin\\s+bin'), 'ich bin'],
    [uw('mehr\\s+besser'), 'besser'],
    [uw('am\\s+bestensten'), 'am besten'],
    [/Bitte\s+(?=[a-zäöü])/g, 'Bitte '],
    [/\s+[—–]\s+/g, ' – '],
  ])

  result = capitalizeSentences(result, 'a-zäöüß')
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * French: typographie de base (espace avant :;!? ), casse, calques fréquents.
 */
function polishFrench(text: string): string {
  let result = normalizeSpacingAndPunctuation(text)
  if (!result) return result

  // Французская пунктуация: пробел перед : ; ! ?
  result = result
    .replace(/\s*([;!?])/g, ' $1')
    .replace(/\s*:/g, ' :')
    .replace(/\s{2,}/g, ' ')

  result = applyReplacements(result, [
    [uw('plus\\s+mieux'), 'mieux'],
    [uw('Je\\s+suis\\s+suis'), 'Je suis'],
    [uw('je\\s+suis\\s+suis'), 'je suis'],
    [uw("s'il\\s+vous\\s+plait"), "s'il vous plaît"],
    [uw("s'il\\s+te\\s+plait"), "s'il te plaît"],
    [/\s+[—–]\s+/g, ' — '],
  ])

  result = capitalizeSentences(result, 'a-zàâäæçéèêëïîôœùûüÿ')
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Spanish: apertura ¿¡, mayúsculas, calcos típicos.
 */
function polishSpanish(text: string): string {
  let result = normalizeSpacingAndPunctuation(text)
  if (!result) return result

  result = applyReplacements(result, [
    [uw('más\\s+mejor'), 'mejor'],
    [uw('Yo\\s+soy\\s+soy'), 'Yo soy'],
    [uw('yo\\s+soy\\s+soy'), 'yo soy'],
    [/por\s+favor\s+(?=[a-záéíóúüñ])/gi, 'por favor, '],
    [/\s+[—–]\s+/g, ' — '],
  ])

  result = capitalizeSentences(result, 'a-záéíóúüñ')

  // Добавить ¿ / ¡ в начале предложения, если в конце ? / ! без открывающего знака
  result = result.replace(
    /(^|[.!?]\s+)([^¿¡.!?]*?)(\?)/g,
    (full, prefix: string, middle: string, end: string) => {
      if (middle.includes('¿')) return full
      return `${prefix}¿${middle.trimStart()}${end}`
    },
  )
  result = result.replace(
    /(^|[.!?]\s+)([^¿¡.!?]*?)(!)/g,
    (full, prefix: string, middle: string, end: string) => {
      if (middle.includes('¡')) return full
      return `${prefix}¡${middle.trimStart()}${end}`
    },
  )
  // Заглавная после ¿ ¡
  result = result.replace(/(¿|¡)([a-záéíóúüñ])/g, (_, open: string, letter: string) => {
    return open + letter.toUpperCase()
  })

  return result.replace(/\s{2,}/g, ' ').trim()
}

function finalizeTranslation(text: string, to: LangCode): string {
  switch (to) {
    case 'ru':
      return polishRussian(text)
    case 'en':
      return polishEnglish(text)
    case 'de':
      return polishGerman(text)
    case 'fr':
      return polishFrench(text)
    case 'es':
      return polishSpanish(text)
    default:
      return text.trim()
  }
}

/**
 * Translate text between supported languages.
 * Tries Google Translate (unofficial gtx), then MyMemory, then LibreTranslate.
 */
export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if (from === to) return trimmed

  const key = cacheKey(trimmed, from, to)
  const cached = cache.get(key)
  if (cached) return cached

  const errors: string[] = []

  for (const fn of [translateGoogle, translateMyMemory, translateLibre]) {
    try {
      const result = await fn(trimmed, from, to)
      if (result) {
        const polished = finalizeTranslation(result, to)
        cache.set(key, polished)
        return polished
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  throw new Error(
    errors[0]
      ? `Не удалось выполнить перевод. ${errors[0]}`
      : 'Не удалось выполнить перевод. Проверьте подключение к интернету.',
  )
}

async function translateGoogle(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', from)
  url.searchParams.set('tl', to)
  url.searchParams.set('hl', to === 'ru' ? 'ru' : 'en')
  url.searchParams.set('dt', 't')
  url.searchParams.set('ie', 'UTF-8')
  url.searchParams.set('oe', 'UTF-8')
  url.searchParams.set('q', text.slice(0, 4500))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Ошибка сервиса перевода (${res.status})`)

  const data = (await res.json()) as unknown
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Пустой ответ сервиса перевода')
  }

  const translated = (data[0] as Array<[string] | undefined>)
    .map((part) => (Array.isArray(part) ? part[0] : ''))
    .join('')
    .trim()

  if (!translated) throw new Error('Пустой ответ сервиса перевода')
  return translated
}

async function translateMyMemory(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text.slice(0, 500))
  url.searchParams.set('langpair', `${from}|${to}`)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`)

  const data = (await res.json()) as {
    responseStatus: number
    responseData?: { translatedText?: string }
  }

  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    throw new Error('MyMemory empty response')
  }

  const translated = data.responseData.translatedText.trim()
  if (!translated || translated.toUpperCase() === 'INVALID SOURCE LANGUAGE') {
    throw new Error('Invalid translation')
  }

  return translated
}

async function translateLibre(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text.slice(0, 2000),
      source: from,
      target: to,
      format: 'text',
    }),
  })

  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`)

  const data = (await res.json()) as { translatedText?: string }
  if (!data.translatedText) throw new Error('LibreTranslate empty')
  return data.translatedText.trim()
}

/** Debounced translate helper */
export function createDebouncedTranslate(delayMs = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let abortId = 0

  return (
    text: string,
    from: LangCode,
    to: LangCode,
    onResult: (result: string) => void,
    onError?: (err: string) => void,
    onLoading?: (loading: boolean) => void,
  ) => {
    if (timer) clearTimeout(timer)
    const current = ++abortId

    if (!text.trim()) {
      onResult('')
      onLoading?.(false)
      return
    }

    onLoading?.(true)
    timer = setTimeout(async () => {
      try {
        const result = await translateText(text, from, to)
        if (current === abortId) onResult(result)
      } catch (e) {
        if (current === abortId) {
          onError?.(e instanceof Error ? e.message : 'Не удалось выполнить перевод')
        }
      } finally {
        if (current === abortId) onLoading?.(false)
      }
    }, delayMs)
  }
}
