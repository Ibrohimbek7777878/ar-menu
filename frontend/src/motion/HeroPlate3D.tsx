// Welcome sahifa 3D sahnasi (B qatlami) uchun React o'rami. three.js `import()` bilan, kerak bo'lganda yuklanadi.
// `fallback` (hozirgi CSS sahna) three tayyor bo'lguncha ko'rinib turadi va sahna tayyor bo'lgach silliq almashadi;
// WebGL yo'q / daraja `full` emas / zaif qurilma / xato bo'lsa fallback o'zi qoladi (hech narsa buzilmaydi).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { threeEnabled } from './env'

export function HeroPlate3D({ fallback, photoUrl, className = '' }: { fallback: ReactNode; photoUrl?: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !threeEnabled()) return
    let cancelled = false
    let handle: { dispose: () => void } | null = null
    import('./three/heroPlateScene')
      .then(({ mountHeroPlate }) => {
        if (cancelled) return
        handle = mountHeroPlate(host, {
          photoUrl,
          onReady: () => setReady(true),
          onDegrade: () => {
            setReady(false)
            handle?.dispose()
            handle = null
          },
        })
      })
      .catch(() => undefined) // three yuklanmadi / WebGL xato: zaxira (CSS) ko'rinib turadi
    return () => {
      cancelled = true
      handle?.dispose()
      handle = null
    }
  }, [photoUrl])

  return (
    <div ref={hostRef} className={`mx-hero3d ${className}`.trim()} data-ready={ready} aria-hidden="true">
      <div className="mx-fallback">{fallback}</div>
    </div>
  )
}
