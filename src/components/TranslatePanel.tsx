import { speakText, isTtsSupported } from '../services/tts'
import type { LangCode } from '../types'
import { getLangName } from '../constants/languages'

interface TranslatePanelProps {
  sourceText: string
  translatedText: string
  sourceLang: LangCode
  targetLang: LangCode
  loading: boolean
  error: string | null
  isFavorite: boolean
  onSourceChange: (text: string) => void
  onClear: () => void
  onCopy: () => void
  onSwapTexts: () => void
  onToggleFavorite: () => void
  onToast: (msg: string) => void
}

export function TranslatePanel({
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  loading,
  error,
  isFavorite,
  onSourceChange,
  onClear,
  onCopy,
  onSwapTexts,
  onToggleFavorite,
  onToast,
}: TranslatePanelProps) {
  const ttsOk = isTtsSupported()

  const handleSpeak = (text: string, lang: LangCode) => {
    if (!text.trim()) {
      onToast('Нечего озвучивать')
      return
    }
    try {
      speakText(text, lang)
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Ошибка озвучивания')
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-label">
          <span>{getLangName(sourceLang)}</span>
          <div className="panel-actions">
            {ttsOk && (
              <button
                type="button"
                className="icon-btn"
                title="Прослушать"
                aria-label="Прослушать исходный текст"
                onClick={() => handleSpeak(sourceText, sourceLang)}
              >
                🔊
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              title="Очистить"
              aria-label="Очистить поля"
              onClick={onClear}
            >
              ✕
            </button>
          </div>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="Введите текст для перевода..."
          aria-label="Текст для перевода"
          maxLength={5000}
        />
      </div>

      {(loading || error) && (
        <div className={`status-line${error ? ' error' : ''}`}>
          {loading && (
            <span className="status-pill">
              <span className="pulse-dot" />
              Перевожу<span className="loading-dots" />
            </span>
          )}
          {error && <span>{error}</span>}
        </div>
      )}

      <div className="panel output">
        <div className="panel-label">
          <span>{getLangName(targetLang)}</span>
          <div className="panel-actions">
            {ttsOk && (
              <button
                type="button"
                className="icon-btn"
                title="Прослушать перевод"
                aria-label="Прослушать перевод"
                onClick={() => handleSpeak(translatedText, targetLang)}
              >
                🔊
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              title="Копировать"
              aria-label="Копировать перевод"
              onClick={onCopy}
            >
              📋
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Обмен текстом"
              aria-label="Обмен текстом с переводом"
              onClick={onSwapTexts}
            >
              ⇅
            </button>
            <button
              type="button"
              className="icon-btn"
              title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              onClick={onToggleFavorite}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>
        </div>
        <div className={`output-text${translatedText ? '' : ' empty'}`}>
          {translatedText || 'Перевод появится здесь'}
        </div>
      </div>
    </>
  )
}
