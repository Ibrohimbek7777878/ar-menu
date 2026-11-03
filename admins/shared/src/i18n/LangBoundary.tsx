import { Fragment, type ReactNode } from 'react'
import { useLang } from './useLang.ts'

/**
 * Til almashganda daraxtni qayta ulaydi: React.memo, kesh va `t()` / `restoUz` ni to'g'ridan-to'g'ri o'qiydigan joylar ham
 * yangi tilda chiziladi (eski matn qolib ketmaydi). Router, sessiya va URL daraxtdan yuqorida turadi, shuning uchun yo'qolmaydi;
 * faqat joriy sahifaning vaqtincha holati (masalan, yozilayotgan forma) boshidan boshlanadi.
 */
export function LangBoundary({ children }: { children: ReactNode }) {
  return <Fragment key={useLang()}>{children}</Fragment>
}
