// Buyurtma holati sahnalari (A qatlami, SVG + CSS, three.js yo'q): har holatning o'z harakati bor.
//   pending -> soat, confirmed -> hujjat ✓, preparing -> bug'li qozon, ready -> qo'ng'iroq,
//   out_for_delivery -> yo'ldagi belgi, delivered -> ✓ chizilgan halqa.
// `key={status}` holat o'zgarganda sahnani qayta o'ynatadi. Daraja va `prefers-reduced-motion` styles/fx.css da.
import { t, tr } from '../i18n'

export type OrderStatusKey = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered'

// Modul darajasida: `tr` faqat belgilaydi, tarjima ko'rsatishda `t(LABELS[status])` bilan (til almashganda eskirmasin)
const LABELS: Record<OrderStatusKey, string> = {
  pending: tr('Buyurtma kutilmoqda'),
  confirmed: tr('Buyurtma tasdiqlandi'),
  preparing: tr('Buyurtma tayyorlanmoqda'),
  ready: tr('Buyurtma tayyor'),
  out_for_delivery: tr("Buyurtma yo'lda"),
  delivered: tr('Buyurtma yetkazildi'),
}

function Scene({ status }: { status: OrderStatusKey }) {
  switch (status) {
    case 'pending':
      return (
        <>
          <circle className="paper" cx="48" cy="48" r="28" />
          <line className="line hand-h pivot" x1="48" y1="48" x2="60" y2="48" />
          <line className="line hand-m pivot" x1="48" y1="48" x2="48" y2="30" />
          <circle className="solid" cx="48" cy="48" r="3.5" />
        </>
      )
    case 'confirmed':
      return (
        <>
          <rect className="paper rise" x="26" y="22" width="44" height="56" rx="8" />
          <rect className="solid" x="38" y="16" width="20" height="11" rx="4" />
          <path className="muted" d="M36 68h24" />
          <path className="ok draw" pathLength={1} d="M35 49l9 9 17-18" />
        </>
      )
    case 'preparing':
      return (
        <>
          <path className="flame solid" d="M40 90c-3-6 2-8 3-13 4 3 3 8 5 6 2-3 1-6 3-9 3 5 6 9 3 16z" opacity="0.9" />
          <path className="steam s1" d="M36 42c-4-5 4-8 0-13" />
          <path className="steam s2" d="M48 40c-4-5 4-8 0-14" />
          <path className="steam s3" d="M60 42c-4-5 4-8 0-13" />
          <path className="solid" d="M24 52h48v16a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z" />
          <path className="line" d="M24 57h-7M72 57h7" />
          <g className="lid">
            <path className="line" style={{ stroke: 'var(--brand-deep)', strokeWidth: 5 }} d="M25 52h46" />
            <circle className="deep" cx="48" cy="47" r="3.5" />
          </g>
        </>
      )
    case 'ready':
      return (
        <>
          <path className="spark a" d="M20 30v9M15.5 34.5h9" />
          <path className="spark b" d="M76 22v9M71.5 26.5h9" />
          <path className="spark c" d="M78 54v7M74.5 57.5h7" />
          <g className="bell hang">
            <path className="solid" d="M29 64c0-5 5-7 5-20a14 14 0 0 1 28 0c0 13 5 15 5 20z" />
            <rect className="deep" x="42" y="66" width="12" height="6" rx="3" />
          </g>
          <circle className="deep" cx="48" cy="24" r="3.5" />
        </>
      )
    case 'out_for_delivery':
      return (
        <>
          <path className="route" d="M12 80c14-3 20-14 33-14s20 11 39 6" />
          <g className="pin">
            <path className="solid" d="M48 12c-9.5 0-17 7.4-17 17 0 12.5 17 29 17 29s17-16.5 17-29c0-9.600-7.5-17-17-17z" />
            <circle fill="#fff" cx="48" cy="29" r="6.5" />
          </g>
        </>
      )
    case 'delivered':
      return (
        <>
          <circle className="ok draw" pathLength={1} cx="48" cy="48" r="30" style={{ fill: 'var(--status-success-light)' }} />
          <path className="ok draw" pathLength={1} style={{ animationDelay: '0.55s' }} d="M34 49l10 10 19-21" />
        </>
      )
  }
}

export function StatusScene({ status, size = 96 }: { status: OrderStatusKey; size?: number }) {
  return (
    <svg
      key={status}
      className={`fx-scene fx-scene-${status}`}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={t(LABELS[status])}
    >
      <circle className="bg" cx="48" cy="48" r="46" />
      <Scene status={status} />
    </svg>
  )
}
