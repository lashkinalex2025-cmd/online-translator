import type { LangCode, VoiceStatus } from '../types'
import { getLangName } from '../constants/languages'
import { speakText, isTtsSupported } from '../services/tts'

interface VoicePanelProps {
  status: VoiceStatus
  interimText: string
  finalText: string
  translatedText: string
  error: string | null
  sourceLang: LangCode
  targetLang: LangCode
  supported: boolean
  onStart: () => void
  onStop: () => void
  onToast: (msg: string) => void
}

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'Остановлено',
  listening: 'Слушаю...',
  translating: 'Перевожу...',
  stopped: 'Остановлено',
  error: 'Ошибка',
}

export function VoicePanel({
  status,
  interimText,
  finalText,
  translatedText,
  error,
  sourceLang,
  targetLang,
  supported,
  onStart,
  onStop,
  onToast,
}: VoicePanelProps) {
  const isActive = status === 'listening' || status === 'translating'
  const displaySource = finalText + (interimText ? (finalText ? ' ' : '') + interimText : '')

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
      <h2 className="section-title">Голосовой перевод</h2>

      <div className="status-line">
        {isActive && (
          <span className={`status-pill ${status === 'listening' ? 'listening' : 'translating'}`}>
            <span className="pulse-dot" />
            {STATUS_LABEL[status]}
          </span>
        )}
        {!isActive && status !== 'error' && (
          <span className="status-pill">{STATUS_LABEL[status === 'stopped' ? 'stopped' : 'idle']}</span>
        )}
      </div>

      {error && <div className="status-line error">{error}</div>}

      {!supported && (
        <div className="panel">
          <p>
            Распознавание речи не поддерживается в этом браузере. Откройте приложение в Chrome или
            Edge и разрешите доступ к микрофону.
          </p>
        </div>
      )}

      <div className="panel">
        <div className="panel-label">
          <span>Распознано ({getLangName(sourceLang)})</span>
          {isTtsSupported() && (
            <div className="panel-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label="Прослушать"
                onClick={() => handleSpeak(displaySource, sourceLang)}
              >
                🔊
              </button>
            </div>
          )}
        </div>
        <div className={`output-text${displaySource ? '' : ' empty'}`}>
          {displaySource || 'Нажмите «Старт» и говорите...'}
        </div>
      </div>

      <div className="panel output">
        <div className="panel-label">
          <span>Перевод ({getLangName(targetLang)})</span>
          {isTtsSupported() && (
            <div className="panel-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label="Прослушать перевод"
                onClick={() => handleSpeak(translatedText, targetLang)}
              >
                🔊
              </button>
            </div>
          )}
        </div>
        <div className={`output-text${translatedText ? '' : ' empty'}`}>
          {translatedText || 'Перевод появится здесь'}
        </div>
      </div>

      <div className="voice-controls">
        {!isActive ? (
          <button
            type="button"
            className="voice-btn start"
            onClick={onStart}
            disabled={!supported}
          >
            🎙️ Старт
          </button>
        ) : (
          <button type="button" className="voice-btn stop" onClick={onStop}>
            ⏹ Стоп
          </button>
        )}
        <p className="voice-hint">
          Говорите на языке «{getLangName(sourceLang)}». Текст будет переведён на «
          {getLangName(targetLang)}» в реальном времени.
        </p>
      </div>
    </>
  )
}
