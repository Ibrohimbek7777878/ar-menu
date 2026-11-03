// Bron tanlovi holat mashinasi (sof reducer): stol tanlash -> bron oynasi -> yuborish -> natija.
// Qoidalar: ikki marta bosish yuborishni takrorlamaydi; xato bo'lsa `submission_id` saqlanadi (tarmoq uzilsa qayta urinish idempotent),
// ma'lumot o'zgarsa yangi id olinadi; 409 bo'lsa vaqt tozalanadi; availability yangilanib tanlangan vaqt bandligi aniqlansa vaqt tozalanadi.
import { nameIssue, normalizeName, notesIssue, phoneIssue, toE164 } from './phone.ts'
import type { BookingPayload, BookingResult, SubmitFailure } from './types.ts'

export type Step = 'pick' | 'form' | 'done'
export type FieldKey = 'table' | 'time' | 'guests' | 'name' | 'phone' | 'notes'
export type FieldIssueCode = 'required' | 'short' | 'long' | 'invalid' | 'over_capacity' | 'server'

export interface FieldIssue {
  code: FieldIssueCode
  /** Faqat `server`: serverning o'z xabari (o'zbekcha) */
  message?: string
}

export type BannerKind = 'slot_taken' | 'rate_limited' | 'disabled' | 'network' | 'server'

export interface FlowState {
  step: Step
  date: string
  /** Mehmonlar soni (bron oynasida tahrirlanadi) */
  guests: number
  /** availability so'rovi uchun mehmon soni: faqat 1-qadamda o'zgaradi (oynada o'zgarsa qayta so'ralmaydi) */
  availGuests: number
  tableId: number | null
  tableCapacity: number | null
  time: string | null
  eventType: string
  name: string
  /** Milliy 9 raqam ("901234567") */
  phone: string
  notes: string
  errors: Partial<Record<FieldKey, FieldIssue>>
  banner: BannerKind | null
  submitting: boolean
  /** Oxirgi yuborish urinishi: shu ma'lumot bilan qayta yuborilsa id o'zgarmaydi */
  attempt: { id: string; fingerprint: string } | null
  result: BookingResult | null
  /** Har safar xato maydon aniqlanganda (yuborishda yoki serverdan) +1: UI birinchi xato maydonga fokus beradi */
  focusTick: number
}

export interface FlowInit {
  date: string
  guests: number
  eventType?: string
}

export function initialFlow(init: FlowInit): FlowState {
  return {
    step: 'pick',
    date: init.date,
    guests: Math.max(1, init.guests),
    availGuests: Math.max(1, init.guests),
    tableId: null,
    tableCapacity: null,
    time: null,
    eventType: init.eventType ?? '',
    name: '',
    phone: '',
    notes: '',
    errors: {},
    banner: null,
    submitting: false,
    attempt: null,
    result: null,
    focusTick: 0,
  }
}

export type FlowAction =
  | { type: 'setDate'; date: string }
  | { type: 'setGuests'; guests: number; maxGuests: number }
  | { type: 'selectTable'; id: number; capacity: number }
  | { type: 'clearTable' }
  | { type: 'closeForm' }
  | { type: 'setTime'; time: string }
  | { type: 'setEvent'; key: string }
  | { type: 'setName'; value: string }
  | { type: 'setPhone'; national: string }
  | { type: 'setNotes'; value: string }
  /** availability yangilandi: `freeTimes` — tanlangan stol uchun hozir bo'sh vaqtlar (null = noma'lum) */
  | { type: 'reconcile'; freeTimes: ReadonlySet<string> | null }
  | { type: 'submit'; newId: string }
  | { type: 'submitOk'; result: BookingResult }
  | { type: 'submitFail'; failure: SubmitFailure }
  | { type: 'reset'; eventType?: string }

function without<K extends FieldKey>(errors: FlowState['errors'], ...keys: K[]): FlowState['errors'] {
  if (!keys.some((k) => k in errors)) return errors
  const next = { ...errors }
  for (const k of keys) delete next[k]
  return next
}

/** Maydonlarni tekshirish; bo'sh obyekt = hammasi to'g'ri. */
export function validateForm(s: Pick<FlowState, 'tableId' | 'tableCapacity' | 'time' | 'guests' | 'name' | 'phone' | 'notes'>): FlowState['errors'] {
  const errors: FlowState['errors'] = {}
  if (s.tableId === null) errors.table = { code: 'required' }
  if (!s.time) errors.time = { code: 'required' }
  if (!Number.isInteger(s.guests) || s.guests < 1) errors.guests = { code: 'invalid' }
  else if (s.tableCapacity !== null && s.guests > s.tableCapacity) errors.guests = { code: 'over_capacity' }
  const name = nameIssue(s.name)
  if (name) errors.name = { code: name === 'empty' ? 'required' : name }
  const phone = phoneIssue(s.phone)
  if (phone) errors.phone = { code: phone === 'empty' ? 'required' : phone === 'short' ? 'short' : 'invalid' }
  if (notesIssue(s.notes)) errors.notes = { code: 'long' }
  return errors
}

/** Qaysi maydonga fokus berilsin (formadagi tartib bo'yicha birinchi xato). */
export const FIELD_ORDER: readonly FieldKey[] = ['time', 'guests', 'name', 'phone', 'notes', 'table']

export function firstErrorField(errors: FlowState['errors']): FieldKey | null {
  return FIELD_ORDER.find((k) => k in errors) ?? null
}

export function fingerprintOf(s: Pick<FlowState, 'tableId' | 'date' | 'time' | 'guests' | 'name' | 'phone' | 'eventType' | 'notes'>): string {
  return JSON.stringify([s.tableId, s.date, s.time, s.guests, normalizeName(s.name), s.phone, s.eventType, s.notes.trim()])
}

/** Serverga yuboriladigan tana (holat to'g'ri tekshirilgan bo'lishi shart). */
export function buildPayload(s: FlowState, submissionId: string): BookingPayload | null {
  if (s.tableId === null || !s.time) return null
  return {
    table_id: s.tableId,
    date: s.date,
    time: s.time,
    guests: s.guests,
    name: normalizeName(s.name),
    phone: toE164(s.phone),
    event_type: s.eventType,
    notes: s.notes.trim(),
    submission_id: submissionId,
  }
}

const FIELD_FROM_SERVER: Record<string, FieldKey> = {
  table_id: 'table',
  table: 'table',
  date: 'time',
  time: 'time',
  guests: 'guests',
  name: 'name',
  phone: 'phone',
  notes: 'notes',
}

export function reduceFlow(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'setDate': {
      if (action.date === state.date) return state
      // Boshqa kun: vaqt oraliqlari boshqacha, tanlangan vaqt endi yaroqsiz; eski urinish ham (boshqa sana)
      return { ...state, date: action.date, time: null, errors: without(state.errors, 'time'), banner: null, attempt: null }
    }
    case 'setGuests': {
      const cap = state.tableCapacity ?? action.maxGuests
      const guests = Math.min(Math.max(1, Math.trunc(action.guests) || 1), Math.max(1, Math.min(cap, action.maxGuests)))
      if (state.step === 'form') {
        return { ...state, guests, errors: without(state.errors, 'guests'), banner: null }
      }
      // 1-qadam: filtr o'zgardi. Tanlangan stolga sig'maydigan bo'lsa tanlov bekor bo'ladi
      const requested = Math.max(1, Math.trunc(action.guests) || 1)
      const keepTable = state.tableCapacity === null || requested <= state.tableCapacity
      return {
        ...state,
        guests: Math.min(requested, action.maxGuests),
        availGuests: Math.min(requested, action.maxGuests),
        tableId: keepTable ? state.tableId : null,
        tableCapacity: keepTable ? state.tableCapacity : null,
        time: keepTable ? state.time : null,
      }
    }
    case 'selectTable': {
      const same = state.tableId === action.id
      return {
        ...state,
        step: 'form',
        tableId: action.id,
        tableCapacity: action.capacity,
        guests: Math.min(state.guests, action.capacity),
        time: same ? state.time : null,
        errors: {},
        banner: null,
        attempt: same ? state.attempt : null,
      }
    }
    case 'clearTable':
      return { ...state, tableId: null, tableCapacity: null, time: null }
    case 'closeForm':
      // Oynada mehmon soni o'zgargan bo'lishi mumkin: 1-qadam availability'ni shu son bilan qayta so'raydi
      return state.step === 'form' && !state.submitting
        ? { ...state, step: 'pick', availGuests: state.guests, errors: {}, banner: null }
        : state
    case 'setTime':
      return { ...state, time: action.time, errors: without(state.errors, 'time'), banner: state.banner === 'slot_taken' ? null : state.banner }
    case 'setEvent':
      return { ...state, eventType: action.key }
    case 'setName':
      return { ...state, name: action.value, errors: without(state.errors, 'name') }
    case 'setPhone':
      return { ...state, phone: action.national, errors: without(state.errors, 'phone') }
    case 'setNotes':
      return { ...state, notes: action.value, errors: without(state.errors, 'notes') }
    case 'reconcile': {
      if (!action.freeTimes || !state.time || action.freeTimes.has(state.time)) return state
      return { ...state, time: null, banner: 'slot_taken', attempt: null }
    }
    case 'submit': {
      if (state.submitting || state.step !== 'form') return state
      const errors = validateForm(state)
      if (Object.keys(errors).length) return { ...state, errors, banner: null, focusTick: state.focusTick + 1 }
      const fingerprint = fingerprintOf(state)
      const attempt = state.attempt?.fingerprint === fingerprint ? state.attempt : { id: action.newId, fingerprint }
      return { ...state, errors: {}, banner: null, submitting: true, attempt }
    }
    case 'submitOk':
      return { ...state, submitting: false, step: 'done', result: action.result, banner: null, errors: {} }
    case 'submitFail': {
      const f = action.failure
      const base = { ...state, submitting: false }
      if (f.kind === 'slot_taken') return { ...base, time: null, banner: 'slot_taken', attempt: null }
      if (f.kind === 'invalid') {
        const field = FIELD_FROM_SERVER[f.field]
        // Maydon noma'lum bo'lsa umumiy xato; maydon ma'lum bo'lsa o'sha maydon yonida
        return field
          ? { ...base, errors: { ...state.errors, [field]: { code: 'server', message: f.message } as FieldIssue }, banner: null, attempt: null, focusTick: state.focusTick + 1 }
          : { ...base, banner: 'server' }
      }
      return { ...base, banner: f.kind }
    }
    case 'reset':
      return {
        ...initialFlow({ date: state.date, guests: state.guests, eventType: action.eventType ?? '' }),
        name: state.name,
        phone: state.phone,
      }
    default:
      return state
  }
}
