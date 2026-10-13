/**
 * Smart 3D Matcher Service & Catalog
 * Kengaytirilgan 3D GLB modellar kutubxonasi va nom bo'yicha aqlli semantik moslovchi.
 */

export interface Model3DItem {
  id: string;
  name: string;
  category: string;
  glbUrl: string;
  icon: string;
  description: string;
  keywords: string[];
}

export const AVAILABLE_3D_MODELS: Model3DItem[] = [
  {
    id: 'plov',
    name: "Osh / Devzira Palov",
    category: "Asosiy taomlar",
    glbUrl: '/models/plov.glb',
    icon: '🍚',
    description: "An'anaviy O'zbek oshi, to'y oshi, choyxona palov",
    keywords: ['osh', 'palov', 'plov', 'devzira', "to'y oshi", 'choyxona', 'samarqandcha osh', 'guruch'],
  },
  {
    id: 'shashlik',
    name: "Shashlik / Kabob",
    category: "Asosiy taomlar",
    glbUrl: '/models/shashlik.glb',
    icon: '🍢',
    description: "G'ijduvon qiyma, jigar, qo'y go'shti, tovuq kabob",
    keywords: ['shashlik', 'kabob', 'qiyma', 'jigar', 'shashliklar', 'lula', 'dumba', 'grill'],
  },
  {
    id: 'somsa',
    name: "Tandir Somsa",
    category: "Pishiriqlar & Non",
    glbUrl: '/models/somsa.glb',
    icon: '🥟',
    description: "Tandir somsa, qatlama somsa, go'shtli va ko'k somsa",
    keywords: ['somsa', 'tandir somsa', 'qatlama somsa', 'samsa', 'piroshki', 'bursaq'],
  },
  {
    id: 'qozon_kabob',
    name: "Qozon Kabob / Jiz",
    category: "Asosiy taomlar",
    glbUrl: '/models/qozon_kabob.glb',
    icon: '🥘',
    description: "Qozon kabob, qovurilgan barra go'sht va kartoshka",
    keywords: ['qozon kabob', 'qozon', 'jiz', 'qovurdoq', 'dimlama'],
  },
  {
    id: 'manti',
    name: "Klassik Manti",
    category: "Asosiy taomlar",
    glbUrl: '/models/manti.glb',
    icon: '🥟',
    description: "Bug'da pishgan manti, xonim, chuchvara",
    keywords: ['manti', 'xonim', 'chuchvara', 'dumpling', 'qovoqli manti'],
  },
  {
    id: 'lagmon',
    name: "Cho'zma Lag'mon",
    category: "Asosiy taomlar",
    glbUrl: '/models/lagmon.glb',
    icon: '🍜',
    description: "Cho'zma lag'mon, qovurma lag'mon, say va pasta",
    keywords: ['lagmon', "lag'mon", 'pasta', 'spagetti', 'makaron', 'noodles', 'qovurma lagmon'],
  },
  {
    id: 'shorva',
    name: "Sho'rva / Ko'za sho'rva",
    category: "Shoʻrvalar",
    glbUrl: '/models/shorva.glb',
    icon: '🥣',
    description: "Qo'y go'shtli an'anaviy sho'rva, ko'za sho'rva",
    keywords: ['shorva', "sho'rva", 'koza shorva', 'bulon', 'soup', 'sorva'],
  },
  {
    id: 'mastava',
    name: "Mastava",
    category: "Shoʻrvalar",
    glbUrl: '/models/mastava.glb',
    icon: '🍲',
    description: "Qatiq va ko'katli quyuq mastava sho'rvasi",
    keywords: ['mastava', 'guruch shorva'],
  },
  {
    id: 'steak_meat',
    name: "Steyk / Go'sht Taomlari",
    category: "Asosiy taomlar",
    glbUrl: '/models/steak_meat.glb',
    icon: '🥩',
    description: "Ribay, T-bone, medalyon, bifshteks",
    keywords: ['steyk', 'steak', 'ribay', 't-bone', 'medalyon', 'bifshteks', 'kotlet', 'gosht'],
  },
  {
    id: 'salad_achichuk',
    name: "Achchiq-Chuchuk Salati",
    category: "Salatlar",
    glbUrl: '/models/salad_achichuk.glb',
    icon: '🥗',
    description: "Pomidor, bodring, piyoz va rayhon salati",
    keywords: ['achichuk', 'achchiq-chuchuk', 'achchiq chuchuk', 'pomidor salat', 'shakarob'],
  },
  {
    id: 'salad_bahor',
    name: "Bahor / Sezar Salati",
    category: "Salatlar",
    glbUrl: '/models/salad_bahor.glb',
    icon: '🥬',
    description: "Bahor, Sezar, Grekcha, Olivye, yashil salatlar",
    keywords: ['bahor', 'sezar', 'caesar', 'grekcha', 'olivye', 'salat', 'salad', 'yashil salat'],
  },
  {
    id: 'non',
    name: "Tandir Non / Patir",
    category: "Pishiriqlar & Non",
    glbUrl: '/models/non.glb',
    icon: '🥖',
    description: "Issiq tandir non, patir, obi non",
    keywords: ['non', 'patir', 'tandir non', 'bread', 'lepyoshka'],
  },
  {
    id: 'breakfast_egg',
    name: "Nonushta / Tuxum",
    category: "Asosiy taomlar",
    glbUrl: '/models/breakfast_egg.glb',
    icon: '🍳',
    description: "Qovurilgan tuxum, omlet, nonushta taomi",
    keywords: ['tuxum', 'nonushta', 'omlet', 'egg', 'glazunya'],
  },
  {
    id: 'tea_cup',
    name: "Choynak / Kofe / Choy",
    category: "Ichimliklar",
    glbUrl: '/models/tea_cup.glb',
    icon: '☕',
    description: "Ko'k choy, qora choy, limon choy, espresso, kapuchino",
    keywords: ['choy', 'kok choy', "ko'k choy", 'qora choy', 'tea', 'kofe', 'coffee', 'cappuccino', 'espresso', 'choynak'],
  },
  {
    id: 'drink_bottle',
    name: "Ichimlik / Salqin Ichimlik",
    category: "Ichimliklar",
    glbUrl: '/models/drink_bottle.glb',
    icon: '🥤',
    description: "Kola, Fanta, Sprite, suv, sharbat, moxito",
    keywords: ['kola', 'cola', 'fanta', 'sprite', 'suv', 'water', 'sharbat', 'ichimlik', 'moxito', 'juice', 'pepsi'],
  },
  {
    id: 'dessert_bowl',
    name: "Muzqaymoq & Desert",
    category: "Salatlar",
    glbUrl: '/models/dessert_bowl.glb',
    icon: '🍨',
    description: "Muzqaymoq, chizkeyk, tort, shirinlik",
    keywords: ['desert', 'muzqaymoq', 'ice cream', 'tort', 'cake', 'cheesecake', 'chizkeyk', 'shirinlik', 'meva'],
  },
];

/**
 * Taom nomi va toifasi bo'yicha eng mos 3D modelni aniqlaydi.
 * Agar birorta mos kelmasa, aldamasdan null qaytaradi!
 */
export function match3DModel(dishName: string, categoryName?: string): Model3DItem | null {
  if (!dishName || typeof dishName !== 'string') return null;

  const cleanName = dishName.toLowerCase().trim();
  const cleanCategory = (categoryName || '').toLowerCase().trim();

  // 1. To'g'ridan-to'g'ri kalit so'zlarni qidirish
  let bestMatch: Model3DItem | null = null;
  let maxScore = 0;

  for (const model of AVAILABLE_3D_MODELS) {
    let score = 0;

    for (const kw of model.keywords) {
      if (cleanName === kw) {
        score += 100; // Aniq tenglik
      } else if (cleanName.includes(kw)) {
        score += kw.length * 3; // Nomi ichida kalit so'z bor
      }
    }

    if (cleanCategory && model.category.toLowerCase().includes(cleanCategory)) {
      score += 5;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = model;
    }
  }

  // Minimal ishonchlilik chegarasi: tasodifiy nomlarga moslab qo'ymaslik uchun
  if (maxScore >= 6) {
    return bestMatch;
  }

  return null;
}

/**
 * Berilgan taom obyektiga mos 3D modelni biriktiradi.
 * Agar mos model topilmasa, has_3d = false qilib toza qoldiradi.
 */
export function enrichDishWith3D<T extends { name: string; category_name?: string; ar_model?: string; has_3d?: boolean }>(dish: T): T {
  if (dish.ar_model && dish.has_3d) {
    return dish;
  }

  const matched = match3DModel(dish.name, dish.category_name);
  if (matched) {
    return {
      ...dish,
      has_3d: true,
      ar_model: matched.glbUrl,
    };
  }

  return {
    ...dish,
    has_3d: false,
    ar_model: undefined,
  };
}
