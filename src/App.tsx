import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { LanguageBar } from './components/LanguageBar'
import { TranslatePanel } from './components/TranslatePanel'
import { VoicePanel } from './components/VoicePanel'
import { RecordsList } from './components/RecordsList'
import { TabNav } from './components/TabNav'
import { SplashScreen } from './components/SplashScreen'
import { Footer } from './components/Footer'
import { useTheme } from './hooks/useTheme'
import { createDebouncedTranslate, translateText } from './services/translate'
import {
  ContinuousSpeechRecognizer,
  isSpeechRecognitionSupported,
} from './services/speech'
import {
  detectLanguage,
  detectLanguageQuick,
} from './services/detectLanguage'
import {
  addFavorite,
  addToHistory,
  clearHistory,
  deleteRecord,
  getFavorites,
  getHistory,
  toggleFavorite,
} from './services/storage'
import { getLangName, guessSpeechLangFromBrowser } from './constants/languages'
import type {
  AppTab,
  LangCode,
  SourceLang,
  TranslationRecord,
  VoiceStatus,
} from './types'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState<AppTab>('translate')

  const [sourceLang, setSourceLang] = useState<SourceLang>('auto')
  const [targetLang, setTargetLang] = useState<LangCode>('en')
  const [detectedLang, setDetectedLang] = useState<LangCode | null>(null)
  const [detectingLang, setDetectingLang] = useState(false)
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFavoriteId, setCurrentFavoriteId] = useState<string | null>(null)

  const [history, setHistory] = useState<TranslationRecord[]>([])
  const [favorites, setFavorites] = useState<TranslationRecord[]>([])

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceInterim, setVoiceInterim] = useState('')
  const [voiceFinal, setVoiceFinal] = useState('')
  const [voiceTranslated, setVoiceTranslated] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedTranslate = useMemo(() => createDebouncedTranslate(450), [])
  const recognizer = useRef(new ContinuousSpeechRecognizer())
  const lastSavedHash = useRef('')
  const langsRef = useRef({ sourceLang, targetLang, detectedLang })
  const lastAnnouncedDetect = useRef<LangCode | null>(null)

  langsRef.current = { sourceLang, targetLang, detectedLang }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const refreshLists = useCallback(async () => {
    const [h, f] = await Promise.all([getHistory(), getFavorites()])
    setHistory(h)
    setFavorites(f)
  }, [])

  useEffect(() => {
    void refreshLists()
  }, [refreshLists])

  useEffect(() => {
    return () => {
      recognizer.current.stop()
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (textDetectTimer.current) clearTimeout(textDetectTimer.current)
    }
  }, [])

  const saveTranslation = useCallback(
    async (src: string, dst: string, from: LangCode, to: LangCode) => {
      const hash = `${from}|${to}|${src}|${dst}`
      if (!src.trim() || !dst.trim() || hash === lastSavedHash.current) return
      lastSavedHash.current = hash
      await addToHistory({
        sourceText: src.trim(),
        translatedText: dst.trim(),
        sourceLang: from,
        targetLang: to,
      })
      await refreshLists()
    },
    [refreshLists],
  )

  const resolveSourceLang = useCallback(
    async (text: string, mode: SourceLang): Promise<LangCode> => {
      if (mode !== 'auto') return mode
      setDetectingLang(true)
      try {
        const quick = detectLanguageQuick(text)
        if (quick) {
          setDetectedLang(quick)
          return quick
        }
        const result = await detectLanguage(text)
        setDetectedLang(result.lang)
        return result.lang
      } finally {
        setDetectingLang(false)
      }
    },
    [],
  )

  const onTextInput = useCallback(
    (text: string) => {
      setSourceText(text)
      setCurrentFavoriteId(null)
      setError(null)

      if (!text.trim()) {
        setTranslatedText('')
        setLoading(false)
        if (sourceLang === 'auto') setDetectedLang(null)
        return
      }

      if (sourceLang === 'auto') {
        const quick = detectLanguageQuick(text)
        if (quick) setDetectedLang(quick)

        if (textDetectTimer.current) clearTimeout(textDetectTimer.current)
        setLoading(true)
        textDetectTimer.current = setTimeout(() => {
          void (async () => {
            try {
              const from = await resolveSourceLang(text, 'auto')
              if (from === targetLang) {
                setTranslatedText(text)
                return
              }
              const result = await translateText(text, from, targetLang)
              setTranslatedText(result)
              void saveTranslation(text, result, from, targetLang)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Ошибка перевода')
            } finally {
              setLoading(false)
            }
          })()
        }, 500)
        return
      }

      if (sourceLang === targetLang) {
        setTranslatedText(text)
        setLoading(false)
        return
      }

      debouncedTranslate(
        text,
        sourceLang,
        targetLang,
        (result) => {
          setTranslatedText(result)
          void saveTranslation(text, result, sourceLang, targetLang)
        },
        (err) => setError(err),
        setLoading,
      )
    },
    [
      sourceLang,
      targetLang,
      resolveSourceLang,
      debouncedTranslate,
      saveTranslation,
    ],
  )

  // Re-translate when languages change
  useEffect(() => {
    if (!sourceText.trim()) return
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const from = await resolveSourceLang(sourceText, sourceLang)
        if (from === targetLang) {
          setTranslatedText(sourceText)
          return
        }
        const result = await translateText(sourceText, from, targetLang)
        setTranslatedText(result)
        void saveTranslation(sourceText, result, from, targetLang)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка перевода')
      } finally {
        setLoading(false)
      }
    })()
    // intentionally only on language change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang])

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      showToast('Выберите конкретный исходный язык для обмена')
      return
    }
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
    setDetectedLang(null)
    setCurrentFavoriteId(null)
  }

  const handleSwapTexts = () => {
    if (sourceLang === 'auto') {
      showToast('Выберите конкретный исходный язык для обмена')
      return
    }
    if (!translatedText.trim() && !sourceText.trim()) {
      showToast('Нечего менять')
      return
    }
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
    setDetectedLang(null)
    setCurrentFavoriteId(null)
  }

  const handleClear = () => {
    setSourceText('')
    setTranslatedText('')
    setError(null)
    setDetectedLang(null)
    setCurrentFavoriteId(null)
  }

  const handleCopy = async () => {
    if (!translatedText.trim()) {
      showToast('Нечего копировать')
      return
    }
    try {
      await navigator.clipboard.writeText(translatedText)
      showToast('Скопировано')
    } catch {
      showToast('Не удалось скопировать')
    }
  }

  const handleToggleCurrentFavorite = async () => {
    if (!sourceText.trim() || !translatedText.trim()) {
      showToast('Сначала сделайте перевод')
      return
    }

    const from = sourceLang === 'auto' ? detectedLang ?? 'en' : sourceLang

    if (currentFavoriteId) {
      await toggleFavorite(currentFavoriteId)
      setCurrentFavoriteId(null)
      showToast('Убрано из избранного')
      await refreshLists()
      return
    }

    const record = await addFavorite({
      sourceText: sourceText.trim(),
      translatedText: translatedText.trim(),
      sourceLang: from,
      targetLang,
      favorite: true,
    })
    setCurrentFavoriteId(record.id)
    showToast('Добавлено в избранное')
    await refreshLists()
  }

  const applyDetectedSpeechLang = useCallback(
    (lang: LangCode, announce: boolean) => {
      setDetectedLang(lang)
      if (recognizer.current.language !== lang) {
        recognizer.current.setLanguage(lang)
      }
      if (announce && lastAnnouncedDetect.current !== lang) {
        lastAnnouncedDetect.current = lang
        showToast(`Язык говорящего: ${getLangName(lang)}`)
      }
    },
    [showToast],
  )

  const translateVoiceChunk = useCallback(
    async (chunk: string) => {
      const { sourceLang: fromMode, targetLang: to } = langsRef.current
      if (!chunk.trim()) return
      setVoiceStatus('translating')
      try {
        let from: LangCode
        if (fromMode === 'auto') {
          setDetectingLang(true)
          const quick = detectLanguageQuick(chunk)
          if (quick) {
            from = quick
            applyDetectedSpeechLang(quick, true)
          } else {
            const result = await detectLanguage(chunk)
            from = result.lang
            applyDetectedSpeechLang(result.lang, true)
          }
          setDetectingLang(false)
        } else {
          from = fromMode
        }

        const result = from === to ? chunk : await translateText(chunk, from, to)
        setVoiceTranslated((prev) =>
          (prev ? `${prev} ${result}` : result).trim(),
        )
        void saveTranslation(chunk, result, from, to)
        setVoiceStatus('listening')
      } catch (e) {
        setDetectingLang(false)
        setVoiceError(e instanceof Error ? e.message : 'Ошибка перевода')
        setVoiceStatus('listening')
      }
    },
    [saveTranslation, applyDetectedSpeechLang],
  )

  const startVoice = async () => {
    setVoiceError(null)
    setVoiceInterim('')
    setVoiceFinal('')
    setVoiceTranslated('')
    lastAnnouncedDetect.current = null
    if (sourceLang === 'auto') setDetectedLang(null)

    if (!isSpeechRecognitionSupported()) {
      setVoiceStatus('error')
      setVoiceError(
        'Распознавание речи не поддерживается. Используйте Chrome или Edge.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setVoiceStatus('error')
      setVoiceError(
        'Микрофон недоступен или доступ запрещён. Разрешите микрофон в настройках.',
      )
      return
    }

    const initialLang: LangCode =
      sourceLang === 'auto'
        ? detectedLang ?? guessSpeechLangFromBrowser()
        : sourceLang

    setVoiceStatus('listening')

    recognizer.current.start(initialLang, {
      onInterim: (text) => {
        setVoiceInterim(text)
        if (langsRef.current.sourceLang === 'auto') {
          const quick = detectLanguageQuick(text)
          if (quick) applyDetectedSpeechLang(quick, false)
        }
      },
      onFinal: (text) => {
        setVoiceFinal((prev) => (prev ? `${prev} ${text}` : text).trim())
        setVoiceInterim('')
        void translateVoiceChunk(text)
      },
      onError: (msg) => {
        if (msg) {
          setVoiceError(msg)
          if (msg.includes('запрещён') || msg.includes('недоступен')) {
            setVoiceStatus('error')
            recognizer.current.stop()
          }
        }
      },
      onEnd: () => {
        setVoiceStatus((s) =>
          s === 'listening' || s === 'translating' ? 'stopped' : s,
        )
      },
    })
  }

  const stopVoice = () => {
    recognizer.current.stop()
    setVoiceStatus('stopped')
    setVoiceInterim('')
    setDetectingLang(false)
  }

  const openRecord = (record: TranslationRecord) => {
    setSourceLang(record.sourceLang)
    setTargetLang(record.targetLang)
    setSourceText(record.sourceText)
    setTranslatedText(record.translatedText)
    setDetectedLang(record.sourceLang)
    setCurrentFavoriteId(record.favorite ? record.id : null)
    setTab('translate')
    showToast('Перевод открыт')
  }

  const handleDelete = async (id: string) => {
    await deleteRecord(id)
    if (currentFavoriteId === id) setCurrentFavoriteId(null)
    await refreshLists()
    showToast('Удалено')
  }

  const handleToggleFavorite = async (id: string) => {
    const updated = await toggleFavorite(id)
    if (updated && currentFavoriteId === id && !updated.favorite) {
      setCurrentFavoriteId(null)
    }
    if (updated?.favorite) setCurrentFavoriteId(id)
    await refreshLists()
    showToast(updated?.favorite ? 'В избранном' : 'Убрано из избранного')
  }

  const handleClearHistory = async () => {
    await clearHistory()
    await refreshLists()
    showToast('История очищена')
  }

  return (
    <>
      <SplashScreen />
      <div className="app">
        <Header theme={theme} onToggleTheme={toggleTheme} />

        {(tab === 'translate' || tab === 'voice') && (
          <LanguageBar
            sourceLang={sourceLang}
            targetLang={targetLang}
            detectedLang={detectedLang}
            onSourceChange={(lang) => {
              setSourceLang(lang)
              if (lang !== 'auto') setDetectedLang(null)
              lastAnnouncedDetect.current = null
            }}
            onTargetChange={setTargetLang}
            onSwap={handleSwapLanguages}
          />
        )}

        {tab === 'translate' && (
          <TranslatePanel
            sourceText={sourceText}
            translatedText={translatedText}
            sourceLang={sourceLang}
            targetLang={targetLang}
            detectedLang={detectedLang}
            loading={loading || detectingLang}
            error={error}
            isFavorite={Boolean(currentFavoriteId)}
            onSourceChange={onTextInput}
            onClear={handleClear}
            onCopy={handleCopy}
            onSwapTexts={handleSwapTexts}
            onToggleFavorite={handleToggleCurrentFavorite}
            onToast={showToast}
          />
        )}

        {tab === 'voice' && (
          <VoicePanel
            status={voiceStatus}
            interimText={voiceInterim}
            finalText={voiceFinal}
            translatedText={voiceTranslated}
            error={voiceError}
            sourceLang={sourceLang}
            targetLang={targetLang}
            detectedLang={detectedLang}
            detecting={detectingLang}
            supported={isSpeechRecognitionSupported()}
            onStart={startVoice}
            onStop={stopVoice}
            onToast={showToast}
          />
        )}

        {tab === 'history' && (
          <RecordsList
            title="История"
            records={history}
            emptyEmoji="🕒"
            emptyText="История переводов пуста"
            showClear
            onClear={handleClearHistory}
            onOpen={openRecord}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {tab === 'favorites' && (
          <RecordsList
            title="Избранное"
            records={favorites}
            emptyEmoji="⭐"
            emptyText="Пока нет избранных переводов"
            onOpen={openRecord}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <Footer />
      </div>

      <TabNav active={tab} onChange={setTab} />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}
