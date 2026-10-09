import React, { useState } from 'react';
import { Dish, Order, RestaurantTable, Language, UserRole } from '../types';
import { translations } from '../data/translations';
import { INITIAL_ANALYTICS } from '../data/mockData';
import { 
  BarChart3, 
  TrendingUp, 
  Smartphone, 
  QrCode, 
  Layers, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Eye, 
  LogOut, 
  ArrowUpRight, 
  Check, 
  Printer, 
  Sparkles,
  Utensils
} from 'lucide-react';

interface AdminViewProps {
  dishes: Dish[];
  orders: Order[];
  tables: RestaurantTable[];
  lang: Language;
  onSwitchRole: (role: UserRole) => void;
  onToggleDish3D: (dishId: string) => void;
  onUpdateDishPrice: (dishId: string, newPrice: number) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  dishes,
  orders,
  tables,
  lang,
  onSwitchRole,
  onToggleDish3D,
  onUpdateDishPrice
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'qr' | 'menu'>('dashboard');
  const [selectedQrTable, setSelectedQrTable] = useState<number>(5);

  const stats = INITIAL_ANALYTICS;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* Top Admin Navbar */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#1B4B73] text-[#C9A227] flex items-center justify-center font-bold text-sm shadow-xs border border-[#C9A227]/40">
              AR
            </span>
            <div>
              <h1 className="font-display font-bold text-lg text-[var(--text)]">
                ARMENU Boshqaruv Markazi
              </h1>
              <p className="text-xs text-[var(--text-soft)]">
                Restoran: <strong>{t.restaurantName}</strong> · Toshkent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchRole('customer')}
              className="px-4 py-2 rounded-xl bg-[var(--bg-soft)] hover:bg-[#FBEDE8] text-xs font-semibold text-[var(--text)] hover:text-[#C75B39] border border-[var(--border)] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Mijoz menyusi</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto flex gap-3 mt-4 pt-2 border-t border-[var(--border)] text-sm font-semibold overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: t.tabDashboard, icon: BarChart3 },
            { id: 'analytics', label: t.tabArAnalytics, icon: Smartphone },
            { id: 'qr', label: t.tabQrCodes, icon: QrCode },
            { id: 'menu', label: t.tabMenuMgmt, icon: Utensils }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#C75B39] text-white shadow-xs'
                    : 'text-[var(--text-soft)] hover:bg-[var(--bg-soft)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: EXECUTIVE DASHBOARD (Section 11.7) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 5 Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.statTodayRevenue}
                </span>
                <p className="text-2xl font-bold text-[var(--text)] mt-1.5 num">
                  {(stats.todayRevenue / 1000000).toFixed(1)} mln
                </p>
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +12% o'sish
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.statOrders}
                </span>
                <p className="text-2xl font-bold text-[var(--text)] mt-1.5 num">
                  {stats.todayOrders} ta
                </p>
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +8% kechagidan
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.statAvgCheck}
                </span>
                <p className="text-2xl font-bold text-[var(--text)] mt-1.5 num">
                  {stats.avgCheck.toLocaleString()} {t.currency}
                </p>
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +23% (AR ta'siri)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.statTablesOccupied}
                </span>
                <p className="text-2xl font-bold text-[var(--text)] mt-1.5 num">
                  {stats.tablesOccupied}
                </p>
                <span className="text-xs font-semibold text-[#2E6FA3] mt-1 block">
                  75% bandlik
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.statArViews}
                </span>
                <p className="text-2xl font-bold text-[#1B4B73] dark:text-[#60A5FA] mt-1.5 num">
                  {stats.arViewsToday} ta
                </p>
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +34% qiziqish
                </span>
              </div>
            </div>

            {/* Middle Section: Chart & Top Dishes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hourly Sales Chart */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-[var(--text)] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#C75B39]" />
                    {t.chartHourly}
                  </h3>
                  <span className="text-xs text-[var(--text-soft)]">Soatbay tushum</span>
                </div>

                {/* SVG/CSS Bar visualizer */}
                <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
                  {stats.hourlySales.map(h => {
                    const heightPct = Math.round((h.amount / 1600000) * 100);
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full bg-[var(--bg-soft)] rounded-t-lg h-36 flex items-end overflow-hidden">
                          <div
                            className="w-full bg-[#C75B39] hover:bg-[#E07A52] rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                            style={{ height: `${heightPct}%` }}
                            title={`${h.hour}: ${h.amount.toLocaleString()} so'm`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--text-soft)]">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 5 Dishes */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-4">
                <h3 className="font-bold text-base text-[var(--text)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C9A227]" />
                  {t.topDishes}
                </h3>
                <div className="divide-y divide-[var(--border)]">
                  {dishes.slice(0, 5).map((d, idx) => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[var(--bg-soft)] text-xs font-bold flex items-center justify-center text-[var(--text-soft)]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-xs text-[var(--text)] line-clamp-1">{d.name[lang]}</p>
                          <p className="text-[11px] text-[var(--text-soft)] num">{d.price.toLocaleString()} {t.currency}</p>
                        </div>
                      </div>
                      {d.has3d && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B4B73] text-[#C9A227]">
                          AR 🎯
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Feed Stream */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping"></span>
                {t.liveFeed}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--text-soft)]">14:32</span>
                    <span className="font-bold text-[var(--text)]">Stol №5</span>
                    <span className="text-[var(--text-soft)]">yangi buyurtma berdi (#047)</span>
                  </div>
                  <span className="font-bold text-[#C75B39] num">118 800 so'm</span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--text-soft)]">14:31</span>
                    <span className="font-bold text-[var(--text)]">Stol №11</span>
                    <span className="text-[#16A34A] font-semibold">Oshxona tayyorladi (#046)</span>
                  </div>
                  <span className="font-bold text-[var(--text)] num">138 600 so'm</span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--text-soft)]">14:28</span>
                    <span className="font-bold text-[var(--text)]">Stol №3</span>
                    <span className="text-[#C9A227] font-semibold">⭐⭐⭐⭐⭐ A'lo darajada palov va choy!</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-soft)]">Otziv qoldirildi</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AR ANALYTICS (Section 11.8 - The ultimate restaurant owner retention screen) */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top 3 KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {t.arViewsCount} (Bu oy)
                </span>
                <p className="text-3xl font-extrabold text-[#1B4B73] dark:text-[#60A5FA] mt-2 num">
                  {stats.arViewsMonth.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-soft)] mt-1">Har bir stolda o'rtacha 3.8 taom ko'rildi</p>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {t.arConversionRate}
                </span>
                <p className="text-3xl font-extrabold text-[#16A34A] mt-2 num">
                  {stats.arConversionRate}%
                </p>
                <p className="text-xs text-[var(--text-soft)] mt-1">AR ko'rgan mijozlarning savatga qo'shish foizi</p>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {t.arCheckImpact}
                </span>
                <p className="text-3xl font-extrabold text-[#C75B39] mt-2 num">
                  +{stats.arCheckImpactPct}%
                </p>
                <p className="text-xs text-[var(--text-soft)] mt-1">AR orqali o'rtacha chekning o'sish farqi</p>
              </div>
            </div>

            {/* Direct Side-by-Side Comparison Box */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm space-y-6">
              <h3 className="font-bold text-lg text-[var(--text)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#16A34A]" />
                {t.arWithVsWithout}
              </h3>

              <div className="space-y-4">
                {/* AR Viewers Check */}
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="flex items-center gap-2 text-[#1B4B73] dark:text-[#60A5FA]">
                      <span className="w-3 h-3 rounded-full bg-[#1B4B73]"></span>
                      {t.arWithText}
                    </span>
                    <span className="text-base font-bold text-[var(--text)] num">
                      {stats.avgCheckWithAr.toLocaleString()} {t.currency}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-soft)] rounded-full h-4 overflow-hidden">
                    <div className="bg-[#1B4B73] h-full rounded-full w-[100%]" />
                  </div>
                </div>

                {/* Non-AR Viewers Check */}
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="flex items-center gap-2 text-[var(--text-soft)]">
                      <span className="w-3 h-3 rounded-full bg-[var(--border)]"></span>
                      {t.arWithoutText}
                    </span>
                    <span className="text-base font-bold text-[var(--text-soft)] num">
                      {stats.avgCheckWithoutAr.toLocaleString()} {t.currency}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-soft)] rounded-full h-4 overflow-hidden">
                    <div className="bg-[var(--border)] h-full rounded-full w-[76%]" />
                  </div>
                </div>
              </div>

              {/* ROI & Incremental Revenue Result Banner */}
              <div className="p-5 rounded-2xl bg-[#FBEDE8] dark:bg-[#2A1810] border border-[#C75B39]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#A8452A] dark:text-[#E07A52]">
                    ➜ {t.arExtraRevenue}:
                  </span>
                  <span className="text-xl font-extrabold text-[#C75B39] num">
                    +{stats.monthlyArExtraRevenue.toLocaleString()} {t.currency}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-soft)] pt-1 border-t border-[#C75B39]/20">
                  <span>ARMENU PRO oylik tarif to'lovi: {stats.monthlySubscriptionCost.toLocaleString()} {t.currency}</span>
                  <span className="font-extrabold text-sm text-[#16A34A]">{t.arRoi} = 24×</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STOLLAR VA QR KODLAR */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-[var(--text)]">Stol QR Kodlari Generatori</h3>
                <p className="text-xs text-[var(--text-soft)]">Har bir stol uchun individual QR kodli stikerlar chop eting</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 h-11 rounded-xl bg-[#1B4B73] hover:bg-[#2E6FA3] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>PDF Chop etish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Table Selector */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                <h4 className="font-bold text-xs text-[var(--text-muted)] uppercase">Stolni tanlang</h4>
                <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {tables.map(tbl => (
                    <button
                      key={tbl.number}
                      onClick={() => setSelectedQrTable(tbl.number)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedQrTable === tbl.number
                          ? 'bg-[#C75B39] text-white border-[#C75B39]'
                          : 'bg-[var(--bg-soft)] text-[var(--text)] border-[var(--border)]'
                      }`}
                    >
                      №{tbl.number}
                    </button>
                  ))}
                </div>
              </div>

              {/* Printable QR Table Stand Preview */}
              <div className="md:col-span-2 flex justify-center">
                <div className="w-72 bg-white text-black p-6 rounded-2xl shadow-xl border-4 border-[#1B4B73] flex flex-col items-center text-center space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#C75B39]">ARMENU</span>
                    <h2 className="font-display font-bold text-2xl text-[#1B4B73] tracking-tight">
                      REGISTON
                    </h2>
                    <p className="text-xs text-gray-600 font-medium">Stol ustidagi 3D Menyu</p>
                  </div>

                  {/* QR Box */}
                  <div className="p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl relative">
                    <QrCode className="w-40 h-40 text-[#1B4B73]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#1B4B73] text-[#C9A227] flex items-center justify-center font-bold text-xs border-2 border-white shadow-md">
                        3D
                      </div>
                    </div>
                  </div>

                  <div className="w-full py-2 bg-[#1B4B73] text-white rounded-xl">
                    <span className="text-xl font-extrabold tracking-wider">STOL №{selectedQrTable}</span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-tight">
                    Kamerani qarating va taomlarni stolda haqiqiy 3D o'lchamda ko'ring
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DISH & 3D MANAGER */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[var(--text)]">Menyu va 3D Modellar Boshqaruvi</h3>
            <div className="divide-y divide-[var(--border)] rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden shadow-xs">
              {dishes.map(dish => (
                <div key={dish.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={dish.imageUrl} alt={dish.name[lang]} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--text)]">{dish.name[lang]}</h4>
                      <span className="text-xs text-[var(--text-soft)] num">
                        {dish.price.toLocaleString()} {t.currency} · Lagan Ø{dish.diameterCm} sm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* 3D Model Toggle */}
                    <button
                      onClick={() => onToggleDish3D(dish.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        dish.has3d
                          ? 'bg-[#1B4B73] text-[#C9A227] border-[#C9A227]/50'
                          : 'bg-[var(--bg-soft)] text-[var(--text-muted)] border-[var(--border)]'
                      }`}
                    >
                      {dish.has3d ? '✓ 3D Faol' : '3D Yo\'q'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
