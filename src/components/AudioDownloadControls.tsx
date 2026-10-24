import { useState } from 'react'
import type { LangCode } from '../types'
import {
  downloadTranslationAudio,
  isAudioDownloadSupported,
  type AudioFormat,
} from '../services/audioDownload'

interface AudioDownloadControlsProps {
  text: string
  lang: LangCode
  onToast: (msg: string) => void
  /** Компактный вид в panel-actions или полная кнопка под панелью */
  variant?: 'panel' | 'block'
}

export function AudioDownloadControls({
  text,
  lang,
  onToast,
  variant = 'block',
}: AudioDownloadControlsProps) {
  const [format, setFormat] = useState<AudioFormat>('mp3')
  const [busy, setBusy] = useState(false)
  const supported = isAudioDownloadSupported()
  const canDownload = Boolean(text.trim()) && supported && !busy

  const handleDownload = async () => {
    if (!text.trim()) {
      onToast('Нет перевода для скачивания')
      return
    }

    setBusy(true)
    onToast('Готовим аудиофайл…')
    try {
      const result = await downloadTranslationAudio(text, lang, format)
      if (result.fallbackFromM4a) {
        onToast('M4A недоступен в этом браузере — сохранён MP3')
      } else {
        onToast(`Аудио сохранено (${result.format.toUpperCase()})`)
      }
    } catch (e) {
      console.error(e)
      onToast(e instanceof Error ? e.message : 'Не удалось скачать аудио')
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  if (variant === 'panel') {
    return (
      <div className="audio-download audio-download--panel">
        <label className="audio-download-format">
          <span className="sr-only">Формат аудио</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as AudioFormat)}
            aria-label="Формат аудиофайла"
            disabled={busy}
          >
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
          </select>
        </label>
        <button
          type="button"
          className="icon-btn"
          title={`Скачать аудио (${format.toUpperCase()})`}
          aria-label={`Скачать аудио перевода в формате ${format.toUpperCase()}`}
          disabled={!canDownload}
          onClick={() => void handleDownload()}
        >
          {busy ? '…' : '⬇️'}
        </button>
      </div>
    )
  }

  return (
    <div className="audio-download audio-download--block">
      <label className="audio-download-format">
        <span>Формат</span>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as AudioFormat)}
          aria-label="Формат аудиофайла"
          disabled={busy}
        >
          <option value="mp3">MP3</option>
          <option value="m4a">M4A</option>
        </select>
      </label>
      <button
        type="button"
        className="download-audio-btn"
        disabled={!canDownload}
        onClick={() => void handleDownload()}
        aria-label={`Скачать аудио перевода в формате ${format.toUpperCase()}`}
      >
        {busy ? '⏳ Сохранение…' : `⬇️ Скачать аудио (${format.toUpperCase()})`}
      </button>
    </div>
  )
}
