interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo" aria-hidden="true">
          🌐
        </div>
        <h1>Онлайн Переводчик</h1>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  )
}
