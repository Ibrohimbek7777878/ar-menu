"""
Hajmli sinov ma'lumoti (yuk testlari va PostgreSQL `EXPLAIN (ANALYZE)` uchun). TZ: ROADMAP_MASSHTAB S0-2.

    DEBUG=True python manage.py seed_load                                   # 5 restoran, 150 taom, 20 stol, 1 000 000 buyurtma
    LOAD_SEED_ALLOWED=1 python manage.py seed_load --orders 200000 --days 180
    python manage.py seed_load --shops 2 --products-per-shop 8 --orders 120 --seed 7

Nima yaratadi: `load-resto-N` restoranlari (egasi `load_owner_N`, parolsiz), har birida taomlar (`load-N-NNN`), stollar,
moliya kategoriyalari va JAMI `--orders` ta buyurtma: har biri 2-5 qatorli (OrderItem), so'nggi `--days` kunga yoyilgan
(tushlik 12-14 va kechki 18-22 soatlarda zichroq, juma-yakshanba ko'proq). Holatlar real: asosan yakunlangan, ~6% bekor
qilingan, BUGUNGI kun uchun faol (kutilmoqda/tayyorlanmoqda/tayyor) buyurtmalar bor. To'langan buyurtma uchun kassa kirimi
(`finance_transactions`) ham yoziladi: maydonlar `finance.services.order_integration.record_order_payment_income` natijasiga
mos (kategoriya, sarlavha, izoh, `stage='income'`), faqat sana/vaqt buyurtma vaqtidan olinadi.

Xavfsizlik (seed_e2e kabi): faqat DEBUG=True yoki LOAD_SEED_ALLOWED=1 bilan ishlaydi. Bazada `load-` bilan boshlanmagan
restoran bo'lsa to'xtaydi (`--allow-existing` bilan ixtiyoriy). Hech qachon tarmoqqa chiqmaydi; `bulk_create` signal
yubormaydi, shuning uchun outbox/Telegram/bildirishnoma yozuvlari YARATILMAYDI.

Idempotent: qayta yurgizilsa restoran/taom/stollar qayta ishlatiladi, buyurtmalar faqat `--orders` ga yetishmagan soniga
to'ldiriladi (maqsad restoranlardagi buyurtmalar sanaladi). Natija `--seed` bilan deterministik (bir xil argumentlar va
partiya hajmida bir xil ma'lumot); holatlar va "bugun" ishga tushirilgan vaqtga nisbatan hisoblanadi.

Xotira: buyurtmalar `--batch` tadan partiyalab yaratiladi va yoziladi; butun to'plam RAMda ushlanmaydi.
"""
import io
import os
import random
import time
from bisect import bisect
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from datetime import time as dtime
from decimal import Decimal
from itertools import accumulate

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, reset_queries, transaction
from django.db.models import Max
from django.utils import timezone

from categories.models import Category
from finance.models import FinanceTransaction
from finance.services.defaults import seed_default_categories_for_shop
from finance.services.order_integration import _income_category
from orders.models import Order, OrderItem
from products.models import Product
from shops.models import Shop
from tables_restaurant.models import Table

SHOP_PREFIX = 'load-'
ORDER_PREFIX = 'LD-'                      # buyurtma raqami: LD-000000001 (12 belgi, order_number max_length=20)
LIVE_MIN = 10                             # kamida shuncha buyurtma "hozir" faol bo'ladi (KDS/stollar so'rovlari bo'sh qolmasin)
LIVE_PER = 2000                           # va har shuncha buyurtmaga bittadan (1 000 000 da 500 ta faol)
CANCEL_RATIO = 0.06                       # tugagan (faol bo'lmagan) buyurtmalarning bekor qilingan ulushi
PAYMENT_CARD_RATIO = 0.45                 # to'langanlarning kartadagi ulushi (qolgani naqd)
DISCOUNT_RATIO = 0.06                     # chegirmali buyurtmalar ulushi
DELIVERY_RATIO = 0.07                     # yetkazib berish buyurtmalari
PICKUP_RATIO = 0.08                       # olib ketish buyurtmalari (qolgani zaldagi stol)
DELIVERY_FEE = 6000                       # Shop.delivery_fee standarti
FREE_DELIVERY_FROM = 50000                # Shop.free_delivery_from standarti
ACTIVE_STATUSES = ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery')

# (nom, kurs (OrderItem.course), narx min, narx max, tayyorlanish daqiqasi, taomlar ulushi, nomlar)
MENU_CATEGORIES = (
    ("Sho'rvalar", '1-taom', 22000, 48000, 20, 12, ('Mastava', "Sho'rva", "Lag'mon", "Moshxo'rda", 'Chuchvara', 'Mampar', 'Kuksi')),
    ('Milliy taomlar', '2-taom', 35000, 95000, 25, 34, ('Palov', 'Manti', 'Shashlik', 'Dimlama', 'Kabob', "Tandir go'sht", 'Qozon kabob', 'Norin')),
    ('Salatlar', 'salat', 14000, 32000, 7, 14, ('Achchiq-chuchuk', 'Sezar', 'Yunon salati', 'Olivye', 'Toshkent salati', 'Sabzavotli salat')),
    ('Ichimliklar', 'ichimlik', 5000, 22000, 3, 28, ("Ko'k choy", 'Qora choy', 'Kola', 'Limonad', 'Kompot', 'Ayron', 'Sharbat', 'Mineral suv')),
    ('Shirinliklar', 'shirinlik', 12000, 38000, 8, 12, ('Chak-chak', 'Napoleon', 'Medovik', 'Muzqaymoq', 'Paxlava', 'Tort')),
)
DISH_VARIANTS = ('', 'katta', 'kichik', 'maxsus', 'oilaviy', 'achchiq', 'yangi', 'klassik')

CUSTOMER_NAMES = ('Mehmon', 'Aziz', 'Dilshod', 'Malika', 'Jasur', 'Nodira', 'Bobur', 'Madina', 'Sardor', 'Zilola',
                  'Otabek', 'Feruza', 'Sherzod', 'Shahlo', 'Rustam', 'Gulnora')
STREETS = ('Mustaqillik', 'Navoiy', 'Amir Temur', 'Bobur', 'Alisher Navoiy', 'Sayilgoh', 'Yangi hayot')
CANCEL_REASONS = (
    ('Mijoz fikridan qaytdi', 'customer_changed_mind'),
    ('Taom tugagan', 'out_of_stock'),
    ('Juda uzoq kutildi', 'too_long'),
)

# Soatlar bo'yicha talab: tushlik (12-14) va kechki (18-22) cho'qqilar
HOUR_WEIGHTS = {9: 1, 10: 2, 11: 4, 12: 9, 13: 10, 14: 6, 15: 3, 16: 2, 17: 4, 18: 8, 19: 10, 20: 9, 21: 6, 22: 2}
HOURS = tuple(HOUR_WEIGHTS)
HOURS_CUM = tuple(accumulate(HOUR_WEIGHTS.values()))
# Hafta kunlari (0=dushanba): dam olish kunlariga yaqin ko'proq
WEEKDAY_WEIGHT = (1.0, 1.0, 1.0, 1.05, 1.35, 1.6, 1.4)


@dataclass
class ShopCtx:
    """Bitta restoranning buyurtma yaratish uchun kerakli (xotirada kichik) ma'lumotlari."""
    id: int
    index: int
    slug: str
    tables: list                                    # [(table_id, number)]
    products: list                                  # [(id, name, Decimal narx, int narx, kurs)]
    product_cum: list                               # mashhurlik bo'yicha yig'indi og'irliklar
    cat_table: int | None = None                    # kassa kirim kategoriyasi: zal
    cat_delivery: int | None = None                 # kassa kirim kategoriyasi: yetkazib berish / olib ketish


@dataclass
class RunCtx:
    """Bitta ishga tushirishning umumiy qiymatlari."""
    seed: int
    paid_target: float                              # tugagan va bekor qilinmagan buyurtmalarning to'lanish ehtimoli
    shops: list
    shop_cum: list
    day_bases: list                                 # [d] -> shu kun 00:00 (aware)
    day_dates: list                                 # [d] -> sana
    day_cum: list
    now: datetime
    now_sec: int
    created_counters: dict = field(default_factory=lambda: {'orders': 0, 'items': 0, 'txs': 0, 'paid': 0})


@contextmanager
def _manual_timestamps(*models):
    """
    `auto_now`/`auto_now_add` ni vaqtincha o'chiradi: aks holda bulk_create barcha `created_at`/`updated_at` ni "hozir" bilan
    almashtirib, buyurtmalarni bir kunga yig'ib qo'yardi. Chiqishda har doim asl holat qaytariladi.
    """
    saved = []
    try:
        for model in models:
            for fld in model._meta.concrete_fields:
                if getattr(fld, 'auto_now', False) or getattr(fld, 'auto_now_add', False):
                    saved.append((fld, fld.auto_now, fld.auto_now_add))
                    fld.auto_now = fld.auto_now_add = False
        yield
    finally:
        for fld, auto_now, auto_now_add in saved:
            fld.auto_now, fld.auto_now_add = auto_now, auto_now_add


class Command(BaseCommand):
    help = "Yuk testlari va EXPLAIN ANALYZE uchun hajmli sinov ma'lumoti: restoranlar, taomlar, stollar, buyurtmalar, kassa (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument('--shops', type=int, default=5, help="Restoranlar soni (standart: 5)")
        parser.add_argument('--products-per-shop', type=int, default=150, help="Har restorandagi taomlar (standart: 150, kamida 5)")
        parser.add_argument('--tables-per-shop', type=int, default=20, help="Har restorandagi stollar (1..200, standart: 20)")
        parser.add_argument('--orders', type=int, default=1_000_000, help="JAMI buyurtmalar (barcha load- restoranlar bo'yicha, standart: 1 000 000)")
        parser.add_argument('--days', type=int, default=365, help="Buyurtmalar so'nggi necha kunga yoyiladi (standart: 365)")
        parser.add_argument('--paid-ratio', type=float, default=0.8, help="Jami buyurtmalarning to'langan ulushi 0..1 (standart: 0.8)")
        parser.add_argument('--batch', type=int, default=5000, help="Bir partiyadagi buyurtmalar (standart: 5000; xotira shunga bog'liq)")
        parser.add_argument('--seed', type=int, default=42, help="Tasodifiy sonlar urug'i (deterministik, standart: 42)")
        parser.add_argument('--allow-existing', action='store_true',
                            help="Bazada load- bo'lmagan restoranlar bo'lsa ham davom etish (faqat shaxsiy test bazasida!)")

    # ------------------------------------------------------------------ asosiy oqim
    def handle(self, *args, **opts):
        if not (settings.DEBUG or os.environ.get('LOAD_SEED_ALLOWED') == '1'):
            raise CommandError("seed_load faqat DEBUG=True yoki LOAD_SEED_ALLOWED=1 bilan ishlaydi (production'da yurgizilmaydi)")
        self._validate(opts)
        foreign = Shop.objects.exclude(slug__startswith=SHOP_PREFIX).count()
        if foreign and not opts['allow_existing']:
            raise CommandError(
                f"Bazada {foreign} ta '{SHOP_PREFIX}' bilan boshlanmagan restoran bor. Hajmli ma'lumot uchun alohida sinov bazasi "
                "ishlating (yoki ongli ravishda --allow-existing)."
            )

        started = time.monotonic()
        self.stdout.write(f"Baza: {connection.vendor} ({connection.settings_dict.get('NAME')}), seed={opts['seed']}")
        shops = self._reference_data(opts)
        ctx = self._run_context(opts, shops)
        shop_ids = [s.id for s in shops]

        existing = Order.all_objects.filter(shop_id__in=shop_ids).count()
        missing = max(0, opts['orders'] - existing)
        self.stdout.write(f"Buyurtmalar: bor {existing}, maqsad {opts['orders']}, yaratiladi {missing}")
        orders_started = time.monotonic()
        if missing:
            self._create_orders(ctx, opts, missing)
            self._sync_table_statuses(shop_ids)
        orders_elapsed = time.monotonic() - orders_started
        self._analyze()

        made = ctx.created_counters
        total_time = time.monotonic() - started
        rate = made['orders'] / orders_elapsed if orders_elapsed > 0 else 0
        self.stdout.write(self.style.SUCCESS(
            f"Tayyor: {len(shops)} restoran, {sum(len(s.products) for s in shops)} taom, {sum(len(s.tables) for s in shops)} stol; "
            f"buyurtma jami {existing + made['orders']} (yangi {made['orders']}, shundan to'langan {made['paid']}), "
            f"{made['items']} qator, {made['txs']} kassa kirimi."
        ))
        self.stdout.write(f"  Vaqt: {total_time:.1f} s (buyurtmalar: {orders_elapsed:.1f} s, {rate:,.0f} buyurtma/s)")

    @staticmethod
    def _validate(opts):
        if opts['shops'] < 1:
            raise CommandError("--shops kamida 1 bo'lishi kerak")
        if opts['products_per_shop'] < 5:
            raise CommandError("--products-per-shop kamida 5 bo'lishi kerak (har buyurtmada 2-5 xil taom)")
        if not 1 <= opts['tables_per_shop'] <= 200:
            raise CommandError("--tables-per-shop 1 dan 200 gacha bo'lishi kerak")
        if opts['orders'] < 0:
            raise CommandError("--orders manfiy bo'lmasligi kerak")
        if not 1 <= opts['days'] <= 3650:
            raise CommandError("--days 1 dan 3650 gacha bo'lishi kerak")
        if not 0 <= opts['paid_ratio'] <= 1:
            raise CommandError("--paid-ratio 0 dan 1 gacha bo'lishi kerak")
        if opts['batch'] < 1:
            raise CommandError("--batch kamida 1 bo'lishi kerak")

    # ------------------------------------------------------------------ restoran, menyu, stollar
    def _reference_data(self, opts):
        """Restoranlar, taomlar, stollar, kategoriyalar (bor bo'lsa qayta ishlatiladi). ShopCtx ro'yxatini qaytaradi."""
        categories = self._categories()
        result = []
        for index in range(1, opts['shops'] + 1):
            with transaction.atomic():
                slug = f'{SHOP_PREFIX}resto-{index}'
                call_command(   # restoran, egasi (parolsiz-tasodifiy), zal va stollar; bor bo'lsa yetishmaganlari qo'shiladi
                    'create_restaurant', name=f'Yuk Restoran {index}', slug=slug, owner=f'load_owner_{index}',
                    tables=opts['tables_per_shop'], hall='Asosiy zal', no_default=True, stdout=io.StringIO(),
                )
                shop = Shop.objects.get(slug=slug)
                self._create_missing_products(shop, index, opts, categories)
                seed_default_categories_for_shop(shop)
                result.append(self._shop_ctx(shop, index, opts))
        return result

    @staticmethod
    def _categories():
        categories = {}
        for order, (name, _course, _lo, _hi, _prep, _share, _names) in enumerate(MENU_CATEGORIES, start=1):
            category = Category.objects.filter(name=name, is_restaurant=True).first()
            if category is None:
                category = Category.objects.create(
                    name=name, name_uz=name, name_ru=name, icon='utensils', sort_order=order, is_restaurant=True,
                )
            categories[name] = category
        return categories

    @staticmethod
    def _menu_specs(seed, index, count):
        """Restoran menyusi: `count` ta taom (deterministik; nom, narx, kategoriya)."""
        rng = random.Random(f'{seed}:menu:{index}')
        cum = list(accumulate(row[5] for row in MENU_CATEGORIES))
        used, specs = set(), []
        for number in range(1, count + 1):
            row = MENU_CATEGORIES[min(bisect(cum, rng.random() * cum[-1]), len(cum) - 1)]
            name = f'{rng.choice(row[6])} {rng.choice(DISH_VARIANTS)}'.strip()
            if name in used:
                name = f'{name} {number}'
            used.add(name)
            specs.append({
                'slug': f'{SHOP_PREFIX}{index}-{number:03d}', 'name': name, 'category': row[0],
                'price': Decimal(rng.randrange(row[2], row[3] + 1, 500)), 'prep': row[4] + rng.randrange(0, 8),
                'has_3d': rng.random() < 0.25, 'is_hit': rng.random() < 0.1,
            })
        return specs

    def _create_missing_products(self, shop, index, opts, categories):
        # all_objects: yashirilgan (soft delete) nusxa ham slugni band qiladi, qayta yaratilmaydi
        existing = set(Product.all_objects.filter(shop=shop, slug__startswith=f'{SHOP_PREFIX}{index}-').values_list('slug', flat=True))
        new = []
        for spec in self._menu_specs(opts['seed'], index, opts['products_per_shop']):
            if spec['slug'] in existing:
                continue
            new.append(Product(
                shop=shop, name=spec['name'], slug=spec['slug'], price=spec['price'], unit='porsiya',
                category=categories[spec['category']], prep_minutes=spec['prep'], cook_min=spec['prep'],
                is_available=True, has_real_photo=False, has_3d=spec['has_3d'], is_hit=spec['is_hit'],
            ))
        Product.all_objects.bulk_create(new)   # signal yo'q: menyu keshi o'zgartirilmaydi (yangi restoran uchun kesh bo'sh)

    @staticmethod
    def _shop_ctx(shop, index, opts):
        category_course = {name: course for name, course, *_rest in MENU_CATEGORIES}
        rows = list(Product.objects.filter(shop=shop, slug__startswith=f'{SHOP_PREFIX}{index}-', is_available=True)
                    .order_by('id').values_list('id', 'name', 'price', 'category__name'))
        if len(rows) < 5:
            raise CommandError(f"{shop.slug}: buyurtma uchun kamida 5 ta mavjud taom kerak (hozir {len(rows)})")
        products = [(pid, name, price, int(price), category_course.get(cat, '2-taom')) for pid, name, price, cat in rows]
        ranks = list(range(len(products)))
        random.Random(f'{opts["seed"]}:popularity:{index}').shuffle(ranks)
        weights = [1.0 / (1 + rank) ** 0.9 for rank in ranks]      # Zipf: bir necha taom juda ommabop
        tables = list(Table.objects.filter(shop=shop, is_active=True).order_by('id').values_list('id', 'number'))
        if not tables:
            raise CommandError(f"{shop.slug}: faol stol yo'q")
        return ShopCtx(
            id=shop.pk, index=index, slug=shop.slug, tables=tables, products=products, product_cum=list(accumulate(weights)),
            cat_table=getattr(_income_category(shop, True), 'pk', None),
            cat_delivery=getattr(_income_category(shop, False), 'pk', None),
        )

    # ------------------------------------------------------------------ buyurtmalar
    @staticmethod
    def _run_context(opts, shops):
        now = timezone.localtime()
        today = now.date()
        tz = timezone.get_current_timezone()
        days = opts['days']
        dates = [today - timedelta(days=d) for d in range(days)]
        bases = [timezone.make_aware(datetime.combine(day, dtime.min), tz) for day in dates]
        # Kun og'irligi: hafta kuni bo'yicha (dam olish kunlari ko'proq)
        day_cum = list(accumulate(WEEKDAY_WEIGHT[day.weekday()] for day in dates))
        shop_cum = list(accumulate(1.0 / (1 + 0.3 * k) for k in range(len(shops))))     # birinchi restoran gavjumroq
        cancel_free = 1.0 - CANCEL_RATIO
        return RunCtx(
            seed=opts['seed'], paid_target=min(1.0, opts['paid_ratio'] / cancel_free), shops=shops, shop_cum=shop_cum,
            day_bases=bases, day_dates=dates, day_cum=day_cum, now=now,
            now_sec=now.hour * 3600 + now.minute * 60 + now.second,
        )

    def _next_index(self):
        """Keyingi buyurtma tartib raqami: mavjud `LD-` raqamlarining eng kattasidan keyin (to'qnashuvsiz davom ettirish)."""
        highest = Order.all_objects.filter(order_number__startswith=ORDER_PREFIX).aggregate(m=Max('order_number'))['m']
        return int(highest[len(ORDER_PREFIX):]) + 1 if highest else 1

    def _create_orders(self, ctx, opts, missing):
        index = self._next_index()
        batch = opts['batch']
        last_report = time.monotonic()
        done = 0
        live_left = min(missing, max(LIVE_MIN, missing // LIVE_PER))
        with _manual_timestamps(Order, FinanceTransaction):
            while done < missing:
                count = min(batch, missing - done)
                live = min(live_left, count)
                live_left -= live
                self._insert_batch(ctx, index, count, batch, live)
                index += count
                done += count
                reset_queries()    # DEBUG=True da Django har SQL matnini (bir necha MB) eslab qoladi: xotira to'lmasin
                if time.monotonic() - last_report >= 5 or done == missing:
                    last_report = time.monotonic()
                    self.stdout.write(f"  ... {done}/{missing} buyurtma")

    def _insert_batch(self, ctx, start_index, count, batch_size, live):
        orders, plans, payments = self._build_batch(ctx, start_index, count, live)
        with transaction.atomic():
            Order.all_objects.bulk_create(orders, batch_size=batch_size)    # raqamni o'zimiz beramiz: LD-NNNNNNNNN (noyob, deterministik)
            self._ensure_pks(orders)
            items, txs = [], []
            for order, lines in zip(orders, plans):
                done = order.status in ('delivered', 'ready', 'out_for_delivery')
                for product_id, name, price, quantity, course in lines:
                    items.append(OrderItem(
                        order_id=order.pk, product_id=product_id, product_name=name, price=price, quantity=quantity,
                        unit='porsiya', total=price * quantity, course=course, is_done=done,
                    ))
            for position, method, paid_at, tx_date, table_number, category_id in payments:
                order = orders[position]
                source = f"Stol #{table_number}" if table_number else f"Buyurtma #{order.order_number}"
                txs.append(FinanceTransaction(
                    shop_id=order.shop_id, order_id=order.pk, category_id=category_id,
                    tx_type='income', stage='income', amount=order.final_amount, payment_method=method,
                    title=f"Savdo: {source}", notes=f"Avtomatik kassa tushumi: {order.order_number} ({order.customer_name})",
                    tx_date=tx_date, created_at=paid_at,
                ))
            OrderItem.objects.bulk_create(items, batch_size=batch_size)
            FinanceTransaction.objects.bulk_create(txs, batch_size=batch_size)
        counters = ctx.created_counters
        counters['orders'] += len(orders)
        counters['items'] += len(items)
        counters['txs'] += len(txs)
        counters['paid'] += len(payments)

    @staticmethod
    def _ensure_pks(orders):
        """
        PostgreSQL va zamonaviy SQLite bulk_create'dan keyin pk qaytaradi. Qaytarmasa (eski SQLite), pk raqam bo'yicha olinadi.
        """
        if not orders or orders[0].pk is not None:
            return
        numbers = [o.order_number for o in orders]
        found = {}
        for start in range(0, len(numbers), 500):
            chunk = numbers[start:start + 500]
            found.update(Order.all_objects.filter(order_number__in=chunk).values_list('order_number', 'id'))
        for order in orders:
            order.pk = found[order.order_number]

    def _build_batch(self, ctx, start_index, count, live=0):
        """
        `count` ta buyurtmani XOTIRADA yig'adi (faqat bitta partiya). Birinchi `live` tasi "hozir" faol (oxirgi ~50 daqiqa). Qaytaradi:
        (Order ro'yxati, har buyurtmaning qatorlari, to'lovlar [(buyurtma o'rni, usul, vaqt, sana, stol raqami, kategoriya)]).
        """
        rng = random.Random(f'{ctx.seed}:orders:{start_index}')
        rand = rng.random
        day_ids = rng.choices(range(len(ctx.day_bases)), cum_weights=ctx.day_cum, k=count)
        hours = rng.choices(HOURS, cum_weights=HOURS_CUM, k=count)
        shops = rng.choices(ctx.shops, cum_weights=ctx.shop_cum, k=count)
        now_sec = ctx.now_sec
        orders, plans, payments = [], [], []

        for i in range(count):
            shop = shops[i]
            day = day_ids[i]
            sec = hours[i] * 3600 + int(rand() * 3600)
            if i < live:
                day, sec = 0, max(0, now_sec - int(rand() * 2900))            # hozirgi xizmat: yoshi < 50 daqiqa -> faol holat
            elif day == 0 and sec >= now_sec:
                sec = int(rand() * max(now_sec, 1))                          # kelajakdagi buyurtma bo'lmaydi
            created = ctx.day_bases[day] + timedelta(seconds=sec)
            age_sec = (now_sec - sec) if day == 0 else None                  # faqat bugun: faol holat yoshga bog'liq

            # --- turi: zal / olib ketish / yetkazib berish
            kind = rand()
            table_id = table_number = None
            is_pickup = False
            if kind < DELIVERY_RATIO:
                delivery = True
            else:
                delivery = False
                if kind < DELIVERY_RATIO + PICKUP_RATIO:
                    is_pickup = True
                else:
                    table_id, table_number = shop.tables[int(rand() * len(shop.tables))]

            # --- qatorlar: 2-5 xil taom
            r = rand()
            wanted = 2 if r < 0.35 else 3 if r < 0.70 else 4 if r < 0.90 else 5
            chosen, seen = [], set()
            total_cum = shop.product_cum[-1]
            product_count = len(shop.products)
            while len(chosen) < wanted:
                product = shop.products[min(bisect(shop.product_cum, rand() * total_cum), product_count - 1)]
                if product[0] in seen:
                    continue
                seen.add(product[0])
                r = rand()
                chosen.append((product[0], product[1], product[2], 1 if r < 0.6 else 2 if r < 0.88 else 3, product[4]))
            total_int = sum(int(price) * quantity for _pid, _n, price, quantity, _c in chosen)

            # --- summalar: total = qatorlar yig'indisi; final = total - chegirma + yetkazish
            discount_int = 0
            if rand() < DISCOUNT_RATIO:
                discount_int = total_int * (5, 10, 15)[int(rand() * 3)] // 100 // 1000 * 1000
            fee_int = (0 if total_int >= FREE_DELIVERY_FROM else DELIVERY_FEE) if delivery else 0
            final_int = total_int - discount_int + fee_int

            # --- holat va to'lov
            status, paid = self._status_and_payment(rand, ctx, age_sec, delivery)
            delivered_at = confirmed_at = cancelled_at = None
            cancel_reason = cancel_code = ''
            updated = created
            duration = 0
            if status in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'):
                confirmed_at = created + timedelta(seconds=min(20 + int(rand() * 160), age_sec if age_sec is not None else 10**9))
                updated = confirmed_at
            if status == 'delivered':
                duration = 1500 + int(rand() * 3900)                         # 25-90 daqiqa
                if age_sec is not None:
                    duration = min(duration, max(age_sec, 60))
                delivered_at = created + timedelta(seconds=duration)
                updated = delivered_at
            elif status == 'cancelled':
                cancelled_at = created + timedelta(seconds=120 + int(rand() * 780))
                updated = cancelled_at
                cancel_reason, cancel_code = CANCEL_REASONS[int(rand() * len(CANCEL_REASONS))]

            order = Order(
                order_number=f'{ORDER_PREFIX}{start_index + i:09d}', shop_id=shop.id,
                customer_name=CUSTOMER_NAMES[int(rand() * len(CUSTOMER_NAMES))],
                customer_phone_1=f'+99890{1000000 + int(rand() * 8999999)}',
                table_id=table_id, is_pickup=is_pickup,
                total_amount=Decimal(total_int), discount_amount=Decimal(discount_int), delivery_fee=Decimal(fee_int),
                final_amount=Decimal(final_int), status=status, payment_status='paid' if paid else 'unpaid',
                created_at=created, updated_at=updated, confirmed_at=confirmed_at, delivered_at=delivered_at,
                cancelled_at=cancelled_at, cancel_reason=cancel_reason, cancel_reason_code=cancel_code,
            )
            if delivery:
                order.delivery_address = f"Guliston sh., {STREETS[int(rand() * len(STREETS))]} ko'chasi, {1 + int(rand() * 120)}-uy"
                order.delivery_lat = 40.4897 + (rand() - 0.5) * 0.06
                order.delivery_lng = 68.7842 + (rand() - 0.5) * 0.06
            plans.append(chosen)
            orders.append(order)
            if paid:
                # Kassa sanasi — to'lov (yetkazilgan) paytining mahalliy sanasi; tun yarmidan oshsa keyingi kun
                tx_date = ctx.day_dates[day] + timedelta(days=(sec + duration) // 86400)
                method = 'card' if rand() < PAYMENT_CARD_RATIO else 'cash'
                category_id = shop.cat_table if table_number else shop.cat_delivery
                payments.append((i, method, delivered_at or created, tx_date, table_number, category_id))
        return orders, plans, payments

    @staticmethod
    def _status_and_payment(rand, ctx, age_sec, delivery):
        """(holat, to'langanmi). Bugungi yangi buyurtmalar faol holatda; qolgani yakunlangan yoki bekor qilingan."""
        if age_sec is not None and age_sec < 3000:
            minutes = age_sec / 60
            if minutes < 10:
                return ('pending' if rand() < 0.6 else 'confirmed'), False
            if minutes < 35:
                return 'preparing', False
            return ('out_for_delivery' if delivery else 'ready'), False
        if rand() < CANCEL_RATIO:
            return 'cancelled', False
        return 'delivered', rand() < ctx.paid_target

    # ------------------------------------------------------------------ yakun
    @staticmethod
    def _sync_table_statuses(shop_ids):
        """Faol buyurtmasi bor stollar 'band'/'tayyor', qolgan sinov stollari 'bo'sh' (bugungi KDS/stollar so'rovlari real bo'lsin)."""
        Table.objects.filter(shop_id__in=shop_ids).exclude(status='free').update(status='free')
        day_start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        by_table = {}
        rows = Order.objects.filter(shop_id__in=shop_ids, status__in=ACTIVE_STATUSES, table__isnull=False, created_at__gte=day_start)
        for table_id, status in rows.values_list('table_id', 'status'):
            if status == 'ready':
                by_table.setdefault(table_id, 'ready')
            else:
                by_table[table_id] = 'occupied'
        for new_status in ('occupied', 'ready'):
            ids = [table_id for table_id, value in by_table.items() if value == new_status]
            if ids:
                Table.objects.filter(pk__in=ids).update(status=new_status)

    def _analyze(self):
        """PostgreSQL rejalashtiruvchi statistikasi yangilansin (aks holda EXPLAIN ANALYZE eski statistikaga tayanadi)."""
        if connection.vendor != 'postgresql':
            return
        quote = connection.ops.quote_name
        with connection.cursor() as cursor:
            for model in (Order, OrderItem, FinanceTransaction, Product, Table):
                cursor.execute(f'ANALYZE {quote(model._meta.db_table)}')
        self.stdout.write("  ANALYZE bajarildi (orders, order_items, finance_transactions, products, restaurant_tables)")
