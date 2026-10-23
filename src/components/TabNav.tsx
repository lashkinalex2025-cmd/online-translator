import type { AppTab } from '../types'

const TABS: { id: AppTab; icon: string; label: string }[] = [
  { id: 'translate', icon: '📝', label: 'Текст' },
  { id: 'voice', icon: '🎙️', label: 'Голос' },
  { id: 'history', icon: '🕒', label: 'История' },
  { id: 'favorites', icon: '⭐', label: 'Избранное' },
]

interface TabNavProps {
  active: AppTab
  onChange: (tab: AppTab) => void
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label="Навигация">
      <div className="tab-nav-inner">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn${active === tab.id ? ' active' : ''}`}
            onClick={() => onChange(tab.id)}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            <span className="icon" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
