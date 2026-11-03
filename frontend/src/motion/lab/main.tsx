// M0: animatsiya maketi. Haqiqiy tugma sinflari va haqiqiy src/motion kodi bilan, lekin ilovaga ULANMAGAN.
// Ochish: `npm run dev` -> /motion-lab.html. Mahsulot to'plamiga kirmaydi (vite faqat index.html ni yig'adi).
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import '../../styles/cssOrder.ts'
import '../fx.css'
import './lab.css'
import { flyToCart } from '../../utils/cartFly'
import {
  HeroPlate3D, StatusScene, bounceIcon, celebrateOrder, dangerPulse, motionLevel, pop, ringBell, rippleRings,
  setButtonState, spin3d, threeEnabled, webglSupported,
} from '../index'
import type { OrderStatusKey } from '../index'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const STATUSES: OrderStatusKey[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
const STATUS_LABEL: Record<OrderStatusKey, string> = {
  pending: 'Kutilmoqda', confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda', ready: 'Tayyor', out_for_delivery: "Yo'lda", delivered: 'Yetkazildi',
}
type Level = 'full' | 'light' | 'off'

/** "Rasm bilan" sinovi: kodda chizilgan rasm (haqiqiy taom rasmi o'rnida). */
function demoPhoto(): string {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 280)
  g.addColorStop(0, '#E8553A'); g.addColorStop(0.6, '#B8321F'); g.addColorStop(1, '#7A1F12')
  x.fillStyle = g; x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 90; i++) { x.fillStyle = i % 3 ? '#4C8B2B' : '#F6E7B4'; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 0, 7); x.fill() }
  return c.toDataURL('image/png')
}

function Lab() {
  const [level, setLevel] = useState<Level>('full')
  const [cart, setCart] = useState(0)
  const [photo, setPhoto] = useState<string | undefined>()
  const [armed, setArmed] = useState(false)
  const [service, setService] = useState('table')
  const [status, setStatus] = useState<OrderStatusKey>('preparing')
  const cartRef = useRef<HTMLSpanElement>(null)
  const bellRef = useRef<HTMLSpanElement>(null)
  const cubeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    document.documentElement.dataset.motion = level
  }, [level])
  const changeLevel = setLevel
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    flyToCart(e.currentTarget)
    setCart((n) => n + 1)
    setTimeout(() => pop(cartRef.current), 480)
  }
  const submit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget
    setButtonState(b, 'loading'); await sleep(1100)
    setButtonState(b, 'success'); void celebrateOrder(b); await sleep(2000)
    setButtonState(b, 'idle')
  }
  const fail = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget.closest('.lab-card')!.querySelector<HTMLButtonElement>('.btn-submit-order')!
    setButtonState(b, 'loading'); await sleep(700)
    setButtonState(b, 'error'); await sleep(1600)
    setButtonState(b, 'idle')
  }
  const callWaiter = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget
    setButtonState(b, 'loading'); await sleep(900)
    setButtonState(b, 'success'); ringBell(bellRef.current); rippleRings(b); await sleep(1900)
    setButtonState(b, 'idle')
  }
  const cancel = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget
    if (!armed) { setArmed(true); dangerPulse(b); setTimeout(() => setArmed(false), 3500); return }
    setArmed(false); setButtonState(b, 'loading'); await sleep(600)
    setButtonState(b, 'error'); await sleep(1500)
    setButtonState(b, 'idle')
  }
  const open360 = () => spin3d(cubeRef.current)
  const pickService = (key: string, icon: Element | null) => { setService(key); bounceIcon(icon) }
  const nextStatus = () => setStatus(STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length])

  return (
    <main className="lab">
      <h1>Animatsiya maketi</h1>
      <p className="lab-sub">M0: namuna. Ilovaga ulanmagan. Har tugmani bosib ko'ring: animatsiya shu tugma vazifasiga mos.</p>
      <div className="lab-bar">
        <div className="lab-seg" role="group" aria-label="Animatsiya darajasi">
          {(['full', 'light', 'off'] as Level[]).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => changeLevel(l)}>
              {l === 'full' ? "To'liq" : l === 'light' ? 'Yengil' : "O'chiq"}
            </button>
          ))}
        </div>
        <span className="lab-chip" data-ok={webglSupported()}>WebGL: {webglSupported() ? 'bor' : "yo'q"}</span>
        <span className="lab-chip" data-ok={threeEnabled()}>three.js: {threeEnabled() ? 'yoqilgan' : "o'chiq"}</span>
        <span className="lab-chip">Daraja: {motionLevel()}</span>
        {reduced && <span className="lab-chip">Tizimda "harakatni kamaytirish" yoniq</span>}
      </div>

      <div className="lab-grid">
        <section className="lab-card lab-wide">
          <span className="lab-tag b">B · THREE.JS</span>
          <h2>Welcome: aylanuvchi 3D likopcha va bug'</h2>
          <div className="lab-row">
            <div className="lab-seg" role="group" aria-label="Taom manbai">
              <button type="button" aria-pressed={!photo} onClick={() => setPhoto(undefined)}>Rasmsiz</button>
              <button type="button" aria-pressed={Boolean(photo)} onClick={() => setPhoto(demoPhoto())}>Rasm bilan (sinov)</button>
            </div>
          </div>
          <div className="lab-stage">
            <HeroPlate3D key={`${level}-${photo ? 'p' : 'n'}`} photoUrl={photo} fallback={<div className="lab-dish">P</div>} />
          </div>
          <p className="lab-note">To'liq darajada three.js; yengil/o'chiq yoki WebGL bo'lmasa hozirgi CSS sahna (sariq doira) qoladi. Sichqoncha bilan yengil qiyalik.</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag b">B · THREE.JS</span>
          <h2>Buyurtmani tasdiqlash</h2>
          <button type="button" className="btn-submit-order" onClick={submit}><span>Buyurtmani tasdiqlash</span></button>
          <button type="button" className="lab-btn ghost" onClick={fail}>Xato holatini ko'rsat</button>
          <p className="lab-note">Aylana → ✓ chiziladi → 3D konfetti va ✓ tanga. Yengil darajada 2D konfetti.</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag">A · YENGIL</span>
          <h2>Qo'shish</h2>
          <div className="lab-row">
            <div className="lab-dishcard">
              <b>Palov</b><span className="lab-price">45 000 so'm</span>
              <button type="button" className="btn-add-to-cart" onClick={add}><span>+ Qo'shish</span></button>
            </div>
            <span className="lab-cart" data-cart-target ref={cartRef}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 11.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.5L21 7H6" /></svg>
              <b>{cart}</b>
            </span>
          </div>
          <p className="lab-note">Taom savatga uchadi, savat sakraydi, son "pop" qiladi.</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag">A · YENGIL</span>
          <h2>Ofitsiantni chaqirish</h2>
          <div className="lab-row">
            <span className="lab-bell" ref={bellRef}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </span>
            <button type="button" className="btn-send-call" onClick={callWaiter}><span>Chaqiruvni yuborish</span></button>
          </div>
          <p className="lab-note">Yuborilgach qo'ng'iroq silkinadi va to'lqin halqalar tarqaladi.</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag">A · YENGIL</span>
          <h2>360° ko'rish</h2>
          <button type="button" className="lab-btn ghost" onClick={open360}>
            <svg ref={cubeRef} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M12 22V12M3 7l9 5 9-5" /></svg>
            360° ko'rish
          </button>
          <p className="lab-note">Ikonka 3D aylanadi (haqiqiy model-viewer ochilishidan oldin).</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag">A · YENGIL</span>
          <h2>Bekor qilish (ikki bosqichli)</h2>
          <button type="button" className="lab-btn danger" data-armed={armed} onClick={cancel}>{armed ? 'Aniq bekor qilaymi? Yana bosing' : 'Buyurtmani bekor qilish'}</button>
          <p className="lab-note">1-bosish: qizil puls. 2-bosish: ✕ chiziladi va tugma silkinadi.</p>
        </section>

        <section className="lab-card">
          <span className="lab-tag">A · YENGIL</span>
          <h2>Xizmat turi</h2>
          <div className="lab-svc">
            {[['table', 'Zalda', '🍽'], ['pickup', 'Olib ketish', '🛍'], ['delivery', 'Yetkazish', '🛵']].map(([key, label, icon]) => (
              <button key={key} type="button" aria-pressed={service === key} onClick={(e) => pickService(key, e.currentTarget.querySelector('span'))}>
                <span style={{ fontSize: 22 }}>{icon}</span>{label}
              </button>
            ))}
          </div>
        </section>

        <section className="lab-card lab-wide">
          <span className="lab-tag">A · YENGIL</span>
          <h2>Buyurtma holati</h2>
          <div className="lab-scenes">
            {STATUSES.map((s) => (
              <figure key={s}><StatusScene status={s} /><figcaption>{STATUS_LABEL[s]}</figcaption></figure>
            ))}
          </div>
          <div className="lab-row">
            <StatusScene status={status} size={72} />
            <button type="button" className="lab-btn ghost" onClick={nextStatus}>Keyingi holat: {STATUS_LABEL[STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]]}</button>
          </div>
        </section>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Lab /></StrictMode>)
