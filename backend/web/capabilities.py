"""
Restoran xodimlarining RUXSATLAR KATALOGI — yagona manba (kodda).

Har xodimning samarali ruxsatlari:  (rol standarti  ∪  qo'shimcha)  −  olib tashlangan.
`shop_owner` va `super_admin` HAR DOIM hamma narsaga ega: ularga qo'shimcha/olib tashlash ta'sir qilmaydi.

Bu modul sof Python (Django import'lari yo'q): katalog, rol standartlari va hisob-kitob shu yerda; "xodim faolmi,
restoranga bog'langanmi" tekshiruvi `web.restaurant_auth` da. Yangi ruxsat qo'shish: `CATALOG` ga bitta yozuv — menyu,
API javoblari va xodim sahifasi shu ro'yxatdan oladi.

Kalit → ta'sir qiladigan joylar (DRF `capability()` va HTML `restaurant_staff_required(capability=...)`):
  kds_screen     — /kds/ oshxona ekrani sahifasi
  kds            — buyurtmalar ro'yxati/tafsiloti (/ra/ va /api/v1/restaurant/orders/), KDS polling, taom belgilari
  orders_manage  — buyurtmani istalgan holatga o'tkazish (yetkazildi, bekor qilish). Usiz faqat tayyorlash bosqichlari
  stoplist       — taom tugadi/qaytdi (stop-list), taom mavjudligi
  pos            — ofitsiant paneli, stol hisobi, taom qo'shish, chaqiruvlar, to'lovni belgilash, AR buyurtma
  tables_read    — stollar/zallar holatini ko'rish, QR rasm, stol holatini belgilash
  tables_admin   — stol/zal yaratish, tahrirlash, o'chirish/tiklash, QR kodni yangilash
  reservations   — bronlar va qabul stoli (hostess)
  menu_admin     — menyu, kategoriyalar, ommaviy qo'shish, rasm tanlash, 3D modellar
  finance        — kassa, qarzlar, hisobotlar, to'lovni bekor qilish/qaytarish, tushum raqamlari
  staff_admin    — xodimlar ro'yxati, yaratish, tahrirlash, ruxsatlar, login/parol, bloklash
  settings_admin — restoran sozlamalari
"""

RESTAURANT_MANAGER_ROLES = ('super_admin', 'shop_owner', 'shop_manager')
RESTAURANT_STAFF_ROLES = RESTAURANT_MANAGER_ROLES + ('waiter', 'kitchen', 'hostess')
# Cheklab bo'lmaydigan rollar: hamma ruxsatga doim ega
OWNER_ROLES = ('super_admin', 'shop_owner')

_M = RESTAURANT_MANAGER_ROLES

GROUPS = {
    'orders': "Buyurtmalar va oshxona",
    'floor': "Zal, stollar va bronlar",
    'management': "Boshqaruv",
}

# `roles` — standart (rol bo'yicha) to'plam; avvalgi `CAPABILITIES` matritsasi AYNAN saqlangan, yangi kalitlar esa
# avval ishlagan tekshiruvlarning (menu_admin → staff/settings/tables) rahbariyatga mos standartini oladi.
CATALOG = (
    {'key': 'kds_screen', 'group': 'orders', 'sensitive': False, 'roles': _M + ('kitchen',),
     'label': "Oshxona ekrani",
     'description': "Oshxonadagi buyurtmalar kartochkalari sahifasi (KDS)."},
    {'key': 'kds', 'group': 'orders', 'sensitive': False, 'roles': _M + ('kitchen', 'waiter'),
     'label': "Buyurtmalarni ko'rish",
     'description': "Buyurtmalar ro'yxati va tafsiloti, oshxona jarayoni, taom belgilari."},
    {'key': 'orders_manage', 'group': 'orders', 'sensitive': False, 'roles': _M + ('waiter',),
     'label': "Buyurtma holatini o'zgartirish",
     'description': "Buyurtmani istalgan holatga o'tkazish: yetkazildi, bekor qilish. Bu ruxsatsiz faqat tayyorlash bosqichlari."},
    {'key': 'stoplist', 'group': 'orders', 'sensitive': False, 'roles': _M + ('kitchen', 'waiter'),
     'label': "Stop-list (taom tugadi)",
     'description': "Taomni «tugadi» yoki «qaytdi» deb belgilash."},
    {'key': 'pos', 'group': 'floor', 'sensitive': False, 'roles': _M + ('waiter',),
     'label': "Ofitsiant paneli va hisob",
     'description': "Stol hisobi, buyurtmaga taom qo'shish, mijoz chaqiruvlari, to'lovni belgilash."},
    {'key': 'tables_read', 'group': 'floor', 'sensitive': False, 'roles': _M + ('waiter', 'hostess'),
     'label': "Stollar holatini ko'rish",
     'description': "Stollar va zallar holati, stol QR rasmi."},
    {'key': 'tables_admin', 'group': 'floor', 'sensitive': False, 'roles': _M,
     'label': "Stollar va zallarni tahrirlash",
     'description': "Stol va zal qo'shish, o'zgartirish, o'chirish; QR kodni yangilash."},
    {'key': 'reservations', 'group': 'floor', 'sensitive': False, 'roles': _M + ('hostess',),
     'label': "Bronlar va qabul stoli",
     'description': "Bronlarni ko'rish va holatini o'zgartirish, mehmonni kutib olish."},
    {'key': 'menu_admin', 'group': 'management', 'sensitive': False, 'roles': _M,
     'label': "Menyu va 3D modellar",
     'description': "Taom va kategoriyalarni qo'shish, tahrirlash, narx, rasm, 3D model."},
    {'key': 'finance', 'group': 'management', 'sensitive': True, 'roles': _M,
     'label': "Moliya",
     'description': "Kassa, qarzlar, tushum va hisobotlar; to'lovni bekor qilish yoki qaytarish."},
    {'key': 'staff_admin', 'group': 'management', 'sensitive': True, 'roles': _M,
     'label': "Xodimlar va ruxsatlar",
     'description': "Xodim qo'shish, tahrirlash, login va parol, ruxsatlar berish, bloklash."},
    {'key': 'settings_admin', 'group': 'management', 'sensitive': True, 'roles': _M,
     'label': "Restoran sozlamalari",
     'description': "Nomi, ish vaqti, manzil, bildirishnomalar va boshqa umumiy sozlamalar."},
)

CAPABILITY_KEYS = tuple(c['key'] for c in CATALOG)
# Eski nom saqlangan: kalit → standart rollar (boshqa modullar va testlar shuni import qiladi)
CAPABILITIES = {c['key']: c['roles'] for c in CATALOG}
SENSITIVE_CAPABILITIES = frozenset(c['key'] for c in CATALOG if c['sensitive'])
# Shulardan kamida bittasi bo'lgan xodim /ra/ (boshqaruv paneli) ga kira oladi; qolganlar o'z ish sahifasiga yo'naltiriladi
MANAGEMENT_CAPABILITIES = ('menu_admin', 'finance', 'staff_admin', 'settings_admin', 'tables_admin')
# Katalog va standart to'plamlar ko'rsatiladigan rollar
DEFAULT_ROLES = ('waiter', 'kitchen', 'hostess', 'shop_manager', 'shop_owner')

assert set(MANAGEMENT_CAPABILITIES) <= set(CAPABILITY_KEYS)


def role_default_capabilities(role):
    """Rolning standart ruxsatlari (katalog tartibida). Noma'lum rol — bo'sh."""
    return [key for key in CAPABILITY_KEYS if role in CAPABILITIES[key]]


def clean_keys(value):
    """Saqlangan/kelgan qiymatdan faqat katalogdagi kalitlar: takrorsiz, katalog tartibida. Buzuq qiymat — bo'sh."""
    if not isinstance(value, (list, tuple, set, frozenset)):
        return []
    known = {item for item in value if isinstance(item, str)}
    return [key for key in CAPABILITY_KEYS if key in known]


def normalize_overrides(role, extra, revoked):
    """
    (extra, revoked) ni rolga moslab tozalaydi: qo'shimcha — faqat standartda YO'Q kalitlar, olib tashlangan — faqat
    standartda BOR kalitlar. Egalar uchun ikkalasi bo'sh (ularni cheklab bo'lmaydi).
    """
    if role in OWNER_ROLES:
        return [], []
    defaults = set(role_default_capabilities(role))
    return ([key for key in clean_keys(extra) if key not in defaults],
            [key for key in clean_keys(revoked) if key in defaults])


def effective_capabilities_for(role, extra=None, revoked=None):
    """Samarali ruxsatlar = (rol standarti ∪ extra) − revoked; egalar uchun — hammasi. Noma'lum kalitlar e'tiborga olinmaydi."""
    if role in OWNER_ROLES:
        return list(CAPABILITY_KEYS)
    allowed = set(role_default_capabilities(role)) | set(clean_keys(extra))
    allowed -= set(clean_keys(revoked))
    return [key for key in CAPABILITY_KEYS if key in allowed]


def catalog_payload():
    """API uchun katalog: [{key, label, group, group_key, description, sensitive}] (`roles` ichki, chiqmaydi)."""
    return [{
        'key': c['key'], 'label': c['label'], 'group': GROUPS[c['group']], 'group_key': c['group'],
        'description': c['description'], 'sensitive': c['sensitive'],
    } for c in CATALOG]


def role_defaults_payload():
    return {role: role_default_capabilities(role) for role in DEFAULT_ROLES}
