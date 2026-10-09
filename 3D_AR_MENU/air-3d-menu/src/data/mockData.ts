import { Dish, RestaurantTable, Order } from '../types';

export const INITIAL_DISHES: Dish[] = [
  {
    id: 'dish-1',
    name: {
      uz: 'Toshkent To\'y Oshi (Palov)',
      ru: 'Ташкентский праздничный плов',
      en: 'Tashkent Wedding Plov'
    },
    description: {
      uz: 'Lazer guruchi, saralan qo\'y go\'shti, sariq va qizil sabzi, no\'xat, mayiz, bedana tuxumi va kazy bilan an\'anaviy Samarqand-Toshkent oshi.',
      ru: 'Рис лазер, отборная баранина, жёлтая и красная морковь, нут, изюм, перепелиные яйца и казы.',
      en: 'Lazer rice, tender lamb, yellow and red carrots, chickpeas, raisins, quail eggs, and traditional horse meat sausage (kazy).'
    },
    price: 45000,
    category: 'milliy',
    prepTime: 15,
    weight: '400 g',
    calories: 780,
    diameterCm: 32, // Lagan Ø32 cm
    imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'plov',
    tags: ['hit', 'halal'],
    spiceLevel: 0,
    allergens: ['Qo\'y go\'shti', 'Kazy'],
    touristFact: {
      uz: "O'zbek dasturxonining shohi! Qadimiy Ipak yo'li karvonlaridan buyon to'y va ulug' mehmonlar uchun tayyorlanadi. Achchiq-chuchuk salati bilan yeyish tavsiya etiladi.",
      ru: "Король узбекского дастархана! Готовится на хлопковом масле в чугунном казане с XI века. Традиционно подается с салатом Ачик-чучук и горячим зеленым чаем.",
      en: "The King of the Silk Road table! UNESCO intangible cultural heritage dish, slow-steamed in a heavy cast-iron cauldron. Best paired with Achchik-chuchuk salad and green tea."
    },
    ingredients: {
      uz: ['Qo\'y go\'shti', 'Lazer guruch', 'Sariq sabzi', 'Qazi', 'Bedana tuxumi', 'Zira', 'No\'xat'],
      ru: ['Баранина', 'Рис Лазер', 'Желтая морковь', 'Казы', 'Перепелиные яйца', 'Зира', 'Нут'],
      en: ['Lamb', 'Lazer Rice', 'Yellow Carrots', 'Kazy', 'Quail Eggs', 'Cumin', 'Chickpeas']
    }
  },
  {
    id: 'dish-2',
    name: {
      uz: 'Qo\'lda tugilgan Manti',
      ru: 'Манты ручной лепки с бараниной',
      en: 'Handmade Steamed Manti'
    },
    description: {
      uz: 'Yupqa xamir, maydalangan barra qo\'y go\'shti, dumba yog\'i va shirali piyoz. Suzma va yangi ko\'katlar bilan tortiladi.',
      ru: 'Тонкое тесто, рубленая нежная баранина с курдючным жиром и сочным луком. Подаются со свежей сузьмой.',
      en: 'Paper-thin dough pockets stuffed with hand-chopped lamb, aromatic spices, and onions. Served with traditional suzma.'
    },
    price: 38000,
    category: 'milliy',
    prepTime: 20,
    weight: '350 g (5 dona)',
    calories: 620,
    diameterCm: 28,
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'manti',
    tags: ['hit', 'halal'],
    spiceLevel: 0,
    allergens: ['Bug\'doy xamiri (Gluten)'],
    touristFact: {
      uz: "Manti maxsus ko'p qavatli mantiqosqonda bug'da pishiriladi. Ichidagi shira oqib ketmasligi uchun qo'lda ehtiyotkorlik bilan yeyish qulay.",
      ru: "Готовятся исключительно на пару в многоярусной каскане. Чтобы не потерять драгоценный сок внутри, их принято аккуратно надкусывать руками.",
      en: "Steamed gently in multi-tiered bamboo/metal steamers (kaskan). Hand-pinched pockets burst with savory juices—traditionally enjoyed with fingers!"
    },
    ingredients: {
      uz: ['Qo\'y go\'shti', 'Yupqa xamir', 'Piyoz', 'Dumba', 'Suzma', 'Murch'],
      ru: ['Баранина', 'Тесто', 'Лук', 'Курдюк', 'Сузьма', 'Черный перец'],
      en: ['Lamb', 'Flour Dough', 'Onion', 'Fat Tail', 'Suzma Yoghurt', 'Black Pepper']
    }
  },
  {
    id: 'dish-3',
    name: {
      uz: 'Tandir Somsa (Go\'shtli)',
      ru: 'Тандырная самса с мясом',
      en: 'Crispy Tandoor Somsa'
    },
    description: {
      uz: 'Qatlama xamir, tandirda qizartirib pishirilgan barra go\'shtli va qora kunjutli qarsildoq somsa.',
      ru: 'Хрустящее слоёное тесто из глиняного тандыра с сочным рубленым мясом и семенами седаны.',
      en: 'Flaky layered pastry baked inside a clay tandoor oven, filled with spiced juicy beef & lamb, topped with black nigella seeds.'
    },
    price: 16000,
    category: 'non',
    prepTime: 10,
    weight: '180 g',
    calories: 340,
    diameterCm: 18,
    imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'somsa',
    tags: ['hit', 'halal'],
    spiceLevel: 0,
    allergens: ['Bug\'doy xamiri (Gluten)', 'Sedana'],
    touristFact: {
      uz: "Tandirning issiq sopol devoriga qo'lda yopishtirilib, saksovul yoki ko'mir olovida pishiriladi. Xushbo'y sedana urug'i hazmga yordam beradi.",
      ru: "Выпекается при температуре 300°C на глиняных стенках тандыра. Семена черного тмина (седаны) придают неповторимый восточный аромат.",
      en: "Slapped by hand onto the searing interior walls of a clay tandoor. Sprinkled with nigella seeds for a nutty crunch and easy digestion."
    },
    ingredients: {
      uz: ['Qatlama xamir', 'Mol go\'shti', 'Dumba', 'Piyoz', 'Sedana'],
      ru: ['Слоеное тесто', 'Говядина', 'Курдюк', 'Лук', 'Седана'],
      en: ['Layered Pastry', 'Beef & Lamb', 'Onions', 'Nigella Seeds']
    }
  },
  {
    id: 'dish-4',
    name: {
      uz: 'Kovurma Lag\'mon',
      ru: 'Ковурма лагман по-уйгурски',
      en: 'Pan-Fried Kovurma Lagman'
    },
    description: {
      uz: 'Qo\'lda cho\'zilgan cho\'zma xamir, qovurilgan barra mol go\'shti, bolgar qalampiri, pomidor va jannatmonand sous.',
      ru: 'Тянутая вручную упругая лапша, обжаренная на воке сочная говядина, сладкий перец, томаты и специи.',
      en: 'Hand-pulled chewy noodles stir-fried with sliced tender beef, sweet bell peppers, tomatoes, and rich oriental reduction.'
    },
    price: 42000,
    category: 'milliy',
    prepTime: 18,
    weight: '450 g',
    calories: 710,
    diameterCm: 26,
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'lagman',
    tags: ['new', 'halal'],
    spiceLevel: 1,
    allergens: ['Bug\'doy xamiri (Gluten)'],
    touristFact: {
      uz: "Oshpaz xamirni qo'lda bir necha metrga cho'zib, maxsus mahorat bilan tayyorlaydi. Xitoy va Ipak yo'lining qadimiy hamkorligi mevasi.",
      ru: "Шеф-повар вручную вытягивает метровую лапшу ритмичными ударами о стол. Сочетает шёлковые кулинарные традиции Центральной Азии.",
      en: "The master chef stretches each noodle string by hand up to 3 meters without breaking. A fiery stir-fry representing Central Asian Silk Road fusion."
    },
    ingredients: {
      uz: ['Cho\'zma xamir', 'Mol go\'shti', 'Bolgar qalampiri', 'Pomidor', 'Sarimsoq', 'Jusay'],
      ru: ['Тянутая лапша', 'Говядина', 'Болгарский перец', 'Томаты', 'Чеснок', 'Джусай'],
      en: ['Hand-pulled Noodles', 'Beef', 'Bell Peppers', 'Tomatoes', 'Garlic', 'Chives']
    }
  },
  {
    id: 'dish-5',
    name: {
      uz: 'G\'ijduvon Qiyma Shashlik',
      ru: 'Гиждуванский рубленый шашлык',
      en: 'Gijduvan Minced Kebab (2 skewers)'
    },
    description: {
      uz: 'G\'ijduvon usulida o\'ta yumshoq va mayin tayyorlangan qiyma shashlik. Sirka va piyoz bilan tortiladi.',
      ru: 'Легендарный сочный гиждуванский люля-шашлык на мангале. Подаётся с маринованным луком и сумахом.',
      en: 'Legendary charcoal-grilled minced skewers from Gijduvan, supremely juicy and tender. Served with marinated sumac onions.'
    },
    price: 36000,
    category: 'kabob',
    prepTime: 20,
    weight: '2 dona (250 g)',
    calories: 590,
    diameterCm: 30,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'shashlik',
    tags: ['hit', 'halal'],
    spiceLevel: 0,
    allergens: ['Qo\'y go\'shti'],
    touristFact: {
      uz: "Buxoro viloyatining G'ijduvon shaharchasi o'zining erib ketadigan silliq shashligi bilan dunyoga mashhur. Go'sht tog' ko'mirida pishiriladi.",
      ru: "Гиждуван (близ Бухары) славится самым нежным шашлыком в мире. Секрет — в многочасовом созревании рубленого мяса и мангале на саксауле.",
      en: "From the artisan town of Gijduvan near Bukhara. Melt-in-your-mouth minced skewers grilled over hot desert saxaul coals with sumac."
    },
    ingredients: {
      uz: ['Qo\'y go\'shti', 'Dumba yog\'i', 'Zira', 'Kashnich urug\'i', 'Sirka piyoz'],
      ru: ['Баранина', 'Курдюк', 'Зира', 'Кориандр', 'Маринованный лук'],
      en: ['Lamb', 'Tail Fat', 'Cumin', 'Coriander', 'Pickled Onion']
    }
  },
  {
    id: 'dish-6',
    name: {
      uz: 'Achchiq-Chuchuk Salati',
      ru: 'Свежий салат Ачик-Чучук',
      en: 'Traditional Achchik-Chuchuk Salad'
    },
    description: {
      uz: 'Yozgi shirin pomidorlar, nozik to\'g\'ralgan piyoz, achchiq qalampir va rayhon. Osh bilan birga iste\'mol qilinadi.',
      ru: 'Тончайше нарезанные спелые юсуповские томаты, сладкий лук, стручковый перец и ароматный базилик.',
      en: 'Razor-thin slices of ripe sweet tomatoes, crisp onions, fresh purple basil, and a touch of green chili. Ideal companion to plov.'
    },
    price: 18000,
    category: 'salat',
    prepTime: 8,
    weight: '220 g',
    calories: 120,
    diameterCm: 20,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'salat',
    tags: ['vegan', 'halal', 'spicy'],
    spiceLevel: 1,
    allergens: [],
    touristFact: {
      uz: "O'zbekistonda hech bir osh ushbu salatsiz tortilmaydi. Pomidorning tabiiy sharbati go'shtning hazm bo'lishini osonlashtiradi.",
      ru: "Главный спутник плова. Тончайшая нарезка без масла позволяет натуральному томатному соку сбалансировать сытность плова.",
      en: "Never eat Plov without Achchik-chuchuk! Dressed without any oil, the pure sweet tomato essence balances rich lamb with mountain herbs."
    },
    ingredients: {
      uz: ['Yusupov pomidori', 'Oq piyoz', 'Rayhon', 'Achchiq qalampir'],
      ru: ['Помидоры', 'Лук', 'Базилик', 'Острый перец'],
      en: ['Tomatoes', 'White Onion', 'Purple Basil', 'Chili Pepper']
    }
  },
  {
    id: 'dish-7',
    name: {
      uz: 'Katta Qo\'y Sho\'rva',
      ru: 'Шурпа из баранины с овощами',
      en: 'Rich Lamb Shorva Soup'
    },
    description: {
      uz: 'Qo\'y go\'shti suyakli lahm qismi, butun sabzi, kartoshka, no\'xat va shifobaxsh tiniq sho\'rva.',
      ru: 'Прозрачный наваристый бульон, крупный кусок томлёной баранины на косточке, сладкая морковь и картофель.',
      en: 'Slow-simmered rich golden broth with tender bone-in lamb, whole carrots, potatoes, and fragrant mountain herbs.'
    },
    price: 39000,
    category: 'shorva',
    prepTime: 12,
    weight: '450 ml',
    calories: 480,
    diameterCm: 22,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'shorva',
    tags: ['halal'],
    spiceLevel: 0,
    allergens: ['Qo\'y go\'shti'],
    touristFact: {
      uz: "Abu Ali ibn Sino asarlarida sho'rva tanaga quvvat va immunitet beruvchi shifobaxsh taom sifatida zikr etilgan.",
      ru: "В трактатах Авиценны шурпа упоминается как целебное блюдо, восстанавливающее силы путников и укрепляющее здоровье.",
      en: "Celebrated in ancient medical texts by Avicenna (Ibn Sina) as an elixir of strength, slow-simmered for hours over low wood flame."
    },
    ingredients: {
      uz: ['Qo\'y suyakli go\'shti', 'Kartoshka', 'Sabzi', 'No\'xat', 'Kashnich'],
      ru: ['Баранина на кости', 'Картофель', 'Морковь', 'Нут', 'Зелень'],
      en: ['Bone-in Lamb', 'Potatoes', 'Carrots', 'Chickpeas', 'Coriander']
    }
  },
  {
    id: 'dish-8',
    name: {
      uz: 'Samarqand Tandir Noni',
      ru: 'Самаркандская тандырная лепёшка',
      en: 'Samarkand Tandoor Bread'
    },
    description: {
      uz: 'Ganch naqshli, og\'ir va qarsildoq, kunjut sepilgan issiq Samarqand tandir noni.',
      ru: 'Плотная, хрустящая лепёшка с золотистой корочкой и узором из семян кунжута.',
      en: 'Dense, glossy, and crusty artisanal Samarkand clay-oven bread stamped with traditional chekich pattern.'
    },
    price: 8000,
    category: 'non',
    prepTime: 5,
    weight: '300 g',
    calories: 290,
    diameterCm: 24,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    has3d: false,
    modelType: 'somsa',
    tags: ['halal', 'vegan'],
    spiceLevel: 0,
    allergens: ['Bug\'doy uni (Gluten)', 'Kunjut'],
    touristFact: {
      uz: "O'zbek xalqida non muqaddas sanaladi va pichoq bilan emas, faqat ikki qo'l bilan sindirib ulashiladi. Hech qachon teskari qo'yilmaydi.",
      ru: "Нон в Узбекистане священен. Его ломают исключительно двумя руками и никогда не кладут лицевой стороной вниз.",
      en: "Bread is sacred on the Silk Road. Custom requires breaking it by hand with both hands—never cut with a knife or placed upside down."
    },
    ingredients: {
      uz: ['Un', 'Sut', 'Kunjut', 'Xamirturush'],
      ru: ['Мука', 'Молоко', 'Кунжут', 'Дрожжи'],
      en: ['Flour', 'Milk', 'Sesame Seeds', 'Yeast']
    }
  },
  {
    id: 'dish-9',
    name: {
      uz: 'Ko\'k Choy Zafaron bilan (Choynak)',
      ru: 'Зелёный чай №95 с шафраном (Чайник)',
      en: 'Premium Green Tea #95 with Saffron'
    },
    description: {
      uz: 'An\'anaviy paxta gul choynakda tog\' yalpizi, zafaron va novvot bilan damlangan oliy navli ko\'k choy.',
      ru: 'Чайник ароматного зеленого чая 95 с добавлением горной мяты, шафрана и кристального сахара нават.',
      en: 'Authentic Uzbek green tea brewed with mountain mint and saffron in a classic blue-and-white cotton flower teapot.'
    },
    price: 12000,
    category: 'ichimlik',
    prepTime: 5,
    weight: '800 ml',
    calories: 10,
    diameterCm: 16,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    has3d: true,
    modelType: 'choy',
    tags: ['halal', 'vegan'],
    spiceLevel: 0,
    allergens: [],
    touristFact: {
      uz: "Choy quyishdan oldin 3 marta 'qaytariladi' (loy, moy, choy). Piyolaga kam quyilishi — mehmonga 'shoshilmang, suhbatlashamiz' degan ulug' ehtirom belgisidir.",
      ru: "Чай трижды возвращают в чайник («кайтар»), чтобы он настоялся. Наливают ровно на глоток: чем меньше налито, тем больше уважения к гостю.",
      en: "Three pours back into the pot ('kaytar') to marry the infusion. Poured only halfway into the bowl as an invitation to relax and stay longer."
    },
    ingredients: {
      uz: ['Ko\'k choy 95', 'Zafaron', 'Tog\' yalpizi', 'Novvot'],
      ru: ['Зелёный чай 95', 'Шафран', 'Мята', 'Нават'],
      en: ['Green Tea #95', 'Saffron', 'Mountain Mint', 'Navat Sugar']
    }
  }
];

export const CROSS_SELL_ITEMS: Dish[] = [
  INITIAL_DISHES[7], // Samarkand bread (8,000)
  INITIAL_DISHES[8], // Green tea (12,000)
  INITIAL_DISHES[5], // Achchik chuchuk (18,000)
];

export const INITIAL_TABLES: RestaurantTable[] = [
  { number: 1, status: 'free', capacity: 2, zone: 'asosiy', x: 15, y: 20 },
  { number: 2, status: 'occupied', capacity: 4, guestsCount: 3, activeOrderId: '#042', waiterId: 'Dilshod', zone: 'asosiy', x: 35, y: 20 },
  { number: 3, status: 'ready', capacity: 4, guestsCount: 4, activeOrderId: '#045', waiterId: 'Dilshod', zone: 'asosiy', x: 55, y: 20 },
  { number: 4, status: 'occupied', capacity: 6, guestsCount: 5, activeOrderId: '#044', waiterId: 'Alisher', zone: 'asosiy', x: 75, y: 20 },
  { number: 5, status: 'waiting', capacity: 4, guestsCount: 2, activeOrderId: '#047', waiterId: 'Dilshod', zone: 'asosiy', x: 15, y: 55 },
  { number: 6, status: 'free', capacity: 2, zone: 'asosiy', x: 35, y: 55 },
  { number: 7, status: 'bill', capacity: 4, guestsCount: 4, activeOrderId: '#041', waiterId: 'Dilshod', callAlert: 'bill', zone: 'asosiy', x: 55, y: 55 },
  { number: 8, status: 'occupied', capacity: 8, guestsCount: 6, activeOrderId: '#043', waiterId: 'Zuhra', zone: 'asosiy', x: 75, y: 55 },
  { number: 9, status: 'free', capacity: 4, zone: 'terrasa', x: 15, y: 85 },
  { number: 10, status: 'free', capacity: 4, zone: 'terrasa', x: 35, y: 85 },
  { number: 11, status: 'occupied', capacity: 6, guestsCount: 4, activeOrderId: '#046', waiterId: 'Dilshod', zone: 'terrasa', x: 55, y: 85 },
  { number: 12, status: 'free', capacity: 4, zone: 'terrasa', x: 75, y: 85 },
  { number: 13, status: 'occupied', capacity: 10, guestsCount: 8, activeOrderId: '#039', waiterId: 'Alisher', zone: 'vip', x: 90, y: 20 },
  { number: 14, status: 'free', capacity: 12, zone: 'vip', x: 90, y: 55 }
];

export const RESTAURANT_TABLES = INITIAL_TABLES;

export const INITIAL_ORDERS: Order[] = [
  {
    id: '#047',
    tableNumber: 5,
    items: [
      { id: 'it-1', dish: INITIAL_DISHES[0], quantity: 2, comment: 'Piyoz kamroq, sabzisi ko\'proq bo\'lsin' },
      { id: 'it-2', dish: INITIAL_DISHES[5], quantity: 1, comment: 'Achchiq qilmang' }
    ],
    status: 'new',
    subtotal: 108000,
    serviceFee: 10800,
    total: 118800,
    createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
    estimatedMinutes: 15,
    customerNote: 'Achchiq qilmang, bolalar ham yeydi',
    waiterName: 'Dilshod',
    paymentStatus: 'unpaid',
    isArInfluenced: true
  },
  {
    id: '#046',
    tableNumber: 11,
    items: [
      { id: 'it-3', dish: INITIAL_DISHES[3], quantity: 1 },
      { id: 'it-4', dish: INITIAL_DISHES[4], quantity: 2 },
      { id: 'it-5', dish: INITIAL_DISHES[8], quantity: 1 }
    ],
    status: 'cooking',
    subtotal: 126000,
    serviceFee: 12600,
    total: 138600,
    createdAt: new Date(Date.now() - 8 * 60 * 1000), // 8 min ago
    estimatedMinutes: 8,
    waiterName: 'Dilshod',
    paymentStatus: 'unpaid',
    isArInfluenced: true
  },
  {
    id: '#045',
    tableNumber: 3,
    items: [
      { id: 'it-6', dish: INITIAL_DISHES[2], quantity: 3 },
      { id: 'it-7', dish: INITIAL_DISHES[8], quantity: 1 }
    ],
    status: 'ready',
    subtotal: 60000,
    serviceFee: 6000,
    total: 66000,
    createdAt: new Date(Date.now() - 14 * 60 * 1000), // 14 min ago
    estimatedMinutes: 0,
    waiterName: 'Dilshod',
    paymentStatus: 'unpaid',
    isArInfluenced: false
  }
];

export const INITIAL_ANALYTICS = {
  todayRevenue: 4800000,
  todayOrders: 87,
  avgCheck: 55172,
  tablesOccupied: '18/24',
  arViewsToday: 143,
  arViewsMonth: 2847,
  arConversionRate: 38.4,
  arCheckImpactPct: 31.3,
  avgCheckWithAr: 68400,
  avgCheckWithoutAr: 52100,
  monthlyArExtraRevenue: 14200000,
  monthlySubscriptionCost: 590000,
  roiMultiplier: 24,
  hourlySales: [
    { hour: '11:00', amount: 320000 },
    { hour: '12:00', amount: 640000 },
    { hour: '13:00', amount: 1100000 },
    { hour: '14:00', amount: 950000 },
    { hour: '15:00', amount: 480000 },
    { hour: '16:00', amount: 290000 },
    { hour: '17:00', amount: 380000 },
    { hour: '18:00', amount: 720000 },
    { hour: '19:00', amount: 1350000 },
    { hour: '20:00', amount: 1580000 },
    { hour: '21:00', amount: 890000 }
  ]
};
