import { Dish, Language, DishCategory } from '../types';

declare global {
  interface Window {
    __INITIAL_DATA__?: {
      slug?: string;
      restaurant_name?: string;
      table_id?: string | number;
      table_number?: number;
      session_id?: string;
      lang?: Language;
      csrf_token?: string;
    };
  }
}

export interface DjangoRestaurantInfo {
  id: number;
  slug: string;
  name: string;
  logo: string | null;
  colors: {
    primary: string;
    accent: string;
  };
  langs: string[];
  default_lang: string;
  service_fee_pct: number;
  has_ar: boolean;
  phone?: string;
  address?: string;
}

export interface DynamicCategory {
  id: string;
  label: string;
  icon: string;
}

export function getInitialContext() {
  const init = window.__INITIAL_DATA__ || {};
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract slug from URL if path is /m/<slug>/
  let slug = init.slug || '';
  if (!slug) {
    const match = window.location.pathname.match(/\/m\/([^\/]+)/);
    if (match) {
      slug = match[1];
    }
  }
  if (!slug) {
    slug = 'demo';
  }

  const tableId = init.table_id || urlParams.get('t') || 5;
  const sessionId = init.session_id || urlParams.get('s') || '';
  const lang = (init.lang || urlParams.get('lang') || 'uz') as Language;
  const csrfToken = init.csrf_token || getCookie('csrftoken') || '';

  return {
    slug,
    tableId,
    tableNumber: Number(tableId) || 5,
    sessionId,
    lang,
    csrfToken,
    restaurantName: init.restaurant_name || 'Registon Lounge'
  };
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('kabob') || lower.includes('shashlik') || lower.includes('gril')) return '🍢';
  if (lower.includes('sho\'rva') || lower.includes('shorva') || lower.includes('soup')) return '🥣';
  if (lower.includes('salat')) return '🥗';
  if (lower.includes('non') || lower.includes('somsa') || lower.includes('pishiriq')) return '🍞';
  if (lower.includes('choy') || lower.includes('ichimlik') || lower.includes('drink')) return '🫖';
  if (lower.includes('desert') || lower.includes('shirinlik') || lower.includes('tort')) return '🍰';
  if (lower.includes('nonushta') || lower.includes('tuxum')) return '🍳';
  return '🥘';
}

function inferModelType(name: string, desc: string): Dish['modelType'] {
  const text = `${name} ${desc}`.toLowerCase();
  if (text.includes('osh') || text.includes('palov') || text.includes('plov')) return 'plov';
  if (text.includes('manti')) return 'manti';
  if (text.includes('somsa') || text.includes('samsa')) return 'somsa';
  if (text.includes('kabob') || text.includes('shashlik')) return 'shashlik';
  if (text.includes('lag\'mon') || text.includes('lagman')) return 'lagman';
  if (text.includes('sho\'rva') || text.includes('shorva') || text.includes('mastava')) return 'shorva';
  if (text.includes('salat') || text.includes('achchiq') || text.includes('chuchuk')) return 'salat';
  if (text.includes('choy') || text.includes('tea') || text.includes('qahva') || text.includes('kofe')) return 'choy';
  return 'plov';
}

// modelType → lokal GLB fayli (backend/media/ar/glb/)
const MODEL_TYPE_GLB: Record<Dish['modelType'], string> = {
  plov: '/media/ar/glb/plov.glb',
  manti: '/media/ar/glb/manti.glb',
  somsa: '/media/ar/glb/somsa.glb',
  shashlik: '/media/ar/glb/shashlik.glb',
  lagman: '/media/ar/glb/lagmon.glb',
  shorva: '/media/ar/glb/mastava.glb',
  salat: '/media/ar/glb/salad_bahor.glb',
  choy: '/media/ar/glb/tea_cup.glb',
};

// Taom uchun eng mos GLB URL: API lokal glb_url bersa o'sha, aks holda modelType bo'yicha lokal fayl.
// Tashqi demo URLlar (Astronaut.glb kabi) — taomga mos emas, ishlatilmaydi.
function resolveGlbUrl(glbUrl: unknown, modelType: Dish['modelType']): string | undefined {
  if (typeof glbUrl === 'string' && glbUrl.startsWith('/media/')) return glbUrl;
  return MODEL_TYPE_GLB[modelType];
}

export async function fetchMenuFromAPI(slug: string, lang: Language, tableId?: string | number) {
  const tableParam = tableId ? `&table=${tableId}` : '';
  const res = await fetch(`/v1/menu/${slug}/?lang=${lang}${tableParam}`);
  if (!res.ok) {
    throw new Error(`Menu fetch failed with status ${res.status}`);
  }
  const data = await res.json();
  
  const rawCategories = data.categories || [];
  const rawDishes = data.dishes || [];

  const categories: DynamicCategory[] = [
    { id: 'all', label: lang === 'en' ? 'All' : lang === 'ru' ? 'Все' : 'Barchasi', icon: '🍽️' },
    ...rawCategories.map((c: any) => ({
      id: String(c.id),
      label: c.name,
      icon: getCategoryIcon(c.name)
    }))
  ];

  const dishes: Dish[] = rawDishes.map((item: any) => {
    const rawPrice = parseFloat(item.price) || 0;
    const modelType = inferModelType(item.name || '', item.desc || '');

    const tags: ('hit' | 'new' | 'halal' | 'vegan' | 'spicy')[] = [];
    if (item.is_hit) tags.push('hit');
    if (item.is_new) tags.push('new');
    if (Array.isArray(item.diet)) {
      if (item.diet.includes('halal')) tags.push('halal');
      if (item.diet.includes('vegan')) tags.push('vegan');
      if (item.diet.includes('spicy')) tags.push('spicy');
    }

    const name = {
      uz: item.name || '',
      ru: item.name || '',
      en: item.name || ''
    };
    const description = {
      uz: item.desc || '',
      ru: item.desc || '',
      en: item.desc || ''
    };

    return {
      id: String(item.id),
      name,
      description,
      price: rawPrice,
      category: String(item.cat || item.category_id || 'milliy'),
      prepTime: item.cook_min || 15,
      weight: item.weight_g ? `${item.weight_g} g` : '350 g',
      calories: item.calories || 500,
      diameterCm: item.diameter_cm || (modelType === 'plov' ? 32 : modelType === 'manti' ? 28 : 22),
      imageUrl: item.image || item.img || 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
      has3d: Boolean(item.has_3d || item.has_ar),
      glbUrl: resolveGlbUrl(item.glb_url, modelType),
      modelType,
      tags,
      isSoldOut: item.is_available === false,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      ingredients: {
        uz: Array.isArray(item.ingredients) ? item.ingredients : ['Milliy masalliqlar'],
        ru: ['Традиционные ингредиенты'],
        en: ['Traditional ingredients']
      },
      touristFact: {
        uz: "An'anaviy o'zbek mehmondo'stligi taomi. Yangi va tabiiy masalliqlardan tayyorlangan.",
        ru: "Традиционное блюдо узбекского гостеприимства из натуральных продуктов.",
        en: "Traditional Uzbek hospitality dish prepared with fresh natural ingredients."
      }
    };
  });

  return {
    restaurant: data.restaurant as DjangoRestaurantInfo,
    categories,
    dishes
  };
}

export async function submitOrderAPI(orderPayload: {
  sessionId: string;
  tableId: string | number;
  items: { dishId: string | number; qty: number; note?: string; modifiers?: any[] }[];
  note?: string;
  csrfToken?: string;
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  if (orderPayload.csrfToken) {
    headers['X-CSRFToken'] = orderPayload.csrfToken;
  }

  const body = {
    session_id: orderPayload.sessionId,
    table_id: orderPayload.tableId,
    note: orderPayload.note || '',
    items: orderPayload.items.map(it => ({
      dish_id: Number(it.dishId) || it.dishId,
      qty: it.qty,
      modifiers: it.modifiers || [],
      note: it.note || '',
      ar_viewed: true
    }))
  };

  const res = await fetch('/v1/orders/', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.detail || `Order error ${res.status}`);
  }

  return await res.json();
}

export async function callWaiterAPI(tableId: string | number, sessionId: string, reason: 'waiter' | 'water' | 'bill') {
  const csrf = getCookie('csrftoken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (csrf) {
    headers['X-CSRFToken'] = csrf;
  }

  const res = await fetch('/v1/guest/call-waiter/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      table_id: tableId,
      session_id: sessionId,
      reason
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Call waiter failed ${res.status}`);
  }

  return await res.json();
}

export async function changeLanguageAPI(lang: Language, sessionId?: string) {
  try {
    await fetch('/v1/lang/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, session_id: sessionId })
    });
  } catch (e) {
    console.warn('Language update failed', e);
  }
}
