import React, { useState, useEffect } from 'react';
import { Order, Language, UserRole } from '../types';
import { translations } from '../data/translations';
import { 
  ChefHat, 
  Clock, 
  AlertTriangle, 
  Check, 
  Maximize, 
  LogOut, 
  Flame,
  Volume2
} from 'lucide-react';

interface KDSViewProps {
  orders: Order[];
  lang: Language;
  onSwitchRole: (role: UserRole) => void;
  onUpdateOrderStatus: (orderId: string, status: any) => void;
}

export const KDSView: React.FC<KDSViewProps> = ({
  orders,
  lang,
  onSwitchRole,
  onUpdateOrderStatus
}) => {
  const t = translations[lang];
  const [now, setNow] = useState(Date.now());

  // Tick every second for elapsed kitchen timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const newOrders = orders.filter(o => o.status === 'new');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const getElapsedSeconds = (createdAt: Date) => {
    return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getTimerColorClass = (seconds: number, targetMins: number = 15) => {
    const targetSecs = targetMins * 60;
    const ratio = seconds / targetSecs;
    if (ratio < 0.5) return 'text-[#16A34A]'; // Green (0-50%)
    if (ratio < 0.8) return 'text-[#D97706]'; // Amber (50-80%)
    if (ratio <= 1.0) return 'text-[#EA580C]'; // Orange (80-100%)
    return 'text-[#DC2626] animate-pulse font-extrabold'; // Overdue (>100%)
  };

  return (
    <div className="min-h-screen bg-[#0D0B09] text-[#F5F1EA] p-4 sm:p-6 font-sans">
      {/* KDS Top Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-[#2A241F] mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🍳</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-[#F5F1EA]">
              {t.kdsTitle}
            </h1>
          </div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#1A1714] border border-[#2A241F] text-[#A89E92]">
            {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#C75B39]/20 text-[#C75B39] border border-[#C75B39]/40">
            {t.kdsActive}: {newOrders.length + cookingOrders.length + readyOrders.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSwitchRole('customer')}
            className="px-4 py-2 rounded-xl bg-[#1A1714] hover:bg-[#2A241F] border border-[#2A241F] text-xs font-bold text-[#A89E92] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Mijoz menyusiga</span>
          </button>
        </div>
      </header>

      {/* 3 Equal Columns (YANGI, TAYYORLANMOQDA, TAYYOR) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: YANGI */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#1B4B73] px-1">
            <h2 className="text-lg font-extrabold tracking-wider text-[#60A5FA]">
              🆕 {t.kdsColNew} ({newOrders.length})
            </h2>
          </div>

          <div className="space-y-4">
            {newOrders.map(ord => {
              const elapsed = getElapsedSeconds(ord.createdAt);
              return (
                <div
                  key={ord.id}
                  className="p-5 rounded-2xl bg-[#1A1714] border-2 border-[#2A241F] hover:border-[#1B4B73] shadow-lg space-y-3"
                >
                  <div className="flex justify-between items-center text-xs text-[#A89E92]">
                    <span className="font-mono font-bold text-sm text-white">{ord.id}</span>
                    <span className={`text-xl font-bold font-mono ${getTimerColorClass(elapsed, ord.estimatedMinutes)}`}>
                      ⏱ {formatTimer(elapsed)}
                    </span>
                  </div>

                  {/* TABLE NUMBER — 56px Extrabold for 3-meter distance readability */}
                  <div className="py-1">
                    <p className="text-4xl sm:text-5xl font-extrabold text-[#F5F1EA] tracking-tight">
                      STOL {ord.tableNumber}
                    </p>
                  </div>

                  {/* Dish List */}
                  <div className="divide-y divide-[#2A241F] py-1">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between">
                        <span className="text-xl sm:text-2xl font-bold text-[#F5F1EA]">
                          {it.quantity}× {it.dish.name[lang].toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Notes in Warning Box */}
                  {ord.customerNote && (
                    <div className="p-3 rounded-xl bg-[#2A1E14] border border-[#D97706] text-[#FBBF24] text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>⚠️ {ord.customerNote}</span>
                    </div>
                  )}

                  {/* Start Cooking Button */}
                  <button
                    onClick={() => onUpdateOrderStatus(ord.id, 'cooking')}
                    className="w-full h-14 rounded-xl bg-[#1B4B73] hover:bg-[#2E6FA3] text-white font-extrabold text-base tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    {t.kdsBtnStart}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: TAYYORLANMOQDA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#D97706] px-1">
            <h2 className="text-lg font-extrabold tracking-wider text-[#FBBF24]">
              🍳 {t.kdsColCooking} ({cookingOrders.length})
            </h2>
          </div>

          <div className="space-y-4">
            {cookingOrders.map(ord => {
              const elapsed = getElapsedSeconds(ord.createdAt);
              const isLate = elapsed > (ord.estimatedMinutes || 15) * 60;

              return (
                <div
                  key={ord.id}
                  className={`p-5 rounded-2xl bg-[#1A1714] border-2 shadow-lg space-y-3 ${
                    isLate ? 'border-[#DC2626] animate-pulse' : 'border-[#D97706]/70'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs text-[#A89E92]">
                    <span className="font-mono font-bold text-sm text-white">{ord.id}</span>
                    <span className={`text-xl font-bold font-mono ${getTimerColorClass(elapsed, ord.estimatedMinutes)}`}>
                      ⏱ {formatTimer(elapsed)}
                    </span>
                  </div>

                  {/* TABLE NUMBER — 56px Extrabold */}
                  <div className="py-1">
                    <p className="text-4xl sm:text-5xl font-extrabold text-[#F5F1EA] tracking-tight">
                      STOL {ord.tableNumber}
                    </p>
                  </div>

                  {/* Dish List */}
                  <div className="divide-y divide-[#2A241F] py-1">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between">
                        <span className="text-xl sm:text-2xl font-bold text-[#F5F1EA]">
                          {it.quantity}× {it.dish.name[lang].toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {ord.customerNote && (
                    <div className="p-3 rounded-xl bg-[#2A1E14] border border-[#D97706] text-[#FBBF24] text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>⚠️ {ord.customerNote}</span>
                    </div>
                  )}

                  {/* Mark Ready Button */}
                  <button
                    onClick={() => onUpdateOrderStatus(ord.id, 'ready')}
                    className="w-full h-14 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-base tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    {t.kdsBtnReady}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: TAYYOR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#16A34A] px-1">
            <h2 className="text-lg font-extrabold tracking-wider text-[#4ADE80]">
              ✅ {t.kdsColReady} ({readyOrders.length})
            </h2>
          </div>

          <div className="space-y-4">
            {readyOrders.map(ord => {
              const elapsed = getElapsedSeconds(ord.createdAt);
              return (
                <div
                  key={ord.id}
                  className="p-5 rounded-2xl bg-[#15281E] border-2 border-[#16A34A] shadow-lg space-y-3"
                >
                  <div className="flex justify-between items-center text-xs text-[#A89E92]">
                    <span className="font-mono font-bold text-sm text-white">{ord.id}</span>
                    <span className="text-sm font-bold text-[#16A34A] flex items-center gap-1">
                      <Check className="w-4 h-4" /> OFITSIANT KUTILMOQDA
                    </span>
                  </div>

                  {/* TABLE NUMBER — 56px Extrabold */}
                  <div className="py-1">
                    <p className="text-4xl sm:text-5xl font-extrabold text-[#F5F1EA] tracking-tight">
                      STOL {ord.tableNumber}
                    </p>
                  </div>

                  <div className="divide-y divide-[#2A241F] py-1">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="py-2">
                        <span className="text-xl sm:text-2xl font-bold text-[#F5F1EA]">
                          {it.quantity}× {it.dish.name[lang].toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Served Button */}
                  <button
                    onClick={() => onUpdateOrderStatus(ord.id, 'delivered')}
                    className="w-full h-14 rounded-xl bg-[#241F1B] hover:bg-[#332C26] text-[#A89E92] hover:text-white font-extrabold text-base tracking-wider border border-[#332C26] transition-all cursor-pointer"
                  >
                    {t.kdsBtnServed}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
