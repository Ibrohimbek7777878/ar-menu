// Dashboard page (pages/Dashboard). The key is the Uzbek text. Plural forms are separated by '|' (picked by {n}).
// Server messages: backend/web/resto_admin_views.py (dashboard_summary_api).
export default {
  'Jami bugun: {n} ta': 'Total today: {n}',
  '{n} ta taom stop-listda': '{n} dish on the stop list|{n} dishes on the stop list',
  'Barcha taomlar mavjud': 'All dishes are available',
  'Bugun hali buyurtmalar rasmiylashtirilmadi.': 'No orders have been placed yet today.',
  "Hozirda barcha taomlar oshxonada yetarli! Stop-list bo'sh.": 'All dishes are in stock in the kitchen right now. The stop list is empty.',
  "{n} ta taom mijozlar uchun to'xtatilgan (stop-listda).":
    '{n} dish is unavailable to guests (on the stop list).|{n} dishes are unavailable to guests (on the stop list).',

  // Server messages (shown in the error state)
  'Avval tizimga kiring.': 'Please sign in first.',
  'Restoran boshqaruviga ruxsat berilmagan.': 'You do not have access to restaurant management.',
  'Xodimga biriktirilgan restoran topilmadi.': 'No restaurant is assigned to this staff member.',
} as Record<string, string>
