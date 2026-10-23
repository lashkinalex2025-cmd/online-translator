import type { LangCode } from '../types'

const cache = new Map<string, string>()

function cacheKey(text: string, from: LangCode, to: LangCode): string {
  return `${from}|${to}|${text}`
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
        cache.set(key, result)
        return result
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  throw new Error(
    errors[0]
      ? `Не удалось выполнить перевод: ${errors[0]}`
      : 'Не удалось выполнить перевод. Проверьте интернет-соединение.',
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
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text.slice(0, 4500))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Google HTTP ${res.status}`)

  const data = (await res.json()) as unknown
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Google empty response')
  }

  const translated = (data[0] as Array<[string] | undefined>)
    .map((part) => (Array.isArray(part) ? part[0] : ''))
    .join('')
    .trim()

  if (!translated) throw new Error('Google empty translation')
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
          onError?.(e instanceof Error ? e.message : 'Ошибка перевода')
        }
      } finally {
        if (current === abortId) onLoading?.(false)
      }
    }, delayMs)
  }
}
