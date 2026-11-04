import React, { useMemo, useState } from 'react';
import { Button, EmptyState, Skeleton, t, useToast } from '@admins/shared';
import { Plus, Search, Users } from 'lucide-react';
import { resetOwnerPassword, updateTenant } from './api';
import type { CreatedTenant } from './api';
import { CreateTenantModal } from './CreateTenantModal';
import { EditTenantModal } from './EditTenantModal';
import { statusLabel } from './labels';
import { TenantCard } from './TenantCard';
import { TenantCredentials } from './TenantCredentials';
import type { CredentialsState } from './TenantCredentials';
import { loginUrlOf, filterTenants, isSuspended, statusCounts, toggledStatus, STATUS_FILTERS } from './tenants';
import type { StatusFilter, Tenant } from './tenants';
import { platformDomainOf } from './subdomain';
import { inputStyle, hintStyle, pageStyle, TAP, tapButton, toggleChipStyle } from './styles';
import { useTenants } from './useTenants';
import { ConfirmDialog, Notice } from '../Bookings/ui';
import { readFailure } from '../Bookings/errors';

/** Platforma domeni ("menu.uz"): hozirgi host, bosh "www."/"app." va port olib tashlanadi */
function currentDomain(): string {
  return typeof window === 'undefined' ? '' : platformDomainOf(window.location.host);
}

/**
 * Mijozlar bo'limi (`/ra/clients`, faqat platforma administratori, platforma hostida): restoran/kafe/to'yxona mijozlari ro'yxati,
 * qidiruv va holat filtri, [+ Yangi mijoz], to'xtatish/faollashtirish, ega parolini tiklash, tahrirlash.
 */
export const ClientsPage: React.FC = () => {
  const { tenants, loading, failure, reload, refresh } = useTenants();
  const { showToast } = useToast();
  const domain = useMemo(currentDomain, []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [toggling, setToggling] = useState<Tenant | null>(null);
  const [resetting, setResetting] = useState<Tenant | null>(null);
  const [credentials, setCredentials] = useState<CredentialsState | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => statusCounts(tenants), [tenants]);
  const visible = useMemo(() => filterTenants(tenants, query, status), [tenants, query, status]);

  const failMessage = (err: unknown, fallback: string): string => {
    const failure = readFailure(err);
    return failure.forbidden ? t("Bu amalga ruxsatingiz yo'q") : failure.message ? t(failure.message) : fallback;
  };

  const onCreated = (created: CreatedTenant, password: string, name: string) => {
    setCreateOpen(false);
    setCredentials({ mode: 'created', name, loginUrl: created.login_url || loginUrlOf(created.url), username: created.owner_username, password });
    void refresh();
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    const next = toggledStatus(toggling);
    setBusy(true);
    try {
      await updateTenant(toggling.id, { status: next });
      showToast(next === 'active' ? t('Mijoz faollashtirildi') : t("Mijoz to'xtatildi"), 'success');
      setToggling(null);
      void refresh();
    } catch (err: unknown) {
      showToast(failMessage(err, t("Bajarib bo'lmadi. Qayta urinib ko'ring.")), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    if (!resetting) return;
    setBusy(true);
    try {
      const password = await resetOwnerPassword(resetting.id);
      if (!password) throw new Error('');
      setCredentials({ mode: 'password_reset', name: resetting.name || resetting.subdomain, loginUrl: loginUrlOf(resetting.url), username: resetting.owner_username, password });
      setResetting(null);
    } catch (err: unknown) {
      showToast(failMessage(err, t("Parolni tiklab bo'lmadi. Qayta urinib ko'ring.")), 'error');
    } finally {
      setBusy(false);
    }
  };

  const filtersActive = query.trim() !== '' || status !== 'all';

  return (
    <div style={pageStyle}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 26, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('Mijozlar')}</h1>
          <p style={{ ...hintStyle, margin: 0, fontSize: 14 }}>{t("Restoran, kafe va to'yxonalar: har biri o'z manzilida ishlaydi. Yangi mijoz qo'shing, to'xtating yoki ega parolini tiklang.")}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} style={tapButton}>
          <Plus size={18} aria-hidden="true" />
          {t('Yangi mijoz')}
        </Button>
      </header>

      {tenants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: 12, top: TAP / 2 - 9, color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('Mijozlarni qidirish')}
              placeholder={t('Nomi, subdomen yoki ega logini')}
              autoComplete="off"
              style={{ ...inputStyle, paddingLeft: 38 }}
            />
          </div>
          <div role="group" aria-label={t('Holat bo\'yicha')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_FILTERS.map((filter) => (
              <button key={filter} type="button" aria-pressed={status === filter} onClick={() => setStatus(filter)} style={toggleChipStyle(status === filter)}>
                {filter === 'all' ? t('Barchasi') : statusLabel(filter)} · {counts[filter]}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && tenants.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }} aria-busy="true">
          <Skeleton height="190px" borderRadius="var(--radius-lg)" />
          <Skeleton height="190px" borderRadius="var(--radius-lg)" />
        </div>
      ) : failure && tenants.length === 0 ? (
        <Notice tone="error">
          <span>{failure.forbidden ? t("Mijozlar ro'yxatini ko'rishga ruxsatingiz yo'q.") : failure.message ? t(failure.message) : t("Mijozlar ro'yxatini yuklab bo'lmadi.")}</span>{' '}
          {!failure.forbidden && (
            <button
              type="button"
              onClick={() => void reload()}
              style={{ minHeight: 44, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {t('Qayta urinish')}
            </button>
          )}
        </Notice>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={t("Hozircha mijoz yo'q")}
          description={t("Birinchi mijozni qo'shing: nom, subdomen va ega loginini kiritasiz, qolganini tizim o'zi tayyorlaydi.")}
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)} style={tapButton}>
              <Plus size={18} aria-hidden="true" />
              {t('Yangi mijoz')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search size={32} />}
          title={t('Hech narsa topilmadi')}
          description={t("Qidiruv yoki holat filtrini o'zgartirib ko'ring.")}
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
                style={tapButton}
              >
                {t('Filtrlarni tozalash')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {visible.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} domain={domain} onEdit={setEditing} onToggle={setToggling} onResetPassword={setResetting} />
          ))}
        </div>
      )}

      {createOpen && <CreateTenantModal domain={domain} onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
      {editing && (
        <EditTenantModal
          tenant={editing}
          domain={domain}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast(t('Mijoz saqlandi'), 'success');
            void refresh();
          }}
        />
      )}
      {credentials && <TenantCredentials state={credentials} onClose={() => setCredentials(null)} />}

      <ConfirmDialog
        open={toggling !== null}
        title={toggling && isSuspended(toggling) ? t('Mijozni faollashtiramizmi?') : t("Mijozni to'xtatamizmi?")}
        message={
          toggling
            ? isSuspended(toggling)
              ? t("«{name}» yana ishga tushadi: xodimlar kira oladi, mehmonlar saytni ko'radi.", { name: toggling.name || toggling.subdomain })
              : t("«{name}» to'xtatiladi: xodimlar kira olmaydi, mehmonlar «Faol emas» sahifasini ko'radi. Ma'lumotlar saqlanadi, istalgan payt qayta faollashtirishingiz mumkin.", { name: toggling.name || toggling.subdomain })
            : ''
        }
        confirmLabel={toggling && isSuspended(toggling) ? t('Ha, faollashtirish') : t("Ha, to'xtatish")}
        danger={Boolean(toggling && !isSuspended(toggling))}
        busy={busy}
        onConfirm={() => void confirmToggle()}
        onCancel={() => setToggling(null)}
      />
      <ConfirmDialog
        open={resetting !== null}
        title={t('Ega parolini tiklaymizmi?')}
        message={resetting ? t("«{name}» egasi uchun yangi parol yaratiladi va bir marta ko'rsatiladi. Eski parol ishlamay qoladi.", { name: resetting.name || resetting.subdomain }) : ''}
        confirmLabel={t('Ha, tiklash')}
        danger
        busy={busy}
        onConfirm={() => void confirmReset()}
        onCancel={() => setResetting(null)}
      />
    </div>
  );
};

export default ClientsPage;
