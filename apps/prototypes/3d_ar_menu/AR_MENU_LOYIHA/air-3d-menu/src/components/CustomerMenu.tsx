import React, { useState, useMemo } from 'react';
import { Dish, Language, UserRole, DishCategory, CartItem, Order, Currency, DeviceMode } from '../types';
import { translations } from '../data/translations';
import { formatPrice, speakText, stopSpeech } from '../utils/formatters';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Scale, 
  Plus, 
  Minus,
  Smartphone, 
  Bot, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  ShoppingBag,
  ChevronRight,
  Flame,
  Check,
  Volume2,
  VolumeX,
  Compass,
  Info,
  Droplets,
  Receipt,
  Eye,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerMenuProps {
  dishes: Dish[];
  lang: Language;
  currency: Currency;
  tableNumber: number;
  theme: 'light' | 'dark';
  currentRole: UserRole;
  deviceMode?: DeviceMode;
  cartItems: CartItem[];
  activeOrder: Order | null;
  isAccessibleMode: boolean;
  restaurantName?: string;
  dynamicCategories?: { id: string; label: string; icon: string }[];
  onSelectLanguage: (lang: Language) => void;
  onSelectCurrency: (c: Currency) => void;
  onToggleTheme: () => void;
  onToggleAccessibleMode: () => void;
  onSwitchRole: (role: UserRole) => void;
  onOpenAR: (dish: Dish) => void;
  onAddToCart: (dish: Dish) => void;
  onUpdateCartQuantity?: (dishId: string, delta: number) => void;
  onOpenCart: () => void;
  onOpenAIChat: () => void;
  onCallWaiter: (callType?: 'waiter' | 'water' | 'bill') => void;
  onOpenOrderStatus: () => void;
  onOpenTouristGuide: () => void;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({
  dishes,
  lang,
  currency,
  tableNumber,
  theme,
  currentRole,
  deviceMode = 'desktop',
  cartItems,
  activeOrder,
  isAccessibleMode,
  restaurantName,
  dynamicCategories,
  onSelectLanguage,
  onSelectCurrency,
  onToggleTheme,
  onToggleAccessibleMode,
  onSwitchRole,
  onOpenAR,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenCart,
  onOpenAIChat,
  onCallWaiter,
  onOpenOrderStatus,
  onOpenTouristGuide
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'halal' | 'vegan' | 'non-spicy'>('all');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [speakingDishId, setSpeakingDishId] = useState<string | null>(null);
  const [expandedFactDishId, setExpandedFactDishId] = useState<string | null>(null);

  const categories = dynamicCategories && dynamicCategories.length > 1
    ? dynamicCategories
    : [
        { id: 'all', label: t.filterAll, icon: '🍽️' },
        { id: 'milliy', label: t.filterNational, icon: '🥘' },
        { id: 'kabob', label: t.filterKebabs, icon: '🍢' },
        { id: 'shorva', label: t.filterSoups, icon: '🥣' },
        { id: 'salat', label: t.filterSalads, icon: '🥗' },
        { id: 'non', label: t.filterBread, icon: '🍞' },
        { id: 'ichimlik', label: t.filterDrinks, icon: '🫖' },
      ];

  const filteredDishes = useMemo(() => {
    return dishes.filter(d => {
      // Category match
      if (selectedCategory !== 'all' && d.category !== selectedCategory) {
        return false;
      }
      // Dietary filter match
      if (activeFilter === 'halal' && !d.tags.includes('halal')) return false;
      if (activeFilter === 'vegan' && !d.tags.includes('vegan')) return false;
      if (activeFilter === 'non-spicy' && d.tags.includes('spicy')) return false;
      // Search query match across all languages
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = Object.values(d.name).some(val => typeof val === 'string' && val.toLowerCase().includes(query));
        const descMatch = Object.values(d.description).some(val => typeof val === 'string' && val.toLowerCase().includes(query));
        return nameMatch || descMatch;
      }
      return true;
    });
  }, [dishes, selectedCategory, activeFilter, searchQuery]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);

  const handleAddToCartWithAnimation = (dish: Dish) => {
    onAddToCart(dish);
    setJustAddedId(dish.id);
    setTimeout(() => setJustAddedId(null), 1000);
  };

  const handleToggleSpeakDish = (dish: Dish) => {
    if (speakingDishId === dish.id) {
      stopSpeech();
      setSpeakingDishId(null);
    } else {
      setSpeakingDishId(dish.id);
      const text = `${dish.name[lang]}. Narxi ${formatPrice(dish.price, currency)}. ${dish.description[lang]}`;
      speakText(text, lang);
    }
  };

  // Find dish in cart quantity
  const getDishCartQuantity = (dishId: string) => {
    const item = cartItems.find(it => it.dish.id === dishId);
    return item ? item.quantity : 0;
  };

  // Featured flagship dish for 3D Hero
  const featuredDish = dishes.find(d => d.id === 'dish-1') || dishes[0];

  const isDebugMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('debug') === '1' ||
    new URLSearchParams(window.location.search).get('preview') === '1'
  );

  const containerClasses = {
    mobile: 'w-full max-w-xl mx-auto px-3 sm:px-4 py-0',
    tablet: 'max-w-3xl mx-auto px-4 sm:px-6 py-2 border border-[var(--border)] rounded-3xl shadow-xl my-3',
    desktop: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'
  }[deviceMode];

  const dockClasses = {
    mobile: 'w-full max-w-xl mx-auto px-3 pt-2.5 pb-[max(0.85rem,calc(env(safe-area-inset-bottom)+0.4rem))]',
    tablet: 'max-w-3xl mx-auto rounded-t-3xl shadow-2xl border-x border-t border-[var(--border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
    desktop: 'max-w-4xl mx-auto rounded-2xl mb-4 border border-[var(--border)] shadow-2xl p-3'
  }[deviceMode];

  const dishGridClasses = {
    mobile: 'space-y-4',
    tablet: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    desktop: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
  }[deviceMode];

  return (
    <div className={`min-h-screen pb-36 ${containerClasses} bg-[var(--bg)] text-[var(--text)] transition-all relative ${isAccessibleMode ? 'accessible-large' : ''}`}>
      {/* 1. TOP UZBEK NATIONAL RIBBON */}
      <div className="h-1.5 w-full uzbek-pattern-ribbon" />

      {/* 2. STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-3 sm:px-4 py-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Restaurant Branding & Table */}
          <div className="flex items-center gap-2 min-w-0">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B4B73] via-[#C75B39] to-[#C9A227] text-white flex items-center justify-center font-black text-xs shadow-md tracking-wider shrink-0 cursor-pointer"
            >
              AIR
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-display font-black text-sm sm:text-base text-[var(--text)] tracking-tight truncate">
                  {restaurantName || t.restaurantName}
                </h1>
                <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-[#16A34A]/15 text-[#16A34A] text-[10px] font-bold border border-[#16A34A]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                  <span>#{tableNumber}</span>
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-soft)] truncate">
                3D Interaktiv Raqamli Menyu
              </p>
            </div>
          </div>

          {/* Quick Header Controls (Currency, Lang, Tourist Guide, Large Font, Theme) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Currency Selector */}
            <div className="flex bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-0.5 text-[10px] font-bold">
              {(['UZS', 'USD'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => onSelectCurrency(c)}
                  className={`px-1.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                    currency === c
                      ? 'bg-[#1B4B73] text-white shadow-xs'
                      : 'text-[var(--text-soft)] hover:text-[var(--text)]'
                  }`}
                  title={c === 'UZS' ? "O'zbek so'mi" : "US Dollar"}
                >
                  {c === 'UZS' ? "SO'M" : "$"}
                </button>
              ))}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-0.5">
              {(['uz', 'ru', 'en'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => onSelectLanguage(l)}
                  className={`px-1.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lang === l
                      ? 'bg-[#C75B39] text-white shadow-xs'
                      : 'text-[var(--text-soft)] hover:text-[var(--text)]'
                  }`}
                  title={l === 'uz' ? "O'zbekcha" : l === 'ru' ? "Русский" : "English"}
                >
                  {l === 'uz' ? '🇺🇿' : l === 'ru' ? '🇷🇺' : '🇬🇧'}
                </button>
              ))}
            </div>

            {/* Tourist Guide Helper Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onOpenTouristGuide}
              className="p-1.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] text-[#1B4B73] dark:text-[#60A5FA] hover:text-[#C75B39] transition-colors cursor-pointer"
              title="Ipak Yo'li Qo'llanmasi & Madaniyat"
            >
              <Compass className="w-4 h-4" />
            </motion.button>

            {/* Large Font Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleAccessibleMode}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isAccessibleMode
                  ? 'bg-[#16A34A] border-[#16A34A] text-white'
                  : 'bg-[var(--bg-soft)] border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
              }`}
              title="Kattalar uchun katta shrift rejimi"
            >
              <Type className="w-4 h-4" />
            </motion.button>

            {/* Dark/Light Theme Toggle */}
            <motion.button
              whileTap={{ rotate: 180, scale: 0.9 }}
              onClick={onToggleTheme}
              className="p-1.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors cursor-pointer"
              title="Kun/tun rejimi"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#C9A227]" /> : <Moon className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>

        {/* Developer Debug Role Switcher — ONLY in ?debug=1 or ?preview=1 mode */}
        {isDebugMode && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]/70 flex items-center justify-between gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">Rejim:</span>
            <div className="flex items-center gap-1">
              {(['customer', 'waiter', 'kds', 'admin'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => onSwitchRole(r)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    currentRole === r
                      ? 'bg-[#1B4B73] text-white'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  {r === 'customer' ? 'Mijoz' : r === 'waiter' ? 'Ofitsiant' : r === 'kds' ? 'KDS' : 'Admin'}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO: "AIR 3D MENU" FLOATING INTERACTIVE FEATURED DISH */}
      <div className="px-4 pt-3.5 pb-1">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1815] via-[#2A1810] to-[#1B4B73] text-white p-4 sm:p-5 shadow-xl border border-[#C9A227]/40"
        >
          {/* Decorative Uzbek Star/Islimiy Ornament Backdrop */}
          <div className="absolute right-0 top-0 w-44 h-44 opacity-15 pointer-events-none">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-[#C9A227] w-full h-full">
              <polygon points="50,5 64,36 98,36 71,57 82,91 50,70 18,91 29,57 2,36 36,36" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="28" strokeWidth="1" />
            </svg>
          </div>

          <div className={`relative z-10 flex ${
            deviceMode === 'mobile'
              ? 'items-center justify-between gap-3'
              : 'flex-col md:flex-row items-center justify-between gap-6 py-2'
          }`}>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A227]/25 text-[#E3C158] text-[11px] font-bold border border-[#C9A227]/40 mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{t.air3dBadge} · 360° Interaktiv</span>
              </div>
              
              <h2 className={`font-display font-black text-white tracking-tight leading-tight ${
                deviceMode === 'desktop' ? 'text-2xl lg:text-3xl' : 'text-lg sm:text-xl'
              }`}>
                {featuredDish.name[lang]}
              </h2>

              <p className="text-xs sm:text-sm text-white/80 line-clamp-2 mt-1 leading-relaxed max-w-xl">
                {featuredDish.description[lang]}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <span className="text-lg sm:text-xl font-black text-[#E3C158] num">
                  {formatPrice(featuredDish.price, currency)}
                </span>
                {currency !== 'UZS' && (
                  <span className="text-xs text-white/60 num">
                    ({featuredDish.price.toLocaleString()} so'm)
                  </span>
                )}
              </div>

              {/* Action Buttons with high animations */}
              <div className="flex items-center gap-2 mt-3.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onOpenAR(featuredDish)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#E07A52] hover:brightness-110 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#C75B39]/40 cursor-pointer animate-ar-pulse"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>3D STOLDA KO'RISH</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAddToCartWithAnimation(featuredDish)}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                  title="Savatga qo'shish"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* 3D Floating Dish Plate with Steam particles */}
            <div className={`relative flex-shrink-0 animate-air-float ${
              deviceMode === 'mobile'
                ? 'w-28 h-28 sm:w-36 sm:h-36'
                : 'w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64'
            }`}>
              {/* Rising steam particles */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none z-20">
                <span className="w-1.5 h-4 bg-white/40 rounded-full blur-[1px] animate-steam" />
                <span className="w-1 h-5 bg-white/30 rounded-full blur-[1px] animate-steam delay-150" />
                <span className="w-1.5 h-3 bg-white/40 rounded-full blur-[1px] animate-steam delay-300" />
              </div>

              <div 
                onClick={() => onOpenAR(featuredDish)}
                className="w-full h-full rounded-2xl overflow-hidden border-2 border-[#C9A227] shadow-2xl cursor-pointer group relative"
              >
                <img
                  src={featuredDish.imageUrl}
                  alt={featuredDish.name[lang]}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-1.5">
                  <span className="text-[10px] font-bold text-[#E3C158] flex items-center gap-1">
                    <Eye className="w-3 h-3" /> 360° AIR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4. SENIOR & KID QUICK ACTION CALL BUTTONS (Otaxon & 4-sinf bola uchun juda oddiy) */}
      <div className="px-4 py-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-bold text-xs text-[var(--text-soft)] flex items-center gap-1.5">
              <span className="animate-pulse">⚡</span> {t.easyOrderTitle}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">
              Bir teginishda chaqirish
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Quick Call Waiter */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCallWaiter('waiter')}
              className="py-2.5 px-2 rounded-xl bg-[#C75B39]/10 dark:bg-[#C75B39]/20 backdrop-blur-md border border-[#C75B39]/30 text-[#C75B39] dark:text-[#FFA07A] font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition-all hover:border-[#C75B39]"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="leading-tight text-center">{t.quickCallWaiter}</span>
            </motion.button>

            {/* Quick Bring Water */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCallWaiter('water')}
              className="py-2.5 px-2 rounded-xl bg-[#1B4B73]/10 dark:bg-[#1B4B73]/25 backdrop-blur-md border border-[#1B4B73]/30 text-[#1B4B73] dark:text-[#60A5FA] font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition-all hover:border-[#1B4B73]"
            >
              <Droplets className="w-4 h-4 text-[#2E6FA3] dark:text-[#60A5FA]" />
              <span className="leading-tight text-center">{t.quickCallWater}</span>
            </motion.button>

            {/* Quick Bring Bill */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCallWaiter('bill')}
              className="py-2.5 px-2 rounded-xl bg-[#C9A227]/10 dark:bg-[#C9A227]/20 backdrop-blur-md border border-[#C9A227]/30 text-[#9C7515] dark:text-[#E3C158] font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition-all hover:border-[#C9A227]"
            >
              <Receipt className="w-4 h-4 text-[#C9A227]" />
              <span className="leading-tight text-center">{t.quickCallBill}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* 5. SEARCH BAR */}
      <div className="px-4 py-1.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[#C75B39] focus:outline-hidden shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 6. CATEGORY CHIPS */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 h-10 px-4 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-[#C75B39] to-[#E07A52] text-white shadow-md shadow-[#C75B39]/25'
                  : 'bg-[var(--bg-card)] backdrop-blur-md text-[var(--text-soft)] border border-[var(--border)] hover:border-[#C75B39]/40 hover:text-[var(--text)]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* 7. DIETARY & SPICE FILTERS */}
      <div className="px-4 py-1.5 flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap text-xs">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveFilter(activeFilter === 'halal' ? 'all' : 'halal')}
          className={`px-3 py-1.5 rounded-full border font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap backdrop-blur-md ${
            activeFilter === 'halal'
              ? 'bg-[#1B4B73]/15 border-[#1B4B73] text-[#1B4B73] dark:text-[#60A5FA]'
              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-soft)]'
          }`}
        >
          <span>🥗 {t.tagHalal}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveFilter(activeFilter === 'vegan' ? 'all' : 'vegan')}
          className={`px-3 py-1.5 rounded-full border font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap backdrop-blur-md ${
            activeFilter === 'vegan'
              ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#16A34A] dark:text-[#4ADE80]'
              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-soft)]'
          }`}
        >
          <span>🌱 {t.tagVegan}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveFilter(activeFilter === 'non-spicy' ? 'all' : 'non-spicy')}
          className={`px-3 py-1.5 rounded-full border font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap backdrop-blur-md ${
            activeFilter === 'non-spicy'
              ? 'bg-[#C75B39]/15 border-[#C75B39] text-[#C75B39] dark:text-[#FFA07A]'
              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-soft)]'
          }`}
        >
          <span>🌶 {t.tagNonSpicy}</span>
        </motion.button>
      </div>

      {/* Active Order Banner */}
      {activeOrder && (
        <div className="px-4 py-2">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenOrderStatus}
            className="p-3.5 rounded-2xl bg-[#1B4B73] text-white flex items-center justify-between shadow-md cursor-pointer hover:bg-[#2E6FA3] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#16A34A] animate-ping"></span>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-[#E3C158]">
                  Faol buyurtma: {activeOrder.id}
                </p>
                <p className="text-xs text-white/90 font-medium">
                  Holat: {t[`step${activeOrder.status.charAt(0).toUpperCase() + activeOrder.status.slice(1)}` as keyof typeof t] || activeOrder.status}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold underline flex items-center gap-1">
              Kuzatish <ChevronRight className="w-4 h-4" />
            </span>
          </motion.div>
        </div>
      )}

      {/* 8. DISH CARDS LIST (With 3D tilt, voice readout, tourist tips, and animated buttons) */}
      <div className={`px-4 py-3 ${dishGridClasses}`}>
        {filteredDishes.length === 0 ? (
          <div className="py-16 text-center space-y-2 col-span-full">
            <p className="text-base font-semibold text-[var(--text)]">Taom topilmadi</p>
            <p className="text-xs text-[var(--text-soft)]">Boshqa so'z bilan qidirib ko'ring yoki filtrni tozalang</p>
          </div>
        ) : (
          filteredDishes.map(dish => {
            const isJustAdded = justAddedId === dish.id;
            const isSpeaking = speakingDishId === dish.id;
            const isFactExpanded = expandedFactDishId === dish.id;
            const cartQty = getDishCartQuantity(dish.id);

            return (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`perspective-card p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between ${
                  dish.isSoldOut ? 'opacity-60' : ''
                }`}
              >
                <div className={deviceMode === 'mobile' ? 'flex gap-3.5' : 'flex flex-col gap-3.5 flex-1'}>
                  {/* Dish Image + 3D/Hit/Halal Badges */}
                  <div className={`relative rounded-2xl overflow-hidden flex-shrink-0 bg-[var(--bg-soft)] ${
                    deviceMode === 'mobile'
                      ? 'w-28 h-28 sm:w-32 sm:h-32'
                      : 'w-full h-48 sm:h-52'
                  }`}>
                    <img
                      src={dish.imageUrl}
                      alt={dish.name[lang]}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />

                    {/* Hit & New tags */}
                    {dish.tags.includes('hit') && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#C9A227] text-white text-[10px] font-bold tracking-wide shadow-xs flex items-center gap-0.5">
                        <Flame className="w-3 h-3" /> {t.tagHit}
                      </span>
                    )}

                    {dish.tags.includes('new') && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#1B4B73] text-white text-[10px] font-bold tracking-wide shadow-xs">
                        {t.tagNew}
                      </span>
                    )}

                    {/* 3D Model Floating Ribbon on Image */}
                    {dish.has3d && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onOpenAR(dish)}
                        className="absolute top-1.5 right-1.5 px-2 py-1 rounded-full bg-[#1B4B73]/90 hover:bg-[#1B4B73] backdrop-blur-md text-[#E3C158] text-[10px] font-extrabold border border-[#E3C158]/50 shadow-md flex items-center gap-1 cursor-pointer"
                        title="AIR 3D va AR stolda ko'rish"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>3D AIR</span>
                      </motion.button>
                    )}
                  </div>

                  {/* Dish Main Information */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Title + Audio Readout Button (for Elderly & Kids) */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="dish-title font-bold text-base sm:text-lg text-[var(--text)] leading-snug line-clamp-1">
                          {dish.name[lang]}
                        </h3>

                        {/* Speech synthesis audio button */}
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleSpeakDish(dish)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
                            isSpeaking
                              ? 'bg-[#16A34A] border-[#16A34A] text-white animate-pulse'
                              : 'bg-[var(--bg-soft)] border-[var(--border)] text-[var(--text-soft)] hover:text-[#C75B39]'
                          }`}
                          title={isSpeaking ? t.stopAudio : t.listenAudio}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </motion.button>
                      </div>

                      {/* Description */}
                      <p className="dish-desc text-xs text-[var(--text-soft)] line-clamp-2 mt-1 leading-relaxed">
                        {dish.description[lang]}
                      </p>

                      {/* Spice & Dietary Badges */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {dish.spiceLevel === 0 && (
                          <span className="text-[10px] font-semibold text-[#16A34A] bg-[#E8F8EE] dark:bg-[#122A1C] px-1.5 py-0.5 rounded-md">
                            🟢 {t.spiceMild}
                          </span>
                        )}
                        {dish.spiceLevel === 1 && (
                          <span className="text-[10px] font-semibold text-[#D97706] bg-[#FEF3C7] dark:bg-[#2E1D05] px-1.5 py-0.5 rounded-md">
                            🟡 {t.spiceMedium}
                          </span>
                        )}
                        {dish.spiceLevel && dish.spiceLevel >= 2 && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-[#FEE2E2] dark:bg-[#2A0D0D] px-1.5 py-0.5 rounded-md">
                            🔴 {t.spiceHot}
                          </span>
                        )}

                        {dish.diameterCm && (
                          <span className="text-[10px] font-semibold text-[#1B4B73] dark:text-[#60A5FA] bg-[#E8F0F7] dark:bg-[#111E2A] px-1.5 py-0.5 rounded-md">
                            Ø{dish.diameterCm} sm lagan
                          </span>
                        )}

                        <span className="text-[10px] text-[var(--text-muted)]">
                          {dish.prepTime} {t.minute} · {dish.weight}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Price + Add/Quantity Controls */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]/60">
                      <div>
                        <span className="dish-price text-base sm:text-lg font-black text-[var(--text)] num">
                          {formatPrice(dish.price, currency)}
                        </span>
                        {currency !== 'UZS' && (
                          <p className="text-[10px] text-[var(--text-muted)] num">
                            {dish.price.toLocaleString()} so'm
                          </p>
                        )}
                      </div>

                      {/* Add Button with instant animated response */}
                      <div className="flex items-center gap-1.5">
                        {cartQty > 0 ? (
                          <div className="flex items-center bg-[#FBEDE8] dark:bg-[#2A1810] border border-[#C75B39]/40 rounded-xl p-0.5">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(dish.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-[#1C1815] text-[#C75B39] flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </motion.button>
                            <span className="px-2 font-bold text-xs text-[#C75B39] num">
                              {cartQty}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => handleAddToCartWithAnimation(dish)}
                              className="w-7 h-7 rounded-lg bg-[#C75B39] text-white flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleAddToCartWithAnimation(dish)}
                            disabled={dish.isSoldOut}
                            className={`h-9 sm:h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                              isJustAdded
                                ? 'bg-[#16A34A] text-white'
                                : 'bg-[#C75B39] hover:bg-[#E07A52] text-white'
                            }`}
                          >
                            {isJustAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.added}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t.addToCart}</span>
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cultural / Tourist Fact Badge (Collapsible for Foreign Guests) */}
                {dish.touristFact && (
                  <div className="pt-2 border-t border-[var(--border)]/40 text-[11px]">
                    <button
                      onClick={() => setExpandedFactDishId(isFactExpanded ? null : dish.id)}
                      className="text-[#1B4B73] dark:text-[#60A5FA] font-bold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Silk Road Culinary Heritage' : lang === 'ru' ? 'История и традиции блюда' : 'Taom tarixi va madaniyati'}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isFactExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isFactExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1.5 p-2.5 rounded-xl bg-[var(--bg-soft)] text-[var(--text-soft)] leading-relaxed italic border border-[var(--border)]"
                      >
                        "{dish.touristFact[lang]}"
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* 9. STICKY BOTTOM BAR (With animated cart count, call waiter, and AI bot) */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--border)] ${dockClasses}`}>
        <div className="flex items-center gap-2">
          {/* Call waiter icon button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onCallWaiter('waiter')}
            className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[#FBEDE8] hover:text-[#C75B39] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title={t.callWaiter}
          >
            <Bell className="w-5 h-5 text-[#C75B39]" />
          </motion.button>

          {/* AI Waiter Chatbot button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenAIChat}
            className="w-12 h-12 rounded-2xl bg-[#1B4B73] hover:bg-[#2E6FA3] text-[#C9A227] flex items-center justify-center transition-all cursor-pointer shadow-xs relative"
            title={t.aiTitle}
          >
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#16A34A] border-2 border-[var(--bg)]"></span>
          </motion.button>

          {/* Cart CTA Button with bounce animation on count change */}
          <motion.button
            id="btn-open-cart-floating"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenCart}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#E07A52] hover:brightness-105 active:brightness-95 text-white font-extrabold text-sm flex items-center justify-between px-4 transition-all shadow-lg shadow-[#C75B39]/30 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{t.cartTitle}</span>
              {totalCartCount > 0 && (
                <motion.span 
                  key={totalCartCount}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 rounded-full bg-white/25 text-xs font-black"
                >
                  {totalCartCount} ta
                </motion.span>
              )}
            </div>

            <span className="font-black text-sm num">
              {formatPrice(totalCartPrice, currency)}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
