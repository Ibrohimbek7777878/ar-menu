import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cssOrder.ts'
import App from './App.tsx'
import { applyGuestDesign } from './utils/guestDesign'
import { applyGuestMotion } from './utils/guestMotion'
import { applyGuestSeason } from './utils/guestSeason'
import { applyGuestTheme } from './utils/guestTheme'
import { initLang } from './i18n'
import { initTelegramWebApp } from './utils/telegramBoot'

const guestDesign = applyGuestDesign()
applyGuestSeason(guestDesign)
applyGuestMotion(guestDesign)
applyGuestTheme(guestDesign)
initTelegramWebApp()


// Tanlangan tilning lug'ati yuklangach chiziladi (o'zbekcha yonib o'chib qolmasin); yuklanmasa o'zbekcha ochiladi
initLang(window.__GULISTON_SESSION__?.languages).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
