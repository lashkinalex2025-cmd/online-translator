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
    // Многоточие и повторы знаков
    .replace(/\.{3,}/g, '…')
    .replace(/([!?])\1+/g, '$1')
    .replace(/([.!?…]){2,}/g, '$1')
    // Пробел после конца предложения, если склеены сегменты API
    .replace(/([.!?…»"”])([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝŸА-ЯЁ])/g, '$1 $2')
    .replace(/([.!?…])([A-Za-zÀ-ÿА-Яа-яЁё])/g, '$1 $2')
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
    .replace(/([.!?…])([«„“"'(\[])/g, '$1 $2')
    .trim()

  return result
}

/** Перенос конечного знака из исходника, если перевод его потерял. */
function mirrorTerminalPunctuation(source: string, translated: string): string {
  const src = source.trim()
  let dst = translated.trim()
  if (!src || !dst) return dst

  const srcEnd = src.match(/[.!?…]+$/)?.[0]
  const dstHasEnd = /[.!?…]$/.test(dst)
  if (srcEnd && !dstHasEnd) {
    const mark = srcEnd.includes('?') ? '?' : srcEnd.includes('!') ? '!' : srcEnd.includes('…') ? '…' : '.'
    return `${dst}${mark}`
  }

  // Устная речь без знаков: завершаем повествовательное предложение точкой
  if (!srcEnd && !dstHasEnd && dst.length >= 28 && !/[¿¡?]/.test(dst)) {
    return `${dst}.`
  }

  return dst
}

/**
 * Восстановление границ предложений в «слипшемся» тексте без точек
 * (часто после распознавания речи). Срабатывает только если в тексте
 * ещё нет [.?!…], и только перед местоимением + глагол, если слева
 * не подчинительный союз (чтобы не ломать «if he has / если он»).
 */
function restoreSentenceBoundaries(text: string, lang: LangCode): string {
  if (/[.!?…]/.test(text)) return text

  let result = text

  if (lang === 'en') {
    result = result.replace(
      /(?<=\p{L}{2,})(?<!\b(?:if|when|because|while|that|as|than|whether|since|after|before|until|unless|though|although|what|why|how|where|who|whom|whose|which|and|or|but|so|for))\s+(I|We|They|He|She|You|It)\s+(am|is|are|was|were|have|has|had|will|would|can|could|do|does|did|don't|doesn't|didn't|went|go|got|need|want|think|know)\b/giu,
      '. $1 $2',
    )
  } else if (lang === 'ru') {
    result = result.replace(
      /(?<=[А-Яа-яЁё]{3,})(?<!\b(?:что|чтобы|если|когда|где|куда|как|пока|хотя|будто|чтоб|то|и|а|но|или|либо))\s+(Я|Мы|Он|Она|Они|Вы|Ты)\s+(был|была|были|буду|будем|хочу|хотел|иду|шёл|шел|ходила|ходил|сделал|сказал|думаю|знаю|могу|не|уже|сейчас|вчера|сегодня)\b/giu,
      '. $1 $2',
    )
  } else if (lang === 'de') {
    result = result.replace(
      /(?<=\p{L}{3,})(?<!\b(?:weil|dass|daß|wenn|ob|als|bevor|nachdem|obwohl|während|damit|und|oder|aber|sondern))\s+(Ich|Wir|Sie|Er|Es|Du)\s+(bin|bist|ist|sind|habe|hat|war|werde|kann|muss|gehe|ging|will|möchte)\b/giu,
      '. $1 $2',
    )
  } else if (lang === 'fr') {
    result = result.replace(
      /(?<=\p{L}{3,})(?<!\b(?:si|quand|lorsque|que|parce|pendant|afin|bien|et|ou|mais|car|donc))\s+(Je|Nous|Ils|Elles|Il|Elle|Tu|Vous)\s+(suis|es|est|sommes|ai|as|a|étais|vais|peux|dois|veux|pense|sais)\b/giu,
      '. $1 $2',
    )
  } else if (lang === 'es') {
    result = result.replace(
      /(?<=\p{L}{3,})(?<!\b(?:si|cuando|porque|aunque|mientras|que|y|o|pero|sino))\s+(Yo|Nosotros|Ellos|Ellas|Él|Ella|Tú|Usted|Ustedes)\s+(soy|eres|es|somos|estoy|está|tengo|fui|voy|puedo|quiero|sé|pienso)\b/giu,
      '. $1 $2',
    )
  }

  return result.replace(/\s{2,}/g, ' ').trim()
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

  result = restoreSentenceBoundaries(result, 'ru')

  // «то что» → «то, что»
  result = result.replace(uw('то\\s+что'), 'то, что')

  // Сначала составные союзы (иначе «потому что» станет «потому, что»)
  result = result.replace(
    /([А-Яа-яЁёA-Za-z]{3,})\s+(несмотря\s+на\s+то\s+что|потому\s+что|так\s+как)(?![\p{L}\p{N}_])/giu,
    '$1, $2',
  )
  // Запятая перед подчинительными союзами после слова ≥3 букв (не трогаем «а что», «ну что»)
  result = result.replace(
    /([А-Яа-яЁёA-Za-z]{3,})\s+(чтобы|который|которая|которое|которые|которых|которого|которой|куда|когда|где|если|хотя|пока|будто|словно|что)(?![\p{L}\p{N}_])/giu,
    '$1, $2',
  )
  // Запятая перед сочинительными «а / но / однако / зато»
  result = result.replace(
    /([А-Яа-яЁёA-Za-z]{2,})\s+(но|а|однако|зато)(?=[\s,]|[А-Яа-яЁё])/giu,
    '$1, $2',
  )
  // На случай если «потому что» уже разбили
  result = result.replace(/потому,\s*что/gi, 'потому что')
  result = result.replace(/так,\s*как(?=\s)/gi, 'так как')
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

  result = restoreSentenceBoundaries(result, 'en')

  // Запятая перед but / yet / although / because в середине фразы
  result = result.replace(
    /([A-Za-z]{2,})\s+(but|yet|although|because)\s+/gi,
    '$1, $2 ',
  )
  result = result.replace(/,\s*,+/g, ',')

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
    [/please\s+(?=[a-z])/gi, 'please, '],
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

  result = restoreSentenceBoundaries(result, 'de')

  // Запятая перед Nebensatz-Konjunktionen
  result = result.replace(
    /([A-Za-zÄÖÜäöüß]{2,})\s+(weil|dass|daß|wenn|obwohl|während|damit|ob|als|bevor|nachdem|sondern|aber)\s+/gi,
    '$1, $2 ',
  )
  result = result.replace(/,\s*,+/g, ',')

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

  result = restoreSentenceBoundaries(result, 'fr')

  // Запятая перед mais / car / donc / cependant / parce que / afin que / bien que
  result = result.replace(
    /([A-Za-zÀ-ÿ]{2,})\s+(mais|car|donc|cependant|parce\s+que|afin\s+que|bien\s+que)\s+/gi,
    '$1, $2 ',
  )
  result = result.replace(/,\s*,+/g, ',')

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

  result = restoreSentenceBoundaries(result, 'es')

  // Запятая перед pero / sino / aunque / porque / mientras
  result = result.replace(
    /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,})\s+(pero|sino|aunque|porque|mientras)\s+/gi,
    '$1, $2 ',
  )
  result = result.replace(/,\s*,+/g, ',')

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

function finalizeTranslation(text: string, to: LangCode, source?: string): string {
  let polished: string
  switch (to) {
    case 'ru':
      polished = polishRussian(text)
      break
    case 'en':
      polished = polishEnglish(text)
      break
    case 'de':
      polished = polishGerman(text)
      break
    case 'fr':
      polished = polishFrench(text)
      break
    case 'es':
      polished = polishSpanish(text)
      break
    default:
      polished = text.trim()
  }

  if (source) {
    polished = mirrorTerminalPunctuation(source, polished)
    // После добавления конечного знака снова выровнять регистр начала
    if (to === 'ru') polished = capitalizeSentences(polished, 'а-яё')
    else if (to === 'en') {
      polished = capitalizeSentences(polished, 'a-z')
      polished = polished.replace(/(^|[^\w])i(?=['\s.,!?;:]|$)/g, '$1I')
    } else if (to === 'de') polished = capitalizeSentences(polished, 'a-zäöüß')
    else if (to === 'fr') polished = capitalizeSentences(polished, 'a-zàâäæçéèêëïîôœùûüÿ')
    else if (to === 'es') polished = capitalizeSentences(polished, 'a-záéíóúüñ')
  }

  return polished.replace(/\s{2,}/g, ' ').trim()
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
        const polished = finalizeTranslation(result, to, trimmed)
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
