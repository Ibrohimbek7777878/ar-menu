import React from 'react';
import { Language, Currency } from '../types';
import { translations } from '../data/translations';
import { speakText, stopSpeech } from '../utils/formatters';
import { X, Volume2, Sparkles, Compass, Heart, ShieldCheck, DollarSign, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TouristGuideModalProps {
  isOpen: boolean;
  lang: Language;
  currency: Currency;
  onClose: () => void;
  onSelectCurrency: (c: Currency) => void;
}

export const TouristGuideModal: React.FC<TouristGuideModalProps> = ({
  isOpen,
  lang,
  currency,
  onClose,
  onSelectCurrency
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const handleReadGuide = () => {
    const text = lang === 'en'
      ? "Welcome to Uzbekistan and the Silk Road culinary experience. In our tradition, bread is sacred and broken by hand with both hands. Plov is our national pride, cooked with fragrant cumin and tender lamb. Green tea is served with deep respect. Enjoy your meal, or as we say, Yoqimli ishtaha!"
      : lang === 'ru'
      ? "Добро пожаловать в кулинарное путешествие по Великому Шёлковому пути! Хлеб у нас священен — его ломают обеими руками. Плов — венец восточного гостеприимства. Зелёный чай наливают с глубоким почётом. Приятного аппетита — ёкимли иштаха!"
      : "Registon restoraniga xush kelibsiz! O'zbek dasturxonida non muqaddas bo'lib, ikki qo'llab sindiriladi. Osh — milliy faxrimiz, ko'k choy esa mehmondo'stlik ramzidir. Yoqimli ishtaha!";
    speakText(text, lang);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl text-[var(--text)] flex flex-col"
        >
          {/* Top National Ribbon */}
          <div className="h-2 w-full uzbek-pattern-ribbon" />

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-start justify-between bg-[var(--bg-soft)]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1B4B73] text-[#E3C158] flex items-center justify-center shadow-md">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg leading-tight text-[var(--text)]">
                  {t.touristGuideTitle}
                </h3>
                <p className="text-xs text-[var(--text-soft)] mt-0.5">
                  {t.touristGuideSubtitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
            {/* Audio Reader CTA */}
            <div className="p-3.5 rounded-2xl bg-[#FBEDE8] dark:bg-[#2A1810] border border-[#C75B39]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#C75B39]">
                <Volume2 className="w-5 h-5 flex-shrink-0 animate-pulse" />
                <span className="font-semibold text-xs leading-snug">
                  {lang === 'en'
                    ? "Listen to audio welcome & dining guide"
                    : lang === 'ru'
                    ? "Слушать аудиогид о традициях дастархана"
                    : "Dasturxon odobi va taomlar haqida ovozli eshitish"}
                </span>
              </div>
              <button
                onClick={handleReadGuide}
                className="px-3 py-1.5 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {t.listenAudio}
              </button>
            </div>

            {/* Currency Selector for Foreign Guests */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center gap-1.5 text-[var(--text)]">
                  <DollarSign className="w-4 h-4 text-[#16A34A]" />
                  {lang === 'en' ? 'Select Menu Currency:' : lang === 'ru' ? 'Валюта отображения цен:' : 'Narxlar valyutasi:'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  1 USD ≈ 12,800 UZS
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['UZS', 'USD', 'EUR'] as Currency[]).map(cur => (
                  <button
                    key={cur}
                    onClick={() => onSelectCurrency(cur)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                      currency === cur
                        ? 'bg-[#1B4B73] text-white shadow-xs'
                        : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--bg)]'
                    }`}
                  >
                    {cur === 'UZS' ? "🇺🇿 So'm" : cur === 'USD' ? '🇺🇸 $ USD' : '🇪🇺 € EUR'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cultural Insights */}
            <div className="space-y-3">
              {/* Insight 1: Bread */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs flex items-start gap-3">
                <span className="text-2xl">🍞</span>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text)]">
                    {lang === 'en' ? 'The Sacred Bread (Non)' : lang === 'ru' ? 'Священный хлеб (Нон)' : 'Non — muqaddas ne\'mat'}
                  </h4>
                  <p className="text-xs text-[var(--text-soft)] mt-1 leading-relaxed">
                    {lang === 'en'
                      ? 'In Uzbek culture, bread is never placed face down and is gently broken with two hands, never sliced with a knife.'
                      : lang === 'ru'
                      ? 'Лепёшку никогда не кладут узором вниз и всегда ломают руками, делясь теплом со всеми сидящими за столом.'
                      : 'Non dasturxonga doim yuzasi yuqoriga qaratib qo\'yiladi va pichoqsiz, ikki qo\'l bilan hurmat bilan sindiriladi.'}
                  </p>
                </div>
              </div>

              {/* Insight 2: Plov & Green Tea */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs flex items-start gap-3">
                <span className="text-2xl">🍵</span>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text)]">
                    {lang === 'en' ? 'Plov & Green Tea Ritual' : lang === 'ru' ? 'Плов и традиция зелёного чая' : 'Osh va Ko\'k choy an\'anasi'}
                  </h4>
                  <p className="text-xs text-[var(--text-soft)] mt-1 leading-relaxed">
                    {lang === 'en'
                      ? 'Plov is traditionally accompanied by fresh Achchik-chuchuk salad and piping-hot Green Tea No. 95 with lemon or mountain mint to soothe digestion.'
                      : lang === 'ru'
                      ? 'Плов обязательно запивают горячим зеленым чаем 95 с лимоном или горной мятой, который помогает идеальному усвоению блюда.'
                      : 'Osh bilan albatta muzdek achchiq-chuchuk salati va issiq ko\'k choy ichiladi — bu organizmga yengillik va quvvat bag\'ishlaydi.'}
                  </p>
                </div>
              </div>

              {/* Insight 3: 100% Halal Guarantee */}
              <div className="p-3.5 rounded-2xl bg-[#E8F8EE] dark:bg-[#122A1C] border border-[#16A34A]/30 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#16A34A]">
                    {lang === 'en' ? '100% Halal Certified Cuisine' : lang === 'ru' ? '100% Халяль сертификация' : '100% Halol va Toza Masalliqlar'}
                  </h4>
                  <p className="text-xs text-[var(--text-soft)] mt-1 leading-relaxed">
                    {lang === 'en'
                      ? 'All lamb and beef are fresh farm-raised and prepared strictly under Islamic Halal dietary laws. No pork products are permitted.'
                      : lang === 'ru'
                      ? 'Вся говядина и баранина получены от проверенных фермерских хозяйств и приготовлены строго по канонам Халяль.'
                      : 'Barcha go\'sht mahsulotlari sertifikatlangan halol so\'yish usulida tayyorlangan, mutlaqo tabiiy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Close */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-soft)]/50 flex justify-end">
            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {lang === 'en' ? 'Got it, let\'s explore!' : lang === 'ru' ? 'Понятно, открыть меню' : 'Tushunarli, menyuni ko\'rish'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
