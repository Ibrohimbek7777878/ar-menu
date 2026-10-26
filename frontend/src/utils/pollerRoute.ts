/**
 * Poller marshrut ehtiyojlarini aniqlash (TZ 0.5)
 *
 * /kds, /kitchen -> faqat buyurtmalar
 * /waiter, /ofitsiant -> buyurtmalar, stollar, chaqiruvlar
 * /arrival, /hostess -> faqat stollar
 * /admin* boshqaruv markazi -> buyurtmalar va stollar (moliya EMAS)
 * moliya (/finance, /menu/finance, /admin/finance) -> faqat moliya (faqat admin uchun)
 * Boshqa sahifalarda (mehmon: /menu, /cart, /checkout, /ar va h.k.) -> so'rov yo'q
 */

export interface PollNeeds {
  wantsOrders: boolean;
  wantsTables: boolean;
  wantsCalls: boolean;
  wantsFinance: boolean;
}

export function determinePollNeeds(role: string, pathname: string): PollNeeds {
  // Mehmon uchun hech qanday xodim polling so'rovi bo'lmaydi
  if (role === 'guest') {
    return { wantsOrders: false, wantsTables: false, wantsCalls: false, wantsFinance: false };
  }

  const p = (pathname || '').toLowerCase();

  // 1. Moliya sahifasi (/finance, /menu/finance, /admin/finance)
  if (p.includes('/finance')) {
    return {
      wantsOrders: false,
      wantsTables: false,
      wantsCalls: false,
      wantsFinance: role === 'admin',
    };
  }

  // 2. KDS / Oshxona (/kds, /kitchen, /menu/kitchen)
  if (p.includes('/kds') || p.includes('/kitchen')) {
    return {
      wantsOrders: role === 'admin' || role === 'kitchen' || role === 'waiter',
      wantsTables: false,
      wantsCalls: false,
      wantsFinance: false,
    };
  }

  // 3. Waiter / Ofitsiant (/waiter, /ofitsiant, /menu/waiter)
  if (p.includes('/waiter') || p.includes('/ofitsiant')) {
    return {
      wantsOrders: role === 'admin' || role === 'waiter',
      wantsTables: role === 'admin' || role === 'waiter',
      wantsCalls: role === 'admin' || role === 'waiter',
      wantsFinance: false,
    };
  }

  // 4. Hostess / Stol boshqaruvi (/arrival, /hostess, /menu/hostess, /table, /menu/table)
  if (p.includes('/arrival') || p.includes('/hostess') || p.includes('/table')) {
    return {
      wantsOrders: false,
      wantsTables: role === 'admin' || role === 'waiter' || role === 'hostess',
      wantsCalls: false,
      wantsFinance: false,
    };
  }

  // 5. Admin Boshqaruv Markazi (/admin, /menu/admin, /admin/dashboard)
  if (p.includes('/admin')) {
    return {
      wantsOrders: role === 'admin',
      wantsTables: role === 'admin',
      wantsCalls: false,
      wantsFinance: false, // Moliya ochilmaganda finance so'rovi yo'q! (TZ 0.5)
    };
  }

  // Qolgan yo'llarda xodim so'rovlari yo'q
  return { wantsOrders: false, wantsTables: false, wantsCalls: false, wantsFinance: false };
}
