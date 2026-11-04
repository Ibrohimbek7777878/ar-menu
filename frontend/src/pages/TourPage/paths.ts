// Sayr yo'llari (sof). Sayr ekrani `/tour/`, bron sahifasi `/book/` (BookingPage). Stol id'si faqat musbat butun son bo'lishi shart.
export const TOUR_PATH = '/tour/'
export const BOOKING_BASE_PATH = '/book/'

/** Sayrdagi stol kartochkasidan bron sahifasiga: stol oldindan tanlangan, muvaffaqiyatdan keyin "Sayrga qaytish" ko'rinadi. */
export function bookingPathForTable(tableId: number): string {
  return Number.isInteger(tableId) && tableId > 0 ? `${BOOKING_BASE_PATH}?table=${tableId}&from=tour` : BOOKING_BASE_PATH
}
