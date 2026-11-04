import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cssOrder.ts'
import App from './App.tsx'
import { applyBrand } from './utils/brand'
import { applyGuestDesign } from './utils/guestDesign'
import { applyGuestMotion } from './utils/guestMotion'
import { applyGuestPalette } from './utils/guestPalette'
import { applyGuestSeason } from './utils/guestSeason'
import { applyGuestTheme } from './utils/guestTheme'
import { initLang } from './i18n'
import { initTelegramWebApp } from './utils/telegramBoot'

// Dizayn (tartib: new/classic) va palitra (ranglar: classic/orange) — ikki alohida sozlama. Palitra eng birinchi: mavzu va fasl undan keyin.
// Egasi qarori: animatsiya, kun/tun, fasl, taom oynasi dizayn tartibiga bog'liq emas — har ikkala tartibda ishlaydi.
applyGuestDesign()
applyGuestPalette()
// Brend (/ra/ -> Brend): <title>, favicon va sarlavha shrifti (`data-font`); brend yo'q bo'lsa hech narsaga tegmaydi (fasl `custom` palitrada qo'yilmaydi: guestSeason.ts)
applyBrand()
applyGuestSeason()
applyGuestMotion()
// Telegram boshlang'ich rangi mavzudan OLDIN: aks holda tun rejimida Telegram sarlavhasini (guestTheme qo'ygan to'q rang) oq bilan bosib ketardi
initTelegramWebApp()
applyGuestTheme()


// Tanlangan tilning lug'ati yuklangach chiziladi (o'zbekcha yonib o'chib qolmasin); yuklanmasa o'zbekcha ochiladi
initLang(window.__GULISTON_SESSION__?.languages).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
