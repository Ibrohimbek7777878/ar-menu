/**
 * Xodim profili: bitta oyna, uch bo'lim (tab): ma'lumotlar / login va parol / rol va ruxsatlar.
 *
 * Har bo'lim o'z "Saqlash" tugmasiga ega va faqat o'z maydonlarini yuboradi; boshqa bo'limdagi tugallanmagan kiritish saqlanib turadi
 * (hamma panel doim chizilgan, faqat ko'rinmaydi) va tab ustida nuqta bilan belgilanadi. Oynani yopishdan oldin saqlanmagan o'zgarish
 * bo'lsa so'raladi. Parol oynasi (bir martalik parol) ochilganda profil yashiriladi (`hidden`), lekin yopilmaydi: qaytgach hammasi joyida.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, t, useSession } from '@admins/shared';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import type { StaffItem, StaffPatch } from './api';
import { profileLock } from './permissions';
import { ProfileLogin } from './ProfileLogin';
import { ProfilePermissions } from './ProfilePermissions';
import type { PermissionsActor } from './ProfilePermissions';
import { ProfilePersonal } from './ProfilePersonal';
import { TAP } from './profileStyles';
import { Chip, Notice } from './profileUi';
import { usePermissionCatalog } from './usePermissionCatalog';
import { roleLabel } from '../../i18n/uz';

type TabId = 'personal' | 'login' | 'access';
const TAB_ORDER: TabId[] = ['personal', 'login', 'access'];

interface Props {
  /** Ro'yxatdagi hozirgi holat (server har saqlashdan keyin yangilaydi). */
  staff: StaffItem;
  /** Butun ro'yxat: tahrirlovchining o'z ruxsatlarini topish uchun. */
  allStaff: StaffItem[];
  restaurantName: string;
  /** Boshqa oyna (bir martalik parol va h.k.) ustiga chiqqanda profil yashiriladi, holati saqlanadi. */
  hidden?: boolean;
  onClose: () => void;
  onSave: (id: number, patch: StaffPatch) => Promise<StaffItem>;
  onSetPassword: (id: number, password: string, currentPassword?: string) => Promise<void>;
  /** Boshqa xodim uchun parol o'rnatildi: bir martalik parol oynasini ochish (o'z parolingiz uchun chaqirilmaydi). */
  onPasswordSet: (staff: StaffItem, password: string) => void;
  /** Mavjud "Parolni almashtirish" (server tasodifiy parol yaratadi). */
  onServerReset: (staff: StaffItem) => void;
}

const noop = () => undefined;

export const StaffProfile: React.FC<Props> = ({
  staff,
  allStaff,
  restaurantName,
  hidden = false,
  onClose,
  onSave,
  onSetPassword,
  onPasswordSet,
  onServerReset,
}) => {
  const { session, hasCapability } = useSession();
  const { state: catalogState, reload: reloadCatalog } = usePermissionCatalog();

  // Eng so'nggi server holati: ro'yxat yangilansa shu, saqlash javobi kelsa o'sha
  const [current, setCurrent] = useState(staff);
  const [seen, setSeen] = useState(staff);
  if (seen !== staff) {
    setSeen(staff);
    setCurrent(staff);
  }

  const [tab, setTab] = useState<TabId>('personal');
  const [dirty, setDirty] = useState<Record<TabId, boolean>>({ personal: false, login: false, access: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ personal: null, login: null, access: null });

  const setDirtyFor = useCallback(
    (id: TabId) => (value: boolean) => setDirty((prev) => (prev[id] === value ? prev : { ...prev, [id]: value })),
    [],
  );
  const onPersonalDirty = useMemo(() => setDirtyFor('personal'), [setDirtyFor]);
  const onLoginDirty = useMemo(() => setDirtyFor('login'), [setDirtyFor]);
  const onAccessDirty = useMemo(() => setDirtyFor('access'), [setDirtyFor]);

  const myId = session?.user.id ?? null;
  const myRole = session?.user.role ?? '';
  // Server aytadi (`is_self`); eski javobda sessiya bilan solishtiriladi
  const isSelf = current.is_self ?? (myId !== null && myId === current.id);
  const catalog = catalogState.status === 'ready' ? catalogState.catalog : null;
  const actor: PermissionsActor = useMemo(() => {
    const roleBased = myRole === 'shop_owner' || myRole === 'super_admin';
    const unlimited = catalog?.isOwner ?? roleBased;
    let grantable: ReadonlySet<string> | null = null;
    if (catalog?.grantable) {
      grantable = new Set(catalog.grantable);
    } else if (catalog) {
      // Server `grantable` bermagan bo'lsa: o'zida bor, maxfiy bo'lmagan ruxsatlar (o'z qatoridan)
      const myRow = allStaff.find((s) => s.id === myId);
      if (myRow?.permissions) {
        const sensitive = new Set(catalog.items.filter((item) => item.sensitive).map((item) => item.key));
        grantable = new Set(myRow.permissions.effective.filter((key) => !sensitive.has(key)));
      }
    }
    return { role: myRole, unlimited, grantable, hasStaffAccess: hasCapability('staff_admin') };
    // hasCapability sessiyadan hisoblanadi: sessiya o'zgarsa qayta hisoblanadi
  }, [allStaff, catalog, myId, myRole, hasCapability]);
  const locked = profileLock({ actorUnlimited: actor.unlimited, isSelf, targetRole: current.role }) !== null;

  const save = useCallback(
    async (patch: StaffPatch) => {
      const res = await onSave(current.id, patch);
      setCurrent(res);
      return res;
    },
    [onSave, current.id],
  );

  const saveUsername = useCallback((username: string) => save({ username }), [save]);

  const setPassword = useCallback(
    async (password: string, currentPassword?: string) => {
      await onSetPassword(current.id, password, currentPassword);
      if (!isSelf) onPasswordSet(current, password);
    },
    [onSetPassword, onPasswordSet, current, isSelf],
  );

  const anyDirty = dirty.personal || dirty.login || dirty.access;
  const requestClose = () => {
    if (anyDirty && !window.confirm(t("Kiritilgan ma'lumotlar saqlanmaydi. Oynani yopamizmi?"))) return;
    onClose();
  };

  const selectTab = (id: TabId) => {
    setTab(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onTabKeyDown = (e: React.KeyboardEvent, id: TabId) => {
    const index = TAB_ORDER.indexOf(id);
    let next: TabId | null = null;
    if (e.key === 'ArrowRight') next = TAB_ORDER[(index + 1) % TAB_ORDER.length];
    else if (e.key === 'ArrowLeft') next = TAB_ORDER[(index + TAB_ORDER.length - 1) % TAB_ORDER.length];
    else if (e.key === 'Home') next = TAB_ORDER[0];
    else if (e.key === 'End') next = TAB_ORDER[TAB_ORDER.length - 1];
    if (next) {
      e.preventDefault();
      selectTab(next);
      tabRefs.current[next]?.focus();
    }
  };

  const displayName = current.full_name || current.username;
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'personal', label: t("Ma'lumotlar"), icon: <UserRound size={16} aria-hidden="true" /> },
    { id: 'login', label: t('Login va parol'), icon: <KeyRound size={16} aria-hidden="true" /> },
    { id: 'access', label: t('Rol va ruxsatlar'), icon: <ShieldCheck size={16} aria-hidden="true" /> },
  ];

  return (
    <div style={{ display: hidden ? 'none' : 'contents' }}>
      <Modal isOpen onClose={hidden ? noop : requestClose} title={t('Profil: {name}', { name: displayName })} maxWidth="640px">
        <div ref={scrollRef} style={{ maxHeight: 'calc(100dvh - 150px)', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px', marginBottom: '12px' }}>
            <strong style={{ fontSize: '16px', color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{displayName}</strong>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{current.username}</span>
            <Chip tone="brand">{roleLabel(current.role)}</Chip>
          </div>

          {locked && (
            <div style={{ marginBottom: '12px' }}>
              <Notice tone="info">{t("Bu xodimning ma'lumotlarini faqat restoran egasi o'zgartira oladi.")}</Notice>
            </div>
          )}

          <div
            role="tablist"
            aria-label={t('Profil bo\'limlari')}
            style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}
          >
            {tabs.map(({ id, label, icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`staff-tab-${id}`}
                  aria-selected={active}
                  aria-controls={`staff-panel-${id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectTab(id)}
                  onKeyDown={(e) => onTabKeyDown(e, id)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    minHeight: TAP,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    padding: '6px 4px',
                    border: 'none',
                    borderBottom: `3px solid ${active ? 'var(--brand)' : 'transparent'}`,
                    background: 'transparent',
                    color: active ? 'var(--brand)' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: active ? 700 : 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {icon}
                  <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
                  {dirty[id] && (
                    <>
                      <span
                        aria-hidden="true"
                        title={t("Saqlanmagan o'zgarish bor")}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '8px',
                          width: '8px',
                          height: '8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--accent-amber)',
                        }}
                      />
                      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                        {t("Saqlanmagan o'zgarish bor")}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id="staff-panel-personal" aria-labelledby="staff-tab-personal" style={{ display: tab === 'personal' ? 'block' : 'none' }}>
            <ProfilePersonal staff={current} readOnly={locked} onSave={save} onDirtyChange={onPersonalDirty} />
          </div>
          <div role="tabpanel" id="staff-panel-login" aria-labelledby="staff-tab-login" style={{ display: tab === 'login' ? 'block' : 'none' }}>
            <ProfileLogin
              staff={current}
              restaurantName={restaurantName}
              isSelf={isSelf}
              readOnly={locked}
              onSaveUsername={saveUsername}
              onSetPassword={setPassword}
              onServerReset={() => onServerReset(current)}
              onDirtyChange={onLoginDirty}
            />
          </div>
          <div role="tabpanel" id="staff-panel-access" aria-labelledby="staff-tab-access" style={{ display: tab === 'access' ? 'block' : 'none' }}>
            <ProfilePermissions
              staff={current}
              catalogState={catalogState}
              onReloadCatalog={reloadCatalog}
              actor={actor}
              isSelf={isSelf}
              readOnly={locked}
              onSave={save}
              onDirtyChange={onAccessDirty}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffProfile;
