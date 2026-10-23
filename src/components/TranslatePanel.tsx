import { speakText, isTtsSupported } from '../services/tts'
import type { LangCode, SourceLang } from '../types'
import { getLangName } from '../constants/languages'

interface TranslatePanelProps {
  sourceText: string
  translatedText: string
  sourceLang: SourceLang
  targetLang: LangCode
  detectedLang: LangCode | null
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
  detectedLang,
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
  const effectiveSource = sourceLang === 'auto' ? detectedLang : sourceLang
  const sourceLabel =
    sourceLang === 'auto'
      ? detectedLang
        ? `Авто: ${getLangName(detectedLang)}`
        : 'Определить язык автоматически'
      : getLangName(sourceLang)

  const handleSpeak = async (text: string, lang: LangCode | null) => {
    if (!text.trim()) {
      onToast('Нет текста для озвучивания')
      return
    }
    if (!lang) {
      onToast('Язык текста ещё не определён')
      return
    }
    try {
      await speakText(text, lang)
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Не удалось озвучить текст')
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-label">
          <span>{sourceLabel}</span>
          <div className="panel-actions">
            {ttsOk && (
              <button
                type="button"
                className="icon-btn"
                title="Прослушать"
                aria-label="Прослушать исходный текст"
                onClick={() => void handleSpeak(sourceText, effectiveSource)}
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
          placeholder={
            sourceLang === 'auto'
              ? 'Введите текст — язык будет определён автоматически…'
              : 'Введите текст для перевода…'
          }
          aria-label="Текст для перевода"
          maxLength={5000}
        />
      </div>

      {(loading || error) && (
        <div className={`status-line${error ? ' error' : ''}`}>
          {loading && (
            <span className="status-pill">
              <span className="pulse-dot" />
              Идёт перевод<span className="loading-dots" />
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
                onClick={() => void handleSpeak(translatedText, targetLang)}
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
              title="Поменять текст местами"
              aria-label="Поменять исходный текст и перевод местами"
              onClick={onSwapTexts}
              disabled={sourceLang === 'auto'}
            >
              ⇅
            </button>
            <button
              type="button"
              className="icon-btn"
              title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              aria-label={
                isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'
              }
              onClick={onToggleFavorite}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>
        </div>
        <div className={`output-text${translatedText ? '' : ' empty'}`}>
          {translatedText || 'Здесь появится перевод'}
        </div>
      </div>
    </>
  )
}
