import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-logo">🌐</div>
      <h1>Онлайн Переводчик</h1>
      <p>Текст и речь — мгновенно</p>
    </div>
  )
}
