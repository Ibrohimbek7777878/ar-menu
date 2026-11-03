// Telefon niqobi va ism/izoh tekshiruvi: sof mantiq. Maydon "+998" belgisini alohida ko'rsatadi, mehmon faqat 9 raqam kiritadi.

export const PHONE_DIGITS = 9
export const NAME_MIN = 2
export const NAME_MAX = 80
export const NOTES_MAX = 500

/**
 * Har qanday kiritish/qo'yish (paste) -> milliy 9 raqam (kod siz):
 *  "90 123 45 67" | "+998 90 123 45 67" | "998901234567" | "0901234567" -> "901234567".
 * "998" prefiksi faqat 9 raqamdan ortiq bo'lsa kesiladi: aks holda 99 operatorli "998xxxxxx" raqamni buzardi.
 */
export function nationalDigits(raw: string): string {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length > PHONE_DIGITS && digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.length === PHONE_DIGITS + 1 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, PHONE_DIGITS)
}

/** "901234567" -> "90 123 45 67"; to'liq bo'lmasa bor qismi guruhlanadi ("90 12"). */
export function formatNational(national: string): string {
  const d = national.replace(/\D/g, '').slice(0, PHONE_DIGITS)
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean)
  return parts.join(' ')
}

/** Matndagi kursordan oldingi raqamlar soni. */
export function digitsBefore(text: string, caret: number): number {
  return text.slice(0, Math.max(0, caret)).replace(/\D/g, '').length
}

/** Qayta formatlangan matnda `n` ta raqamdan keyingi kursor o'rni (o'rtada tahrirlaganda kursor oxiriga sakramasin). */
export function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++
      if (seen === n) return i + 1
    }
  }
  return formatted.length
}

export type PhoneIssue = 'empty' | 'short' | 'invalid'

/** O'zbekiston raqami: 9 raqam, birinchisi 2-9 (0 va 1 bilan boshlanmaydi). null = to'g'ri. */
export function phoneIssue(national: string): PhoneIssue | null {
  if (!national) return 'empty'
  if (!/^\d+$/.test(national)) return 'invalid'
  if (national.length < PHONE_DIGITS) return 'short'
  if (national.length > PHONE_DIGITS || national[0] === '0' || national[0] === '1') return 'invalid'
  return null
}

/** Serverga: "+998901234567". */
export function toE164(national: string): string {
  return `+998${national}`
}

/** Ko'rsatish uchun: "+998 90 123 45 67". */
export function displayPhone(national: string): string {
  return `+998 ${formatNational(national)}`.trim()
}

export type NameIssue = 'empty' | 'short' | 'long' | 'invalid'

export function normalizeName(raw: string): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim()
}

/** Ism-familiya: kamida 2 belgi, ko'pi bilan 80, kamida bitta harf bo'lishi shart. null = to'g'ri. */
export function nameIssue(raw: string): NameIssue | null {
  const name = normalizeName(raw)
  if (!name) return 'empty'
  if (name.length < NAME_MIN) return 'short'
  if (name.length > NAME_MAX) return 'long'
  if (!/\p{L}/u.test(name)) return 'invalid'
  return null
}

export function notesIssue(raw: string): 'long' | null {
  return String(raw ?? '').trim().length > NOTES_MAX ? 'long' : null
}
