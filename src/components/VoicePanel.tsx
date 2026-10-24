import type { LangCode, SourceLang, VoiceStatus } from '../types'
import { getLangName } from '../constants/languages'
import { speakText, isTtsSupported } from '../services/tts'
import { AudioDownloadControls } from './AudioDownloadControls'

interface VoicePanelProps {
  status: VoiceStatus
  interimText: string
  finalText: string
  translatedText: string
  error: string | null
  sourceLang: SourceLang
  targetLang: LangCode
  detectedLang: LangCode | null
  detecting: boolean
  supported: boolean
  onStart: () => void
  onStop: () => void
  onToast: (msg: string) => void
}

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'Ожидание',
  listening: 'Слушаю…',
  translating: 'Идёт перевод…',
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
  detectedLang,
  detecting,
  supported,
  onStart,
  onStop,
  onToast,
}: VoicePanelProps) {
  const isActive = status === 'listening' || status === 'translating'
  const displaySource =
    finalText + (interimText ? (finalText ? ' ' : '') + interimText : '')
  const effectiveSource =
    sourceLang === 'auto' ? detectedLang ?? null : sourceLang
  const sourceLabel =
    sourceLang === 'auto'
      ? detectedLang
        ? `Авто: ${getLangName(detectedLang)}`
        : 'Определение языка'
      : getLangName(sourceLang)
  const ttsOk = isTtsSupported()
  const canSpeakTranslation = Boolean(translatedText.trim()) && ttsOk

  const handleSpeak = (text: string, lang: LangCode | null) => {
    if (!text.trim()) {
      onToast('Нет текста для озвучивания')
      return
    }
    if (!lang) {
      onToast('Язык текста ещё не определён')
      return
    }
    // Важно: speakText вызывается синхронно из обработчика нажатия (iOS/Android)
    void speakText(text, lang).catch((e: unknown) => {
      onToast(e instanceof Error ? e.message : 'Не удалось озвучить текст')
    })
  }

  return (
    <>
      <h2 className="section-title">Голосовой перевод</h2>

      <div className="status-line">
        {isActive && (
          <span
            className={`status-pill ${status === 'listening' ? 'listening' : 'translating'}`}
          >
            <span className="pulse-dot" />
            {STATUS_LABEL[status]}
          </span>
        )}
        {!isActive && status !== 'error' && (
          <span className="status-pill">
            {STATUS_LABEL[status === 'stopped' ? 'stopped' : 'idle']}
          </span>
        )}
        {detecting && (
          <span className="status-pill translating">
            <span className="pulse-dot" />
            Определение языка…
          </span>
        )}
        {sourceLang === 'auto' && detectedLang && !detecting && (
          <span className="status-pill detected">
            Язык: {getLangName(detectedLang)}
          </span>
        )}
      </div>

      {error && <div className="status-line error">{error}</div>}

      {!supported && (
        <div className="panel">
          <p>
            Распознавание речи не поддерживается в этом браузере. Откройте
            приложение в Chrome или Edge и разрешите доступ к микрофону.
          </p>
        </div>
      )}

      <div className="panel">
        <div className="panel-label">
          <span>Исходный текст ({sourceLabel})</span>
          {ttsOk && (
            <div className="panel-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label="Прослушать распознанный текст"
                onClick={() => handleSpeak(displaySource, effectiveSource)}
              >
                🔊
              </button>
            </div>
          )}
        </div>
        <div className={`output-text${displaySource ? '' : ' empty'}`}>
          {displaySource || 'Нажмите «Старт» и начните говорить…'}
        </div>
      </div>

      <div className="panel output">
        <div className="panel-label">
          <span>Перевод ({getLangName(targetLang)})</span>
          {ttsOk && (
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
          {translatedText || 'Здесь появится перевод'}
        </div>
        {ttsOk && (
          <button
            type="button"
            className="listen-btn"
            disabled={!canSpeakTranslation}
            onClick={() => handleSpeak(translatedText, targetLang)}
            aria-label="Прослушать перевод"
          >
            🔊 Прослушать перевод
          </button>
        )}
        <AudioDownloadControls
          text={translatedText}
          lang={targetLang}
          onToast={onToast}
          variant="block"
        />
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
          {sourceLang === 'auto'
            ? `Говорите на любом из поддерживаемых языков. Приложение определит язык и выполнит перевод на «${getLangName(targetLang)}».`
            : `Говорите на языке «${getLangName(sourceLang)}». Текст будет сразу переведён на «${getLangName(targetLang)}».`}
        </p>
      </div>
    </>
  )
}
