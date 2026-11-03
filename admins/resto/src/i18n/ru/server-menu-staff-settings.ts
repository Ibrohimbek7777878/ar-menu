// Menyu, ommaviy qo'shish, xodimlar va sozlamalar: backendning React API'si qaytaradigan matnlar.
// Kalit — serverdagi AYNAN o'sha matn; sahifa ularni t(server_matni) bilan o'giradi (kalit topilmasa o'zbekcha ko'rinadi).
// 'Restoran topilmadi' boshqa faylda (server-finance.ts / server-tables-orders.ts) bor.
// Parametrli server matnlari tarjima qilinmaydi (qiymat matn ichiga yozilib keladi, shuning uchun kalit bo'la olmaydi): «maydon» ... kiritilishi shart / bo'lishi kerak (api_input.py),
// 'Faqat dastlabki N ta qator olindi', 'N ta qator o'qilmadi', 'Matn juda uzun (…)', 'Noto'g'ri rol. Mumkin bo'lganlar: …', 'Parol yetarli kuchli emas: …' va h.k.
export default {
  // Menyu API (backend/orders/interfaces/api/menu_admin.py, menu_import_views.py)
  'Kategoriya topilmadi yoki sizga ruxsat etilmagan': 'Категория не найдена, или у вас нет к ней доступа',
  "Rasm tokeni yaroqsiz, muddati o'tgan (2 soat), allaqachon ishlatilgan yoki boshqa restoranniki. Rasmni qaytadan tanlang.": 'Код фото недействителен: срок его действия истёк (2 часа), он уже использован или принадлежит другому ресторану. Выберите фото заново.',
  "Do'kon topilmadi.": 'Ресторан не найден.',
  'Taom narxi kiritilishi shart.': 'Укажите цену блюда.',
  "Rasm faylini ham, image_token ni ham bir vaqtda yuborib bo'lmaydi — bittasini tanlang": 'Нельзя отправить одновременно файл фото и код фото: выберите что-то одно',
  "Taom topilmadi yoki unga ruxsatingiz yo'q.": 'Блюдо не найдено, или у вас нет к нему доступа.',
  'Rasm tanlanmadi.': 'Фото не выбрано.',
  'Rasm hajmi 10 MB dan oshmasligi kerak.': 'Размер фото не должен превышать 10 МБ.',
  // 
  // Ommaviy qo'shish (backend/products/menu_import/service.py): o'qish xatolari, izohlar va qator xatolari
  "Rasmdan taom topilmadi. Rasmni aniqroq va yorug' qilib oling (matn to'liq ko'rinsin), yoki menyuni matn/Excel/PDF qilib yuboring.": 'На фото блюда не найдены. Сделайте снимок чётче и при хорошем освещении (чтобы текст был виден полностью) или отправьте меню текстом, в Excel или PDF.',
  "PDF dan taom topilmadi. Menyu matn ko'rinishida bo'lsin yoki PDF o'rniga Excel/matn yuboring.": 'В PDF блюда не найдены. Пусть меню будет в текстовом виде, или отправьте вместо PDF файл Excel либо текст.',
  "Fayldan taom topilmadi. Birinchi ustunda taom nomi, ikkinchisida narx bo'lsin (birinchi qatorda «Nomi», «Narxi» sarlavhasi bo'lsa yaxshi).": 'В файле блюда не найдены. В первом столбце должно быть название блюда, во втором — цена (хорошо, если в первой строке есть заголовки «Название» и «Цена»).',
  "Matndan taom topilmadi. Har qatorni «Taom nomi - narx» ko'rinishida yozing, masalan: Osh - 45 000.": 'В тексте блюда не найдены. Пишите каждую строку в виде «Название блюда - цена», например: Плов - 45 000.',
  'Fayl va matnni birga yubormang: bittasini tanlang.': 'Не отправляйте файл и текст вместе: выберите что-то одно.',
  'Fayl yoki matn yuboring.': 'Отправьте файл или текст.',
  "Matn bo'sh. Menyuni «Osh - 45 000» ko'rinishida qatorma-qator joylang.": 'Текст пуст. Вставьте меню построчно в виде «Плов - 45 000».',
  "Qo'shiladigan qatorlar yo'q.": 'Нет строк для добавления.',
  "Rasmni vaqtincha saqlab bo'lmadi: uni qatorga keyin qo'lda biriktiring.": 'Не удалось временно сохранить фото: прикрепите его к строке позже вручную.',
  "AI hozir ishlamayapti: matn oddiy qoidalar bilan o'qildi.": 'ИИ сейчас не работает: текст разобран по простым правилам.',
  'Narx kiritilishi shart.': 'Укажите цену.',
  'Taom nomi kiritilishi shart.': 'Укажите название блюда.',
  "Noto'g'ri qiymat": 'Недопустимое значение',
  'Kategoriya topilmadi yoki sizga ruxsat etilmagan.': 'Категория не найдена, или у вас нет к ней доступа.',
  'Yangilanadigan taom topilmadi yoki sizga ruxsat etilmagan.': 'Обновляемое блюдо не найдено, или у вас нет к нему доступа.',
  "Bu taom ro'yxatda ikki marta yangilanmoqda.": 'Это блюдо обновляется в списке дважды.',
  "Rasm kodi noto'g'ri. Rasmni qayta tanlang.": 'Неверный код фото. Выберите фото заново.',
  "Rasm muddati tugagan yoki topilmadi (2 soatdan keyin o'chadi). Rasmni qayta tanlang.": 'Срок действия фото истёк, или фото не найдено (через 2 часа оно удаляется). Выберите фото заново.',
  'Bu rasm boshqa qatorda ham ishlatilgan. Har qatorga alohida rasm tanlang.': 'Это фото уже используется в другой строке. Выберите отдельное фото для каждой строки.',
  'Rasm biriktirish hozircha mavjud emas.': 'Прикрепление фото пока недоступно.',
  // 
  // Xodimlar API (backend/accounts/interfaces/api/staff_admin.py)
  'Login kiritilishi shart': 'Укажите логин',
  'Menejer egalik yoki menejer rolini bera olmaydi': 'Менеджер не может назначать роль владельца или менеджера',
  "O'z akkauntingizni bloklay olmaysiz": 'Вы не можете заблокировать собственный аккаунт',
  'Menejer egasi yoki boshqa menejerni bloklay olmaydi': 'Менеджер не может блокировать владельца или другого менеджера',
  "Do'konning oxirgi egasini bloklab bo'lmaydi": 'Нельзя заблокировать последнего владельца ресторана',
  'Menejer egasi yoki boshqa menejerni blokdan chiqara olmaydi': 'Менеджер не может разблокировать владельца или другого менеджера',
  'Menejer egasi yoki boshqa menejer parolini tiklay olmaydi': 'Менеджер не может сбросить пароль владельца или другого менеджера',
  "Rahbariyat parolini bu yerdan o'zgartirib bo'lmaydi": 'Пароль руководства нельзя изменить отсюда',
  "O'z rolingizni o'zgartira olmaysiz": 'Вы не можете изменить собственную роль',
  "O'z rolingizni ko'tara olmaysiz": 'Вы не можете повысить собственную роль',
  "Menejer egasi yoki boshqa menejerni o'zgartira olmaydi": 'Менеджер не может изменять владельца или другого менеджера',
  "Do'konning oxirgi egasini tushirish mumkin emas": 'Нельзя понизить последнего владельца ресторана',
  // 
  // Sozlamalar API (backend/shops/interfaces/api/settings_admin.py, backend/api_input.py)
  "Restoran nomi bo'sh bo'lishi mumkin emas": 'Название ресторана не может быть пустым',
  "Rang #RGB yoki #RRGGBB ko'rinishida bo'lishi kerak": 'Цвет должен быть в формате #RGB или #RRGGBB',
  'Bu Telegram chat ID boshqa restoranga biriktirilgan': 'Этот ID чата Telegram привязан к другому ресторану',
  "Telegram chat ID butun son bo'lishi kerak (masalan 123456789 yoki -1001234567890)": 'ID чата Telegram должен быть целым числом (например, 123456789 или -1001234567890)',
} as Record<string, string>;
