import { useState } from 'react'
import { LANGUAGES } from '../constants/languages'
import type { LangCode, SourceLang } from '../types'

interface LanguageBarProps {
  sourceLang: SourceLang
  targetLang: LangCode
  detectedLang: LangCode | null
  onSourceChange: (lang: SourceLang) => void
  onTargetChange: (lang: LangCode) => void
  onSwap: () => void
}

export function LanguageBar({
  sourceLang,
  targetLang,
  detectedLang,
  onSourceChange,
  onTargetChange,
  onSwap,
}: LanguageBarProps) {
  const [spin, setSpin] = useState(false)

  const handleSwap = () => {
    if (sourceLang === 'auto') return
    setSpin(true)
    onSwap()
    setTimeout(() => setSpin(false), 250)
  }

  return (
    <div className="lang-bar">
      <div className="lang-select-wrap">
        <select
          className="lang-select"
          value={sourceLang}
          onChange={(e) => onSourceChange(e.target.value as SourceLang)}
          aria-label="Исходный язык"
        >
          <option value="auto">✨ Определить автоматически</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
        {sourceLang === 'auto' && detectedLang && (
          <span className="detected-badge" title="Распознанный язык">
            {LANGUAGES.find((l) => l.code === detectedLang)?.flag}{' '}
            {LANGUAGES.find((l) => l.code === detectedLang)?.name}
          </span>
        )}
      </div>

      <button
        type="button"
        className={`swap-btn${spin ? ' spin' : ''}`}
        onClick={handleSwap}
        title={
          sourceLang === 'auto'
            ? 'Сначала выберите исходный язык'
            : 'Поменять языки местами'
        }
        aria-label="Поменять языки местами"
        disabled={sourceLang === 'auto'}
      >
        ⇄
      </button>

      <select
        className="lang-select"
        value={targetLang}
        onChange={(e) => onTargetChange(e.target.value as LangCode)}
        aria-label="Язык перевода"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.name}
          </option>
        ))}
      </select>
    </div>
  )
}
