import { Fragment, type ReactNode } from 'react'
import { useLang } from './useLang'

/**
 * Til almashganda daraxtni qayta ulaydi: React.memo, kesh va `t()` ni to'g'ridan-to'g'ri chaqiradigan joylar ham
 * yangi tilda chiziladi (eski matn qolib ketmaydi). Savat va stol NavigationProvider'da (localStorage) turadi, shuning
 * uchun yo'qolmaydi; faqat joriy sahifaning vaqtincha holati (masalan, yozilayotgan izoh) boshidan boshlanadi.
 */
export function LangBoundary({ children }: { children: ReactNode }) {
  return <Fragment key={useLang()}>{children}</Fragment>
}
