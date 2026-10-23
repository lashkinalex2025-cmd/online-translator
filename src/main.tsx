import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warmupTts } from './services/tts'

// Подготовка голосов заранее; на iOS окончательный unlock — по первому касанию
warmupTts()
const unlockOnce = () => {
  warmupTts()
  window.removeEventListener('touchstart', unlockOnce)
  window.removeEventListener('pointerdown', unlockOnce)
  window.removeEventListener('click', unlockOnce)
}
window.addEventListener('touchstart', unlockOnce, { once: true, passive: true })
window.addEventListener('pointerdown', unlockOnce, { once: true })
window.addEventListener('click', unlockOnce, { once: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
