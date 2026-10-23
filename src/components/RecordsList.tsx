import type { TranslationRecord } from '../types'
import { getLangName } from '../constants/languages'

interface RecordsListProps {
  title: string
  records: TranslationRecord[]
  emptyEmoji: string
  emptyText: string
  showClear?: boolean
  onClear?: () => void
  onOpen: (record: TranslationRecord) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecordsList({
  title,
  records,
  emptyEmoji,
  emptyText,
  showClear,
  onClear,
  onOpen,
  onDelete,
  onToggleFavorite,
}: RecordsListProps) {
  return (
    <>
      <div className="list-toolbar">
        <h2>{title}</h2>
        {showClear && records.length > 0 && onClear && (
          <button type="button" className="btn-text" onClick={onClear}>
            Очистить всё
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="list-empty">
          <div className="emoji">{emptyEmoji}</div>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="list">
          {records.map((r) => (
            <div
              key={r.id}
              className="list-item"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(r)
                }
              }}
            >
              <div className="list-item-langs">
                {getLangName(r.sourceLang)} → {getLangName(r.targetLang)}
              </div>
              <div className="list-item-source">{r.sourceText}</div>
              <div className="list-item-target">{r.translatedText}</div>
              <div className="list-item-footer">
                <span className="list-item-date">{formatDate(r.createdAt)}</span>
                <div className="list-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="icon-btn"
                    title={r.favorite ? 'Убрать из избранного' : 'В избранное'}
                    aria-label={r.favorite ? 'Убрать из избранного' : 'В избранное'}
                    onClick={() => onToggleFavorite(r.id)}
                  >
                    {r.favorite ? '⭐' : '☆'}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Удалить"
                    aria-label="Удалить запись"
                    onClick={() => onDelete(r.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
