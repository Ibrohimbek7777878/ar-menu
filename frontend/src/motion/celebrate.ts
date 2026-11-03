// "Buyurtma yuborildi" kutlovi: daraja `full` va WebGL bo'lsa 3D (three.js), aks holda yengil 2D konfetti.
// Xato bo'lsa ham jim: buyurtma oqimini hech qachon to'xtatmaydi.
import { confettiBurst } from './fx'
import { fxEnabled, threeEnabled } from './env'

export async function celebrateOrder(anchor: Element | null = null): Promise<void> {
  if (!fxEnabled()) return
  if (threeEnabled()) {
    try {
      const { playCelebration } = await import('./three/celebrationScene')
      await playCelebration()
      return
    } catch {
      // 3D bo'lmadi: pastdagi 2D zaxira
    }
  }
  confettiBurst(anchor)
}
