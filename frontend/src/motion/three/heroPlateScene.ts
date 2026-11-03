// B qatlami (three.js): welcome sahifasi uchun aylanuvchi 3D likopcha, ustida taom va ko'tarilayotgan bug'.
// Bu fayl FAQAT `import()` bilan, kerak bo'lganda yuklanadi (alohida bo'lak): asosiy to'plam hajmiga ta'sir qilmaydi.
// Rasmsiz ham ishlaydi (taom teksturasi kodda chiziladi); `photoUrl` bo'lsa, taom o'rniga haqiqiy rasm likopchaga yoyiladi.
// Resurs qoidalari: DPR <= 1.5, ekrandan chiqsa yoki varaq yashirilsa to'xtaydi, sekin qurilmada avval DPR=1, keyin zaxiraga
// (CSS) qaytadi, `dispose()` hamma narsani bo'shatadi (geometriya, material, tekstura, WebGL kontekst).
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three'
import { brandPalette } from '../env'

export interface HeroPlateOptions {
  photoUrl?: string
  onReady?: () => void
  onDegrade?: () => void
}

export interface HeroPlateHandle {
  dispose: () => void
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Kodda chizilgan "palov" teksturasi: oltin guruch, sabzi bo'laklari, mayiz (rasm bo'lmaganda). */
function foodTexture(): CanvasTexture {
  return canvasTexture(512, (ctx, s) => {
    const base = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.55)
    base.addColorStop(0, '#F4BE55')
    base.addColorStop(1, '#D98A24')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, s, s)
    const rand = (n: number) => Math.random() * n
    const stroke = (count: number, rx: number, ry: number, color: string) => {
      for (let i = 0; i < count; i++) {
        ctx.save()
        ctx.translate(rand(s), rand(s))
        ctx.rotate(rand(Math.PI))
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
    stroke(1500, 7, 2.4, 'rgba(255, 244, 214, 0.75)')   // guruch
    stroke(190, 9, 3.4, 'rgba(226, 105, 31, 0.9)')      // sabzi
    stroke(60, 4.5, 3.5, 'rgba(92, 48, 24, 0.85)')      // mayiz / ziravor
  })
}

function softPuff(): CanvasTexture {
  return canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.95)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

function contactShadow(): CanvasTexture {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(60, 28, 8, 0.42)')
    g.addColorStop(1, 'rgba(60, 28, 8, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

export function mountHeroPlate(container: HTMLElement, options: HeroPlateOptions = {}): HeroPlateHandle {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr)
  const canvas = renderer.domElement
  container.appendChild(canvas)

  const scene = new Scene()
  const camera = new PerspectiveCamera(26, 1, 0.1, 50)
  camera.position.set(0, 5.4, 7.6)
  camera.lookAt(0, 0.2, 0)

  scene.add(new HemisphereLight(0xfff1e0, 0xb98a63, 1.5))
  const key = new DirectionalLight(0xffffff, 2.1)
  key.position.set(3, 6, 4)
  scene.add(key)
  const rim = new DirectionalLight(0xffc89a, 1.1)
  rim.position.set(-4, 2.5, -3)
  scene.add(rim)

  const disposables: Array<{ dispose: () => void }> = []
  const own = <T extends BufferGeometry | Material | Texture>(item: T): T => {
    disposables.push(item)
    return item
  }

  // Yumshoq soya (likopcha ostida)
  const shadow = new Mesh(
    own(new PlaneGeometry(4.6, 4.6)),
    own(new MeshBasicMaterial({ map: own(contactShadow()), transparent: true, depthWrite: false })),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -0.01
  scene.add(shadow)

  const tilt = new Group()
  const plate = new Group()
  tilt.add(plate)
  scene.add(tilt)

  const photoMode = Boolean(options.photoUrl)
  const ringMaterial = own(new MeshStandardMaterial({ color: new Color(brandPalette()[0]), roughness: 0.45 }))
  const ceramic = own(new MeshStandardMaterial({ color: 0xfffaf4, roughness: 0.3, metalness: 0.02 }))
  if (photoMode) {
    // Haqiqiy taom rasmi bor: yupqa dumaloq lagan, ustida rasm (asosiy narsa rasm, likopcha emas)
    const tray = new Mesh(own(new CylinderGeometry(1.5, 1.5, 0.16, 96)), ceramic)
    tray.position.y = 0.08
    plate.add(tray)
    const trayRim = new Mesh(own(new TorusGeometry(1.5, 0.028, 12, 96)), ringMaterial)
    trayRim.rotation.x = Math.PI / 2
    trayRim.position.y = 0.16
    plate.add(trayRim)
  } else {
    // Rasm yo'q: likopcha (profili aylantirib yasaladi: x = radius, y = balandlik) va ustida kodda chizilgan palov
    const profile = [
      [0, 0], [0.8, 0], [1.2, 0.04], [1.55, 0.2], [1.64, 0.27], [1.61, 0.3], [1.5, 0.28], [1.2, 0.13], [0.9, 0.09], [0, 0.09],
    ].map(([x, y]) => new Vector2(x, y))
    plate.add(new Mesh(own(new LatheGeometry(profile, 72)), ceramic))
    const ring = new Mesh(own(new TorusGeometry(1.5, 0.026, 12, 96)), ringMaterial)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.27
    plate.add(ring)
  }

  // Taom: rasm bo'lsa tekis disk (rangi aslidek: yoritish va ton o'zgartirishsiz), bo'lmasa guruch uyumi
  let food: Mesh
  // Rasm berilgan bo'lsa: u yuklanmaguncha sahna ko'rsatilmaydi (CSS sahna turadi); yuklanmasa zaxiraga qaytamiz
  let photoPending = photoMode
  let foodMaterial: MeshStandardMaterial | null = null
  if (options.photoUrl) {
    const photoMaterial = own(new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))
    food = new Mesh(own(new CircleGeometry(1.42, 96)), photoMaterial)
    food.rotation.x = -Math.PI / 2
    food.position.y = 0.165
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      options.photoUrl,
      (photo) => {
        photo.colorSpace = SRGBColorSpace
        photo.anisotropy = 4
        own(photo)
        photoMaterial.map = photo
        photoMaterial.needsUpdate = true
        photoPending = false
      },
      undefined,
      () => degrade(), // rasm yuklanmadi: boshqa (soxta) taom emas, haqiqiy rasmli CSS sahna qoladi
    )
  } else {
    foodMaterial = own(new MeshStandardMaterial({ map: own(foodTexture()), roughness: 0.6 }))
    const dome = own(new SphereGeometry(1, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2))
    const pos = dome.attributes.position
    const uv = dome.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getZ(i) / 2 + 0.5)
    uv.needsUpdate = true
    food = new Mesh(dome, foodMaterial)
    food.scale.set(0.96, 0.5, 0.96)
    food.position.y = 0.09
    // Uyum ustiga go'sht va sabzi bo'laklari: oddiy "non"dan palovga o'xshatadi
    const meatMaterial = own(new MeshStandardMaterial({ color: 0x7a4426, roughness: 0.72 }))
    const carrotMaterial = own(new MeshStandardMaterial({ color: 0xe2691f, roughness: 0.6 }))
    const chunk = own(new SphereGeometry(0.15, 14, 10))
    const stick = own(new CylinderGeometry(0.028, 0.028, 0.26, 6))
    const onDome = (r: number) => 0.09 + 0.5 * Math.sqrt(Math.max(0, 1 - (r / 0.96) ** 2))
    const seed = [0.2, 1.4, 2.5, 3.6, 4.7, 5.6]
    seed.forEach((a, i) => {
      const r = 0.28 + (i % 3) * 0.2
      const meat = new Mesh(chunk, meatMaterial)
      meat.position.set(Math.cos(a) * r, onDome(r) + 0.05, Math.sin(a) * r)
      meat.scale.set(1.1, 0.8, 1)
      meat.rotation.y = a
      plate.add(meat)
    })
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3
      const r = 0.18 + ((i * 37) % 60) / 100
      const carrot = new Mesh(stick, carrotMaterial)
      carrot.position.set(Math.cos(a) * r, onDome(r) + 0.03, Math.sin(a) * r)
      carrot.rotation.set(Math.PI / 2 + 0.25 * Math.sin(i), a + i, 0.3 * Math.cos(i))
      plate.add(carrot)
    }
  }
  plate.add(food)

  // Bug': yumshoq sprite'lar tepaga ko'tarilib, kengayib, so'nadi
  const puff = own(softPuff())
  const steam = Array.from({ length: 12 }, (_, i) => {
    const material = own(new SpriteMaterial({ map: puff, color: 0xf1e2d2, transparent: true, depthWrite: false, opacity: 0 }))
    const sprite = new Sprite(material)
    scene.add(sprite)
    return { sprite, material, phase: i / 12, drift: Math.random() * Math.PI * 2, speed: 0.16 + Math.random() * 0.06, x: (Math.random() - 0.5) * 0.9 }
  })

  // Sichqoncha bilan yengil qiyalik (kompyuterda)
  let tiltX = 0
  let tiltZ = 0
  const onPointer = (event: PointerEvent) => {
    const r = container.getBoundingClientRect()
    tiltZ = -(((event.clientX - r.left) / r.width) * 2 - 1) * 0.12
    tiltX = (((event.clientY - r.top) / r.height) * 2 - 1) * 0.1
  }
  const onLeave = () => {
    tiltX = 0
    tiltZ = 0
  }
  container.addEventListener('pointermove', onPointer)
  container.addEventListener('pointerleave', onLeave)

  const resize = () => {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const resizeObserver = new ResizeObserver(() => {
    resize()
    if (!running) renderer.render(scene, camera)
  })
  resizeObserver.observe(container)

  // Sekinlik nazorati: ~45 kadr o'rtacha vaqti > 41 ms bo'lsa DPR=1, yana sekin bo'lsa zaxiraga qaytamiz
  let frames = 0
  let slow = 0
  let degraded = false
  const degrade = () => {
    if (degraded) return
    degraded = true
    stop()
    options.onDegrade?.()
  }

  let raf = 0
  let running = false
  let last = 0
  let ready = false
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    const t = now / 1000

    frames++
    if (dt > 0.041) slow++
    if (frames >= 45) {
      if (slow > 30) {
        if (dpr > 1) {
          dpr = 1
          renderer.setPixelRatio(1)
          resize()
        } else {
          degrade()
          return
        }
      }
      frames = 0
      slow = 0
    }

    // Rasmli rejimda rasm aylanib ketmaydi (o'qib bo'lmay qoladi): u yoqdan bu yoqqa yengil tebranadi
    if (photoMode) plate.rotation.y = Math.sin(t * 0.6) * 0.55
    else plate.rotation.y += dt * 0.42
    plate.position.y = Math.sin(t * 1.3) * 0.025
    tilt.rotation.x += (tiltX - tilt.rotation.x) * Math.min(1, dt * 4)
    tilt.rotation.z += (tiltZ - tilt.rotation.z) * Math.min(1, dt * 4)

    for (const s of steam) {
      const p = (t * s.speed + s.phase) % 1
      s.sprite.position.set(s.x + Math.sin(t * 0.9 + s.drift) * 0.18 * p, 0.55 + p * 1.9, Math.cos(s.drift) * 0.25)
      const scale = 0.6 + p * 1.0
      s.sprite.scale.set(scale, scale, 1)
      s.material.opacity = Math.sin(p * Math.PI) * (photoMode ? 0.4 : 0.62)
    }

    renderer.render(scene, camera)
    if (!ready && !photoPending) {
      ready = true
      options.onReady?.()
    }
  }

  let visible = true
  const start = () => {
    if (running || !visible || document.hidden || degraded) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true
    if (visible) start()
    else stop()
  })
  observer.observe(container)
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)
  const onContextLost = (event: Event) => {
    event.preventDefault()
    degrade()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  start()

  return {
    dispose() {
      stop()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      container.removeEventListener('pointermove', onPointer)
      container.removeEventListener('pointerleave', onLeave)
      disposables.forEach((item) => item.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
