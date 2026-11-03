// Matn daraxtini "tarjimaga tayyor" qiladi: obyektdagi har bir matn bargi o'qilganda `t(asl_matn)` qaytadi.
// Asl obyekt O'ZGARMAYDI (o'zbekcha matnlar o'sha joyda turibdi); undan foydalanayotgan kod (`restoUz.settingsPage.xxx`) ham o'zgarmaydi.
//   - matn -> t(matn) (joriy tilda); funksiya, son, null va h.k. -> o'zi;
//   - ichma-ich obyekt va massiv -> yana shunday o'ralgan proksi (har biri keshda: `a.b === a.b`, React deps uchun muhim);
//   - Object.keys/values/entries, JSON.stringify, massiv .map/.join/.length, `in`, hasOwnProperty — odatdagidek ishlaydi.
// Diqqat: tarjima o'qilgan paytda hisoblanadi. Modul darajasida `const X = restoUz.a.b` yozib qo'yilsa, qiymat til almashganda yangilanmaydi
// (modul bir marta bajariladi): bunday joylarda matnni komponent ichida o'qing yoki `tr()` bilan belgilab, ko'rsatishda `t()` chaqiring.
import { t } from './engine.ts'

export function translated<T extends object>(source: T): T {
  const cache = new WeakMap<object, object>()
  const wrap = (obj: object): object => {
    const hit = cache.get(obj)
    if (hit) return hit
    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver)
        if (typeof value === 'string') return typeof prop === 'symbol' ? value : t(value)
        if (value !== null && typeof value === 'object') return wrap(value)
        return value
      },
    })
    cache.set(obj, proxy)
    return proxy
  }
  return wrap(source) as T
}
