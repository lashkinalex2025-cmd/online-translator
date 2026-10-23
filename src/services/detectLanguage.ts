import type { LangCode } from '../types'
import { LANGUAGES } from '../constants/languages'

const SUPPORTED = new Set<LangCode>(LANGUAGES.map((l) => l.code))

export interface DetectResult {
  lang: LangCode
  confidence: number
  source: 'heuristic' | 'api'
}

const CYRILLIC = /[\u0400-\u04FF]/
const GERMAN_CHARS = /[äöüÄÖÜß]/
const FRENCH_CHARS = /[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]/
const SPANISH_CHARS = /[áéíóúüñ¿¡ÁÉÍÓÚÜÑ]/

const WORD_HINTS: Record<LangCode, RegExp[]> = {
  ru: [/\b(и|в|не|на|что|это|как|для|он|она|мы|вы|они|привет|спасибо)\b/i],
  en: [/\b(the|and|is|are|you|that|with|for|have|this|hello|thanks)\b/i],
  de: [/\b(der|die|das|und|ich|nicht|ein|eine|mit|auf|danke|hallo)\b/i],
  fr: [/\b(le|la|les|et|je|est|une|des|pas|pour|bonjour|merci)\b/i],
  es: [/\b(el|la|los|las|que|de|en|un|una|hola|gracias|por)\b/i],
}

function scoreHeuristic(text: string): Record<LangCode, number> {
  const scores: Record<LangCode, number> = { ru: 0, en: 0, de: 0, fr: 0, es: 0 }
  const sample = text.slice(0, 400)

  if (CYRILLIC.test(sample)) scores.ru += 8

  const latin = sample.replace(/[^a-zA-ZàâäéèêëïîôùûüçœæáíóúüñßÄÖÜÀ-ÿ]/g, '')
  if (latin.length >= 2) {
    if (GERMAN_CHARS.test(sample)) scores.de += 5
    if (FRENCH_CHARS.test(sample)) scores.fr += 5
    if (SPANISH_CHARS.test(sample)) scores.es += 5

    for (const code of Object.keys(WORD_HINTS) as LangCode[]) {
      for (const re of WORD_HINTS[code]) {
        const matches = sample.match(new RegExp(re.source, 'gi'))
        if (matches) scores[code] += matches.length * 2
      }
    }

    // Default lean to English for plain Latin without strong cues
    if (scores.de < 2 && scores.fr < 2 && scores.es < 2 && scores.ru === 0) {
      scores.en += 2
    }
  }

  return scores
}

function bestFromScores(scores: Record<LangCode, number>): DetectResult | null {
  let best: LangCode = 'en'
  let max = -1
  let second = -1
  for (const code of Object.keys(scores) as LangCode[]) {
    if (scores[code] > max) {
      second = max
      max = scores[code]
      best = code
    } else if (scores[code] > second) {
      second = scores[code]
    }
  }
  if (max <= 0) return null
  const confidence = Math.min(0.98, 0.45 + (max - Math.max(0, second)) * 0.08)
  return { lang: best, confidence, source: 'heuristic' }
}

async function detectViaGoogle(text: string): Promise<DetectResult | null> {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'auto')
  url.searchParams.set('tl', 'en')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text.slice(0, 500))

  const res = await fetch(url.toString())
  if (!res.ok) return null

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return null

  // Detected language is usually at index 2
  const raw = typeof data[2] === 'string' ? data[2] : null
  if (!raw) return null

  const lang = raw.slice(0, 2).toLowerCase() as LangCode
  if (!SUPPORTED.has(lang)) return null

  return { lang, confidence: 0.9, source: 'api' }
}

/**
 * Detect which of the supported languages the text is written in.
 */
export async function detectLanguage(text: string): Promise<DetectResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { lang: 'en', confidence: 0, source: 'heuristic' }
  }

  const heuristic = bestFromScores(scoreHeuristic(trimmed))

  // Strong Cyrillic or clear heuristic — trust locally for speed
  if (heuristic && heuristic.confidence >= 0.7 && CYRILLIC.test(trimmed)) {
    return heuristic
  }
  if (heuristic && heuristic.confidence >= 0.85) {
    return heuristic
  }

  try {
    const api = await detectViaGoogle(trimmed)
    if (api) return api
  } catch {
    // fall through
  }

  if (heuristic) return heuristic
  return { lang: 'en', confidence: 0.3, source: 'heuristic' }
}

/** Fast sync guess for interim speech (no network). */
export function detectLanguageQuick(text: string): LangCode | null {
  const trimmed = text.trim()
  if (trimmed.length < 2) return null
  const result = bestFromScores(scoreHeuristic(trimmed))
  if (!result || result.confidence < 0.55) return null
  return result.lang
}
