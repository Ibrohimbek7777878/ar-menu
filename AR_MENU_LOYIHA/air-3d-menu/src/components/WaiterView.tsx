import React, { useState } from 'react';
import { Order, RestaurantTable, Language, UserRole } from '../types';
import { translations } from '../data/translations';
import { 
  Bell, 
  Clock, 
  Check, 
  UtensilsCrossed, 
  MapPin, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle,
  User,
  LogOut,
  TrendingUp,
  Receipt,
  HeartHandshake
} from 'lucide-react';

interface WaiterViewProps {
  orders: Order[];
  tables: RestaurantTable[];
  lang: Language;
  onSwitchRole: (role: UserRole) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: any) => void;
  onUpdateTableStatus: (tableNumber: number, status: any) => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({
  orders,
  tables,
  lang,
  onSwitchRole,
  onUpdateOrderStatus,
  onUpdateTableStatus
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'orders' | 'floor' | 'calls' | 'stats'>('orders');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'paid');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const tableCalls = tables.filter(t => t.callAlert);

  return (
    <div className="min-h-screen bg-[#14110E] text-[#F5F1EA] max-w-lg mx-auto pb-24 font-sans">
      {/* 1. Header Bar */}
      <header className="bg-[#1C1815] border-b border-[#332C26] px-5 py-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C75B39] text-white flex items-center justify-center font-bold text-base shadow-xs">
              🧑‍🍳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#F5F1EA]">Dilshod (Ofitsiant)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40">
                  Faol smena
                </span>
              </div>
              <p className="text-xs text-[#A89E92] mt-0.5">Smena: 4s 20d · Zal 1</p>
            </div>
          </div>

          <button
            onClick={() => onSwitchRole('customer')}
            className="px-3 py-1.5 rounded-lg bg-[#241F1B] hover:bg-[#332C26] text-xs font-semibold text-[#A89E92] border border-[#332C26] flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Mijozga</span>
          </button>
        </div>

        {/* Stats ticker: Bugun: 23 stol · 4,2 mln · 💝 87 000 */}
        <div className="mt-3 pt-2.5 border-t border-[#332C26] flex items-center justify-between text-xs text-[#A89E92]">
          <span className="flex items-center gap-1">
            🪑 <strong className="text-[#F5F1EA] font-semibold">23</strong> stol
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            💰 <strong className="text-[#F5F1EA] font-semibold">4 200 000</strong> {t.currency}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-[#E3C158]">
            💝 <strong className="font-semibold">87 000</strong> {t.currency} choychaqa
          </span>
        </div>
      </header>

      {/* 2. Content Views */}
      <div className="p-4 space-y-4">
        {/* Tab 1: Orders (Section 11.5) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#A89E92] px-1">
              <span>🔔 {activeOrders.length} {t.waiterNewOrders}</span>
              <span>Navbat bo'yicha</span>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-12 text-center text-[#A89E92] bg-[#1C1815] rounded-2xl border border-[#332C26]">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-[#6B6259] mb-2" />
                <p className="font-medium text-sm">Hozircha yangi buyurtmalar yo'q</p>
                <p className="text-xs text-[#6B6259] mt-1">Stollardan buyurtma tushganda shu yerda paydo bo'ladi</p>
              </div>
            ) : (
              activeOrders.map(ord => {
                const isReady = ord.status === 'ready';
                const isNew = ord.status === 'new';

                return (
                  <div
                    key={ord.id}
                    className={`p-5 rounded-2xl border transition-all relative ${
                      isReady
                        ? 'bg-[#15281E] border-[#16A34A] shadow-lg animate-pulse'
                        : 'bg-[#1C1815] border-[#332C26]'
                    }`}
                  >
                    {/* Top Row: ID + Elapsed Time */}
                    <div className="flex items-center justify-between text-xs text-[#A89E92]">
                      <span className="font-bold text-[#F5F1EA]">{ord.id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 2 daqiqa oldin
                      </span>
                    </div>

                    {/* TABLE NUMBER — Enormous 32px Extrabold matching Section 2.2 & 11.5 */}
                    <div className="my-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🪑</span>
                        <span className="text-3xl sm:text-4xl font-extrabold text-[#F5F1EA] tracking-tight">
                          STOL {ord.tableNumber}
                        </span>
                      </div>

                      {isReady && (
                        <span className="px-3 py-1 rounded-full bg-[#16A34A] text-white text-xs font-extrabold uppercase tracking-wider animate-bounce">
                          TAYYOR!
                        </span>
                      )}
                    </div>

                    {/* Dishes summary */}
                    <div className="text-sm font-medium text-[#F5F1EA]/90 space-y-1 my-2">
                      {ord.items.map((it, idx) => (
                        <p key={idx} className="line-clamp-1">
                          • {it.quantity}× {it.dish.name[lang]}
                        </p>
                      ))}
                    </div>

                    {/* Customer Note Warning Box */}
                    {ord.customerNote && (
                      <div className="p-2.5 rounded-xl bg-[#2A1E14] border border-[#D97706]/40 text-[#D97706] text-xs flex items-center gap-2 my-3">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>💬 "{ord.customerNote}"</span>
                      </div>
                    )}

                    {/* Total Price */}
                    <div className="flex justify-between items-baseline pt-2 border-t border-[#2A241F] mb-4">
                      <span className="text-xs text-[#A89E92]">Summa:</span>
                      <span className="text-lg font-bold text-[#F5F1EA] num">
                        {ord.total.toLocaleString()} {t.currency}
                      </span>
                    </div>

                    {/* 52px Primary Action Button */}
                    {isNew && (
                      <button
                        onClick={() => {
                          onUpdateOrderStatus(ord.id, 'cooking');
                          onUpdateTableStatus(ord.tableNumber, 'occupied');
                        }}
                        className="w-full h-13 rounded-xl bg-[#C75B39] hover:bg-[#E07A52] active:bg-[#A8452A] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Check className="w-5 h-5" />
                        <span>{t.btnAcceptOrder}</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => {
                          onUpdateOrderStatus(ord.id, 'delivered');
                          onUpdateTableStatus(ord.tableNumber, 'occupied');
                        }}
                        className="w-full h-13 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <UtensilsCrossed className="w-5 h-5" />
                        <span>{t.btnDeliverOrder}</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Zal Plani (2D Floor Plan) */}
        {activeTab === 'floor' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-[#F5F1EA]">{t.tabFloorPlan} (14 Stol)</span>
              <div className="flex gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-[#16A34A]">● Bo'sh</span>
                <span className="flex items-center gap-1 text-[#2E6FA3]">● Band</span>
                <span className="flex items-center gap-1 text-[#DC2626]">● Tayyor</span>
              </div>
            </div>

            {/* Interactive 2D Floor Plan Grid */}
            <div className="p-4 rounded-2xl bg-[#1C1815] border border-[#332C26] grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables.map(tbl => {
                const statusColor = 
                  tbl.status === 'free' ? 'bg-[#16A34A]/20 border-[#16A34A] text-[#16A34A]' :
                  tbl.status === 'occupied' ? 'bg-[#2E6FA3]/20 border-[#2E6FA3] text-[#60A5FA]' :
                  tbl.status === 'waiting' ? 'bg-[#D97706]/20 border-[#D97706] text-[#FBBF24]' :
                  tbl.status === 'ready' ? 'bg-[#DC2626]/20 border-[#DC2626] text-[#F87171] animate-pulse' :
                  'bg-[#7C3AED]/20 border-[#7C3AED] text-[#C084FC]';

                return (
                  <button
                    key={tbl.number}
                    onClick={() => setSelectedTable(tbl)}
                    className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-between h-24 transition-all cursor-pointer hover:scale-105 ${statusColor}`}
                  >
                    <span className="text-xs font-bold uppercase">{tbl.zone}</span>
                    <span className="text-2xl font-extrabold text-[#F5F1EA]">№{tbl.number}</span>
                    <span className="text-[10px] font-semibold">
                      {t[`table${tbl.status.charAt(0).toUpperCase() + tbl.status.slice(1)}` as keyof typeof t] || tbl.status}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Table Quick Actions */}
            {selectedTable && (
              <div className="p-4 rounded-2xl bg-[#241F1B] border border-[#332C26] space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-[#F5F1EA]">
                    Stol №{selectedTable.number} — Boshqarish
                  </h4>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="text-xs text-[#A89E92] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onUpdateTableStatus(selectedTable.number, 'free')}
                    className="p-2 rounded-lg bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A] text-xs font-bold"
                  >
                    Bo'shatish
                  </button>
                  <button
                    onClick={() => onUpdateTableStatus(selectedTable.number, 'occupied')}
                    className="p-2 rounded-lg bg-[#2E6FA3]/20 text-[#60A5FA] border border-[#2E6FA3] text-xs font-bold"
                  >
                    Band qilish
                  </button>
                  <button
                    onClick={() => onUpdateTableStatus(selectedTable.number, 'bill')}
                    className="p-2 rounded-lg bg-[#7C3AED]/20 text-[#C084FC] border border-[#7C3AED] text-xs font-bold"
                  >
                    Hisob chiqarish
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Calls */}
        {activeTab === 'calls' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[#F5F1EA]">Mijoz chaqiruvlari</h3>
            {tableCalls.length === 0 ? (
              <div className="p-8 text-center text-[#A89E92] bg-[#1C1815] rounded-2xl border border-[#332C26]">
                <Bell className="w-8 h-8 mx-auto text-[#6B6259] mb-2" />
                <p className="text-sm">Hozircha yangi chaqiruvlar yo'q</p>
              </div>
            ) : (
              tableCalls.map(c => (
                <div key={c.number} className="p-4 rounded-xl bg-[#1C1815] border border-[#C75B39] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                      <p className="font-bold text-base text-[#F5F1EA]">Stol №{c.number}</p>
                      <p className="text-xs text-[#C75B39] font-medium">Ofitsiant chaqirdi</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateTableStatus(c.number, c.status)}
                    className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs font-bold cursor-pointer"
                  >
                    Borilmoqda ✓
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Waiter Stats */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#1C1815] border border-[#332C26] space-y-4">
              <h3 className="font-bold text-sm text-[#F5F1EA] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C9A227]" />
                Bugungi shaxsiy natijalar
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#241F1B] border border-[#332C26]">
                  <p className="text-xs text-[#A89E92]">Xizmat ko'rsatilgan</p>
                  <p className="text-2xl font-bold text-[#F5F1EA] mt-1">23 stol</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#241F1B] border border-[#332C26]">
                  <p className="text-xs text-[#A89E92]">Olingan choychaqa</p>
                  <p className="text-2xl font-bold text-[#E3C158] mt-1">87 000 {t.currency}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#241F1B] border border-[#332C26]">
                <p className="text-xs text-[#A89E92]">Jami buyurtmalar aylanmasi</p>
                <p className="text-2xl font-bold text-[#16A34A] mt-1">4 200 000 {t.currency}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Tab Bar matching Section 11.5 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1C1815] border-t border-[#332C26] max-w-lg mx-auto px-4 py-2 flex justify-around">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'orders' ? 'text-[#C75B39]' : 'text-[#A89E92] hover:text-white'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5 mb-0.5" />
          <span>{t.tabOrders}</span>
        </button>

        <button
          onClick={() => setActiveTab('floor')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'floor' ? 'text-[#C75B39]' : 'text-[#A89E92] hover:text-white'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>{t.tabFloorPlan}</span>
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
            activeTab === 'calls' ? 'text-[#C75B39]' : 'text-[#A89E92] hover:text-white'
          }`}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span>{t.tabCalls}</span>
          {tableCalls.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#DC2626]"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'stats' ? 'text-[#C75B39]' : 'text-[#A89E92] hover:text-white'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span>{t.tabWaiterStats}</span>
        </button>
      </div>
    </div>
  );
};
