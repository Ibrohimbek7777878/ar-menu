import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  Percent,
  Timer,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Power,
  RotateCcw,
} from 'lucide-react';
import { useSettings } from './useSettings';

export function SettingsPage() {
  const { settings, loading, saving, error, successMessage, refresh, saveSettings } = useSettings();

  // Lokal form holatlari
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [workingHours, setWorkingHours] = useState('08:00-23:00');
  const [workingDays, setWorkingDays] = useState('Dush-Yak');
  const [isOpen, setIsOpen] = useState(true);
  const [colorPrimary, setColorPrimary] = useState('#16a34a');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [serviceFeePercent, setServiceFeePercent] = useState<number>(0);
  const [kdsWarningMinutes, setKdsWarningMinutes] = useState<number>(15);
  const [kdsCriticalMinutes, setKdsCriticalMinutes] = useState<number>(30);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setDescription(settings.description || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setPhone2(settings.phone2 || '');
      setWorkingHours(settings.working_hours || '08:00-23:00');
      setWorkingDays(settings.working_days || 'Dush-Yak');
      setIsOpen(Boolean(settings.is_open));
      setColorPrimary(settings.color_primary || '#16a34a');
      setInstagramUrl(settings.instagram_url || '');
      setServiceFeePercent(settings.service_fee_percent ?? 0);
      setKdsWarningMinutes(settings.kds_warning_minutes ?? 15);
      setKdsCriticalMinutes(settings.kds_critical_minutes ?? 30);
      setTelegramChatId(settings.telegram_chat_id || '');
      setAutoAcceptOrders(Boolean(settings.auto_accept_orders));
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
      phone2: phone2.trim(),
      working_hours: workingHours.trim(),
      working_days: workingDays.trim(),
      is_open: isOpen,
      color_primary: colorPrimary.trim(),
      instagram_url: instagramUrl.trim(),
      service_fee_percent: serviceFeePercent,
      kds_warning_minutes: kdsWarningMinutes,
      kds_critical_minutes: kdsCriticalMinutes,
      telegram_chat_id: telegramChatId.trim(),
      auto_accept_orders: autoAcceptOrders,
    });
  };

  if (loading && !settings) {
    return (
      <div className="p-12 text-center text-sm text-neutral-500">
        Restoran sozlamalari yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Restoran Sozlamalari
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Restoran profili, oshxona (KDS) taymerlari va xizmat haqi parametrlari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Qayta yuklash</span>
          </button>
        </div>
      </div>

      {/* Bildirishnomalar */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. ASOSIY MA'LUMOTLAR */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Restoran Asosiy Profili</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Restoran nomi *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rayhon Milliy Taomlar"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tizimdagi identifikator (Slug)
              </label>
              <input
                type="text"
                disabled
                value={settings?.slug || ''}
                className="w-full px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Manzil
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent sh., Chilonzor tumani, 9-mavze"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Asosiy telefon
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Qo'shimcha telefon
              </label>
              <input
                type="text"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="+998 71 200 00 00"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Restoran tavsifi (Mehmon menyusida ko'rinadi)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shinam muhit va milliy taomlar restorani..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 2. ISH TARTIBI VA HOLATI */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Ish Tartibi va Faollik</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isOpen
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Restoran hozir {isOpen ? 'Ochiq (Mijozlarni qabul qilmoqda)' : 'Yopiq (Buyurtma qabul qilinmaydi)'}
                </div>
                <div className="text-[11px] text-neutral-500">
                  QR menyu orqali yangi mehmon buyurtmalarini qabul qilishni yoqish yoki to'xtatish
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isOpen ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isOpen ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ish soatlari
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="09:00 - 23:00"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ish kunlari
              </label>
              <input
                type="text"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                placeholder="Dushanba - Yakshanba (Har kuni)"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 3. XIZMAT HAQI VA BUYURTMA QABUL QILISH */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
            <Percent className="w-4 h-4 text-purple-600" />
            <span>Xizmat Haqi va Buyurtmalar Oqimi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Xizmat haqi (Servis) foizi (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={serviceFeePercent}
                onChange={(e) => setServiceFeePercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Chekdagi taomlar summasiga qo'shiladigan xizmat haqi (masalan 10%)
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700 self-start">
              <div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Avtomatik qabul qilish
                </div>
                <div className="text-[10px] text-neutral-500">
                  Stoldan yuborilgan buyurtma to'g'ridan-to'g'ri oshxonaga o'tadi
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoAcceptOrders(!autoAcceptOrders)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoAcceptOrders ? 'bg-purple-600' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoAcceptOrders ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4. OSHXONA KDS TAYMERLARI */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
            <Timer className="w-4 h-4 text-amber-600" />
            <span>Oshxona (KDS) Taymer Chegaralari</span>
          </div>

          <p className="text-xs text-neutral-500">
            KDS ekranida taomlar tayyorlanish vaqtiga qarab kartochka rangi sariq va qizilga aylanadi:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Sariq ogohlantirish (Daqiqa)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={kdsWarningMinutes}
                onChange={(e) => setKdsWarningMinutes(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Ushbu vaqtdan oshsa kartochka sariq rangga kiradi</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">
                Qizil krizis va kechikish (Daqiqa)
              </label>
              <input
                type="number"
                min="2"
                max="300"
                value={kdsCriticalMinutes}
                onChange={(e) => setKdsCriticalMinutes(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Ushbu vaqtdan oshsa buyurtma kechikkan deb hisoblanadi</p>
            </div>
          </div>
        </div>

        {/* 5. BILDIRISHNOMALAR VA TELEGRAM */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold text-sm">
            <Send className="w-4 h-4 text-sky-600" />
            <span>Telegram va Tashqi Havolalar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Telegram Chat / Guruh ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-1001234567890"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Yangi buyurtmalar va hisobotlar yuboriladigan Telegram guruhi
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Instagram havolasi
              </label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/restoran_nomi"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Asosiy brend rangi
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="w-9 h-9 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer"
              />
              <input
                type="text"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="w-28 px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* SAQLASH TUGMASI */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
export default SettingsPage;
