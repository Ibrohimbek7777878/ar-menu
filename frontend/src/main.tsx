import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cssOrder.ts'
import App from './App.tsx'
import { applyGuestDesign } from './utils/guestDesign'

applyGuestDesign()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
