/**
 * Taom formasi holati va qoidalari. Sof funksiyalar (React'siz): `node --test` bilan tekshiriladi.
 *
 * Asosiy qoida: rasmdan o'qilgan ma'lumot faqat BO'SH maydonga yoziladi. Egasi yozgan maydonga hech qachon tegilmaydi.
 * Istisno: oldingi rasmdan tizim o'zi to'ldirgan va egasi tegmagan qiymat "bo'sh" hisoblanadi (rasm almashsa, eski taom nomi
 * yangi rasm ustida qolib ketmasin).
 */
import type { AutoFillKey, AutoFilled, CategoryMatch, CategorySource, DishFields, ParsedDish } from './types';

export interface FormState {
  fields: DishFields;
  /** Tizim to'ldirgan qiymatlar (belgi uchun). */
  autoFilled: AutoFilled;
  categorySource: CategorySource;
  /** Menyuda yo'q, rasmdan taklif qilingan kategoriya nomi ("Taklif: …" tugmasi). */
  categorySuggestion: string | null;
  /** Rasmdan narx topilmadi: narx maydoniga ishora ("Narxini yozing"). */
  priceHint: boolean;
}

export type EditableField = Exclude<keyof DishFields, 'category'>;

export type FormAction =
  | { type: 'edit'; field: EditableField; value: string }
  | { type: 'set_category'; id: string }
  | { type: 'autofill'; dish: ParsedDish; match: CategoryMatch }
  | { type: 'dismiss_category_suggestion' };

export const DEFAULT_PREP_MINUTES = '15';

export function emptyFields(): DishFields {
  return { name: '', price: '', prepMinutes: DEFAULT_PREP_MINUTES, category: '', description: '' };
}

export function initialFormState(fields: DishFields, categorySource: CategorySource): FormState {
  return { fields, autoFilled: {}, categorySource, categorySuggestion: null, priceHint: false };
}

/** Maydon qiymatini tizim ustiga yozishi mumkinmi: bo'sh yoki shu qiymatni tizimning o'zi qo'ygan va egasi o'zgartirmagan. */
function replaceable(state: FormState, key: AutoFillKey): boolean {
  const current = state.fields[key];
  return current.trim() === '' || state.autoFilled[key] === current;
}

function categoryReplaceable(state: FormState): boolean {
  if (state.fields.category === '') return true;
  // Forma o'zi qo'ygan boshlang'ich kategoriya egasining tanlovi emas
  if (state.categorySource === 'default') return true;
  return state.categorySource === 'ai' && state.autoFilled.category === state.fields.category;
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'edit':
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
        priceHint: action.field === 'price' ? false : state.priceHint,
      };

    case 'set_category':
      return {
        ...state,
        fields: { ...state.fields, category: action.id },
        categorySource: 'user',
        categorySuggestion: null,
      };

    case 'dismiss_category_suggestion':
      return { ...state, categorySuggestion: null };

    case 'autofill': {
      const { dish, match } = action;
      const fields = { ...state.fields };
      const autoFilled = { ...state.autoFilled };

      if (dish.name && replaceable(state, 'name')) {
        fields.name = dish.name;
        autoFilled.name = dish.name;
      }
      if (dish.description && replaceable(state, 'description')) {
        fields.description = dish.description;
        autoFilled.description = dish.description;
      }
      if (dish.price !== null && replaceable(state, 'price')) {
        fields.price = String(dish.price);
        autoFilled.price = fields.price;
      }

      let { categorySource, categorySuggestion } = state;
      if (categoryReplaceable(state)) {
        if (match.kind === 'existing') {
          fields.category = String(match.id);
          autoFilled.category = fields.category;
          categorySource = 'ai';
          categorySuggestion = null;
        } else if (match.kind === 'new') {
          categorySuggestion = match.name;
        } else {
          categorySuggestion = null;
        }
      }

      return {
        fields,
        autoFilled,
        categorySource,
        categorySuggestion,
        priceHint: fields.price.trim() === '',
      };
    }

    default:
      return state;
  }
}

/** Qaysi maydonlar yonida "rasmdan o'qildi — tekshiring" belgisi turadi: qiymat hali tizim qo'ygan holida. */
export function readBadges(state: FormState): Record<AutoFillKey, boolean> {
  const show = (key: AutoFillKey) => state.autoFilled[key] !== undefined && state.autoFilled[key] === state.fields[key];
  return { name: show('name'), price: show('price'), category: show('category'), description: show('description') };
}

/** Forma ochilgandagi holatdan farq bormi (yopishdan oldin ogohlantirish uchun). */
export function isFormDirty(current: DishFields, initial: DishFields): boolean {
  return (
    current.name !== initial.name ||
    current.price !== initial.price ||
    current.prepMinutes !== initial.prepMinutes ||
    current.category !== initial.category ||
    current.description !== initial.description
  );
}
