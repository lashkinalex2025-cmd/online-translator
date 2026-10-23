import { useState } from 'react'
import { LANGUAGES } from '../constants/languages'
import type { LangCode } from '../types'

interface LanguageBarProps {
  sourceLang: LangCode
  targetLang: LangCode
  onSourceChange: (lang: LangCode) => void
  onTargetChange: (lang: LangCode) => void
  onSwap: () => void
}

export function LanguageBar({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwap,
}: LanguageBarProps) {
  const [spin, setSpin] = useState(false)

  const handleSwap = () => {
    setSpin(true)
    onSwap()
    setTimeout(() => setSpin(false), 250)
  }

  return (
    <div className="lang-bar">
      <select
        className="lang-select"
        value={sourceLang}
        onChange={(e) => onSourceChange(e.target.value as LangCode)}
        aria-label="Исходный язык"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={`swap-btn${spin ? ' spin' : ''}`}
        onClick={handleSwap}
        title="Поменять языки местами"
        aria-label="Поменять языки местами"
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
