// Boshqaruv paneli sahifasi (pages/Dashboard). Kalit — o'zbekcha matn. Ko'plik shakllari '|' bilan ({n} bo'yicha tanlanadi).
// Server xabarlari: backend/web/resto_admin_views.py (dashboard_summary_api).
export default {
  'Jami bugun: {n} ta': 'Всего за сегодня: {n}',
  '{n} ta taom stop-listda': '{n} блюдо в стоп-листе|{n} блюда в стоп-листе|{n} блюд в стоп-листе',
  'Barcha taomlar mavjud': 'Все блюда в наличии',
  'Bugun hali buyurtmalar rasmiylashtirilmadi.': 'Сегодня заказов ещё не оформлено.',
  "Hozirda barcha taomlar oshxonada yetarli! Stop-list bo'sh.": 'Сейчас все блюда есть на кухне! Стоп-лист пуст.',
  "{n} ta taom mijozlar uchun to'xtatilgan (stop-listda).":
    '{n} блюдо недоступно для гостей (в стоп-листе).|{n} блюда недоступны для гостей (в стоп-листе).|{n} блюд недоступны для гостей (в стоп-листе).',

  // Server xabarlari (xato oynasida ko'rinadi)
  'Avval tizimga kiring.': 'Сначала войдите в систему.',
  'Restoran boshqaruviga ruxsat berilmagan.': 'Нет доступа к управлению рестораном.',
  'Xodimga biriktirilgan restoran topilmadi.': 'Ресторан, закреплённый за сотрудником, не найден.',
} as Record<string, string>
