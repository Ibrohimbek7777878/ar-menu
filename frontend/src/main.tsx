import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cssOrder.ts'
import App from './App.tsx'
import { applyGuestDesign } from './utils/guestDesign'
import { applyGuestMotion } from './utils/guestMotion'
import { applyGuestSeason } from './utils/guestSeason'
import { initTelegramWebApp } from './utils/telegramBoot'

const guestDesign = applyGuestDesign()
applyGuestSeason(guestDesign)
applyGuestMotion(guestDesign)
initTelegramWebApp()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
