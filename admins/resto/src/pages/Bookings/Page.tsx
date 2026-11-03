import React, { useRef, useState } from 'react';
import { t, useSession } from '@admins/shared';
import { CalendarDays, Settings2 } from 'lucide-react';
import { ReservationsTab } from './ReservationsTab';
import { SettingsTab } from './SettingsTab';
import { TAP, hintStyle, pageStyle, srOnly } from './styles';
import { clearBookingDraftStash, useBookingSettings } from './useBookingSettings';
import { useLeaveGuard } from './useLeaveGuard';

type TabId = 'list' | 'settings';

/** Bronlar bo'limi (`/ra/bookings`): "Bronlar" ro'yxati va "Bron sozlamalari" muharriri. */
export const BookingsPage: React.FC = () => {
  const { hasCapability } = useSession();
  const canSettings = hasCapability('settings_admin');
  const [tab, setTab] = useState<TabId>('list');
  const settings = useBookingSettings();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ list: null, settings: null });

  // Saqlanmagan sozlama bilan sahifadan chiqib ketishdan oldin tasdiq (yorliq yopish, yangilash, yon menyu)
  useLeaveGuard(settings.dirty, t("Bron sozlamalarida saqlanmagan o'zgarishlar bor. Sahifadan chiqsangiz, ular yo'qoladi. Chiqamizmi?"), clearBookingDraftStash);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: t('Bronlar'), icon: <CalendarDays size={18} aria-hidden="true" /> },
    ...(canSettings ? [{ id: 'settings' as const, label: t('Bron sozlamalari'), icon: <Settings2 size={18} aria-hidden="true" /> }] : []),
  ];
  // Ruxsat olinsa-yu, sozlamalar tabi ochiq turgan bo'lsa ro'yxatga qaytariladi
  const active: TabId = tab === 'settings' && !canSettings ? 'list' : tab;

  const select = (id: TabId) => {
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent, id: TabId) => {
    const index = tabs.findIndex((item) => item.id === id);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].id);
  };

  return (
    <div style={pageStyle}>
      <header style={{ marginBottom: '12px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('Bronlar')}</h1>
        <p style={{ ...hintStyle, margin: 0, fontSize: '14px' }}>{t("Mehmonlar bronlari, qo'lda bron qo'shish va bron sozlamalari.")}</p>
      </header>

      {tabs.length > 1 && (
        <div role="tablist" aria-label={t("Bron bo'limlari")} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
          {tabs.map(({ id, label, icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[id] = el;
                }}
                type="button"
                role="tab"
                id={`bookings-tab-${id}`}
                aria-selected={selected}
                aria-controls={`bookings-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(id)}
                onKeyDown={(event) => onTabKeyDown(event, id)}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  minHeight: TAP,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  border: 'none',
                  borderBottom: `3px solid ${selected ? 'var(--brand)' : 'transparent'}`,
                  background: 'transparent',
                  color: selected ? 'var(--brand)' : 'var(--text-muted)',
                  fontSize: '14px',
                  fontWeight: selected ? 700 : 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {icon}
                <span>{label}</span>
                {id === 'settings' && settings.dirty && (
                  <>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-amber)' }} />
                    <span style={srOnly}>{t("Saqlanmagan o'zgarish bor")}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div role="tabpanel" id="bookings-panel-list" aria-labelledby="bookings-tab-list" hidden={active !== 'list'}>
        {active === 'list' && (
          <ReservationsTab
            config={settings.saved}
            bookingDisabled={settings.saved ? !settings.saved.enabled : false}
            canOpenSettings={canSettings}
            onOpenSettings={() => select('settings')}
          />
        )}
      </div>
      {canSettings && (
        <div role="tabpanel" id="bookings-panel-settings" aria-labelledby="bookings-tab-settings" hidden={active !== 'settings'}>
          {active === 'settings' && <SettingsTab settings={settings} />}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
