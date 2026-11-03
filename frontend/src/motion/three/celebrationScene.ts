// B qatlami (three.js): "Buyurtma yuborildi" kutlovi. Ekran ustida shaffof canvas: pastdan 3D konfetti otiladi,
// o'rtada ✓ bilan yashil tanga aylanib chiqadi va yo'qoladi (~2.6 s). Tugagach canvas va WebGL kontekst to'liq bo'shatiladi.
// Faqat `import()` bilan, buyurtma yuborilganda yuklanadi. Rang faqat tokenlardan (brandPalette).
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { brandPalette } from '../env'

const DURATION = 2.2
const COUNT = 110
const FOV = 40
const DISTANCE = 14

const easeOutBack = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

function checkFace(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const css = getComputedStyle(document.documentElement)
  const green = css.getPropertyValue('--status-success').trim() || '#16A34A'
  const g = ctx.createRadialGradient(size * 0.4, size * 0.35, size * 0.05, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#4ADE80')
  g.addColorStop(1, green)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 14
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 26
  ctx.lineCap = ctx.lineJoin = 'round'
  ctx.strokeStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(size * 0.3, size * 0.53)
  ctx.lineTo(size * 0.45, size * 0.68)
  ctx.lineTo(size * 0.72, size * 0.36)
  ctx.stroke()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function playCelebration(): Promise<void> {
  return new Promise((resolve) => {
    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(window.innerWidth, window.innerHeight)
    const canvas = renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999' })
    document.body.appendChild(canvas)

    const scene = new Scene()
    const camera = new PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 60)
    camera.position.set(0, 0, DISTANCE)
    scene.add(new HemisphereLight(0xffffff, 0xcaa98a, 1.6))
    const sun = new DirectionalLight(0xffffff, 2.2)
    sun.position.set(2, 5, 6)
    scene.add(sun)

    const viewH = 2 * Math.tan(MathUtils.degToRad(FOV / 2)) * DISTANCE
    const viewW = viewH * camera.aspect

    // Konfetti: bitta InstancedMesh, har bo'lakning o'z rangi, tezligi va aylanishi
    const geometry = new PlaneGeometry(0.17, 0.3)
    const material = new MeshLambertMaterial({ side: DoubleSide, transparent: true })
    const mesh = new InstancedMesh(geometry, material, COUNT)
    scene.add(mesh)
    const palette = brandPalette().map((c) => new Color(c))
    const dummy = new Object3D()
    const pieces = Array.from({ length: COUNT }, (_, i) => {
      mesh.setColorAt(i, palette[i % palette.length])
      return {
        x: (Math.random() - 0.5) * viewW * 0.25,
        y: -viewH / 2 - 0.3,
        z: (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * viewW * 0.9,
        vy: viewH * (0.8 + Math.random() * 0.55),
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        vrx: (Math.random() - 0.5) * 14,
        vry: (Math.random() - 0.5) * 14,
      }
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    // ✓ tanga: old va orqa yuzi ✓ chizilgan, aylanib chiqadi
    const faceTexture = checkFace()
    const coin = new Group()
    const body = new Mesh(new CylinderGeometry(0.95, 0.95, 0.18, 56).rotateX(Math.PI / 2), new MeshStandardMaterial({ color: 0x15803d, roughness: 0.4, metalness: 0.15 }))
    const faceGeometry = new CircleGeometry(0.93, 56)
    const faceMaterial = new MeshBasicMaterial({ map: faceTexture, transparent: true })
    const front = new Mesh(faceGeometry, faceMaterial)
    front.position.z = 0.095
    const back = new Mesh(faceGeometry, faceMaterial)
    back.position.z = -0.095
    back.rotation.y = Math.PI
    coin.add(body, front, back)
    coin.position.y = viewH * 0.12
    scene.add(coin)

    const t0 = performance.now()
    let last = t0
    let raf = 0
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      mesh.dispose()
      body.geometry.dispose()
      ;(body.material as MeshStandardMaterial).dispose()
      faceGeometry.dispose()
      faceMaterial.dispose()
      faceTexture.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      resolve()
    }
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const frame = (now: number) => {
      const age = (now - t0) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (age >= DURATION) return finish()

      const fade = MathUtils.clamp((DURATION - age) / 0.5, 0, 1)
      material.opacity = fade
      pieces.forEach((p, i) => {
        p.vy -= viewH * 1.15 * dt
        p.vx *= 1 - 0.7 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rx += p.vrx * dt
        p.ry += p.vry * dt
        dummy.position.set(p.x, p.y, p.z)
        dummy.rotation.set(p.rx, p.ry, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true

      // tanga: 0-0.55 s o'sib chiqadi, 1.5 s gacha aylanadi, oxirida kichrayib yo'qoladi
      const grow = MathUtils.clamp(age / 0.55, 0, 1)
      const shrink = MathUtils.clamp((DURATION - age) / 0.4, 0, 1)
      const s = Math.max(0.0001, easeOutBack(grow) * shrink)
      coin.scale.setScalar(s)
      coin.rotation.y = (1 - Math.pow(1 - MathUtils.clamp(age / 1.5, 0, 1), 3)) * Math.PI * 4
      coin.position.y = viewH * 0.12 + Math.sin(age * 2.2) * 0.06

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    window.setTimeout(finish, (DURATION + 1.5) * 1000) // fon varag'ida rAF to'xtasa ham tozalanadi
  })
}
