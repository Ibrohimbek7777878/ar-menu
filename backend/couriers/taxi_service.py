"""
Guliston shahri bo'ylab tezkor taksi xizmatlari ma'lumotlari va integratsiyasi.
Ichki kuryerlik o'rniga eng arzon va ommabop taksi xizmatlari (Taxi Plus, Yandex Go, 1054)
orqali 1-bosishda qo'ng'iroq qilish va chaqirish tizimi.
"""

GULISTON_TAXI_SERVICES = [
    {
        "id": "taxi_plus",
        "name": "Taxi Plus Guliston",
        "badge": "Eng ommabop & Arzon",
        "phones": ["+998672250000", "+998915000000", "+998901234567"],
        "primary_phone": "+998672250000",
        "base_fare": "8 000 so'mdan",
        "description": "Shahar bo'ylab eng tezkor va arzon taksi xizmati. 5-7 daqiqada yetib keladi.",
        "icon": "🚕",
        "is_recommended": True,
    },
    {
        "id": "yandex_go",
        "name": "Yandex Go (Taksi)",
        "badge": "Xaritali & Karta orqali",
        "phones": [],
        "app_url": "https://taxi.yandex.uz/",
        "deep_link": "https://3.redirect.appmetrica.yandex.com/route?end-lat=40.4897&end-lon=68.7842",
        "base_fare": "Tarif bo'yicha",
        "description": "Ilova orqali mashina harakatini xaritada kuzatish va kartadan to'lash.",
        "icon": "📱",
        "is_recommended": False,
    },
    {
        "id": "express_1054",
        "name": "Express Taksi (1054)",
        "badge": "Qisqa raqam",
        "phones": ["1054", "+998672261054"],
        "primary_phone": "+998672261054",
        "base_fare": "8 000 so'mdan",
        "description": "Guliston bo'yicha 24/7 navbatchi dispetcherlik xizmati.",
        "icon": "📞",
        "is_recommended": False,
    },
    {
        "id": "sayxun_taxi",
        "name": "Sayxun Mahalliy Taksi",
        "badge": "Yaqin atrofda",
        "phones": ["+998933400000"],
        "primary_phone": "+998933400000",
        "base_fare": "7 000 so'mdan",
        "description": "Sayxun ko'chasi va 3D Studio atrofidagi tezkor mahalliy haydovchilar.",
        "icon": "🚗",
        "is_recommended": False,
    },
]


def get_taxi_services():
    """Barcha mavjud taksi xizmatlari ro'yxatini qaytaradi."""
    return GULISTON_TAXI_SERVICES


def get_telegram_taxi_markup():
    """Telegram bot uchun 1-bosishda qo'ng'iroq qilish tugmalari klaviaturasi."""
    buttons = []
    for s in GULISTON_TAXI_SERVICES:
        if s.get("primary_phone"):
            btn_text = f"🚕 {s['name']} ({s['primary_phone']})"
            buttons.append([{"text": btn_text, "url": f"tel:{s['primary_phone']}"}])
        elif s.get("app_url"):
            buttons.append([{"text": f"📱 {s['name']} (Ilovada ochish)", "url": s['app_url']}])

    return {"inline_keyboard": buttons}
