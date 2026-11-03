/**
 * Bron holatlari, filtr chiplari va holat bo'yicha mumkin bo'lgan amallar. SOF mantiq: hech narsa import qilmaydi.
 *
 * Holat ro'yxati B1 shartnomasi bo'yicha: pending | confirmed | arrived | no_show | completed | cancelled.
 * Serverning mavjud `TableReservation.STATUS_CHOICES` ro'yxatida `seated` ("O'tirdi") bor, `no_show` yo'q edi: shu sababli
 * `seated` ham tanib olinadi (eski yozuvlar ko'rinadi, "Yakunlash" mumkin), xom holat kodi esa HECH QACHON ko'rsatilmaydi.
 */

export type ReservationStatus = 'pending' | 'confirmed' | 'arrived' | 'seated' | 'no_show' | 'completed' | 'cancelled';

export const KNOWN_STATUSES: readonly ReservationStatus[] = ['pending', 'confirmed', 'arrived', 'seated', 'no_show', 'completed', 'cancelled'];

export function isKnownStatus(value: unknown): value is ReservationStatus {
  return typeof value === 'string' && (KNOWN_STATUSES as readonly string[]).includes(value);
}

/** Stolni band qiladigan (faol) holatlar */
export const ACTIVE_STATUSES: readonly string[] = ['pending', 'confirmed', 'arrived', 'seated'];

export const isActiveStatus = (status: string): boolean => ACTIVE_STATUSES.includes(status);

/** Filtr chiplari tartibi. "O'tirdi" alohida chip emas: "Keldi" chipiga kiradi. */
export type StatusFilter = 'all' | 'pending' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';

export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'];

/** Holat qaysi filtr chipiga kiradi (noma'lum holat — hech biriga, faqat "Barchasi" da ko'rinadi). */
export function filterOf(status: string): Exclude<StatusFilter, 'all'> | null {
  if (status === 'seated') return 'arrived';
  if (status === 'pending' || status === 'confirmed' || status === 'arrived' || status === 'completed' || status === 'no_show' || status === 'cancelled') {
    return status;
  }
  return null;
}

export function matchesFilter(status: string, filter: StatusFilter): boolean {
  return filter === 'all' || filterOf(status) === filter;
}

export type StatusTone = 'warn' | 'brand' | 'success' | 'neutral' | 'danger';

export function toneOf(status: string): StatusTone {
  switch (status) {
    case 'pending':
      return 'warn';
    case 'confirmed':
      return 'brand';
    case 'arrived':
    case 'seated':
      return 'success';
    case 'cancelled':
    case 'no_show':
      return 'danger';
    default:
      return 'neutral';
  }
}

export type ActionKind = 'confirm' | 'arrived' | 'no_show' | 'complete' | 'cancel';

export interface StatusAction {
  kind: ActionKind;
  /** Serverga yuboriladigan yangi holat */
  to: ReservationStatus;
  /** Bajarishdan oldin tasdiq so'raladimi (qaytarib bo'lmaydigan amallar) */
  confirm: boolean;
  /** Xavfli (qizil) amal */
  danger: boolean;
}

const ACTION: Record<ActionKind, StatusAction> = {
  confirm: { kind: 'confirm', to: 'confirmed', confirm: false, danger: false },
  arrived: { kind: 'arrived', to: 'arrived', confirm: false, danger: false },
  no_show: { kind: 'no_show', to: 'no_show', confirm: true, danger: true },
  complete: { kind: 'complete', to: 'completed', confirm: false, danger: false },
  cancel: { kind: 'cancel', to: 'cancelled', confirm: true, danger: true },
};

/**
 * Holatdan mumkin bo'lgan amallar (asosiy amal birinchi). Yakuniy holatlar (yakunlangan, bekor, kelmadi) va noma'lum holatda — bo'sh.
 * Oxirgi so'z baribir serverniki: u mumkin bo'lmagan o'tishni rad etadi va xabarini sahifa ko'rsatadi.
 */
export function actionsFor(status: string): StatusAction[] {
  switch (status) {
    case 'pending':
      return [ACTION.confirm, ACTION.cancel];
    case 'confirmed':
      return [ACTION.arrived, ACTION.no_show, ACTION.cancel];
    case 'arrived':
      return [ACTION.complete, ACTION.cancel];
    case 'seated':
      return [ACTION.complete];
    default:
      return [];
  }
}

/** Tahrirlash mumkinmi: faqat faol bron (yakunlangan/bekor qilingan/kelmagan bron tahrirlanmaydi). */
export const isEditable = (status: string): boolean => isActiveStatus(status);

/** Bronning manbasi: sahifada "Sayt" / "Qo'lda" / "Telegram" deb ko'rsatiladi, noma'lum manba yashiriladi. */
export type SourceKind = 'site' | 'manual' | 'telegram';

export function sourceKind(source: unknown): SourceKind | null {
  if (typeof source !== 'string') return null;
  switch (source.trim().toLowerCase()) {
    case 'guest':
    case 'web':
    case 'site':
    case 'website':
      return 'site';
    case 'staff':
    case 'admin':
    case 'manual':
    case 'hostess':
      return 'manual';
    case 'telegram':
    case 'bot':
    case 'tma':
      return 'telegram';
    default:
      return null;
  }
}
