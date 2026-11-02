import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cssOrder.ts'
import App from './App.tsx'
import { applyGuestDesign } from './utils/guestDesign'
import { applyGuestSeason } from './utils/guestSeason'
import { initTelegramWebApp } from './utils/telegramBoot'

applyGuestSeason(applyGuestDesign())
initTelegramWebApp()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
