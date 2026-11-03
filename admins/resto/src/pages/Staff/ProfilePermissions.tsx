/**
 * Profil, 3-bo'lim: rol va RUXSATLAR. Rol — tayyor to'plam; undan tashqari har bir ruxsat yoqiladi ("qo'shimcha") yoki o'chiriladi
 * ("olib tashlangan"). Mantiq `permissions.ts` da (sinalgan); bu yerda faqat ko'rinish va saqlash.
 *
 * Qoidalar (UI shularni aks ettiradi, haqiqiy tekshiruv serverda):
 *  - egasi: hamma ruxsat bor, tahrir yo'q; o'zining ruxsatlarini o'zgartirib bo'lmaydi; `editable_permissions=false` bo'lsa faqat o'qiladi;
 *  - pul/xodim ruxsatini faqat egasi o'zgartiradi; o'zida yo'q ruxsatni boshqaga berib bo'lmaydi.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Skeleton, t, useToast } from '@admins/shared';
import { RotateCcw } from 'lucide-react';
import type { StaffItem, StaffPatch } from './api';
import {
  assignableRoles,
  buildPermissionsPatch,
  computeEffective,
  defaultsForRole,
  groupItems,
  hasOverrides,
  isOn,
  knownKeySet,
  lockReason,
  onlyKnown,
  permissionState,
  readonlyReason,
  resetOverrides,
  sameKeySet,
  setPermission,
  summarizeAccess,
  tidyOverrides,
} from './permissions';
import type { GrantContext, Overrides, ReadonlyReason } from './permissions';
import { readProfileError } from './profileErrors';
import { profileErrorText } from './profileMessages';
import { AccessSummaryCard, PermissionRow, groupTitle } from './PermissionParts';
import { buttonTap, cardStyle, cardTitleStyle, errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, panelStyle, stickyBarStyle } from './profileStyles';
import { Notice } from './profileUi';
import type { CatalogState } from './usePermissionCatalog';
import { restoUz, roleLabel } from '../../i18n/uz';

export interface PermissionsActor {
  role: string;
  /** Egasi / super_admin: cheklov yo'q. */
  unlimited: boolean;
  /** Tahrirlovchi boshqalarga bera oladigan kalitlar (server hisoblagan); `null` — noma'lum. */
  grantable: ReadonlySet<string> | null;
  /** Tahrirlovchida "Xodimlar" ruxsati bor (faqat nega tahrir yo'qligini tushuntirish uchun). */
  hasStaffAccess: boolean;
}

interface Props {
  staff: StaffItem;
  catalogState: CatalogState;
  onReloadCatalog: () => void;
  actor: PermissionsActor;
  isSelf: boolean;
  /** Bu xodimni hozirgi foydalanuvchi umuman o'zgartira olmaydi (faqat egasi): rol tanlovi ham o'chiq. */
  readOnly: boolean;
  onSave: (patch: StaffPatch) => Promise<StaffItem>;
  onDirtyChange: (dirty: boolean) => void;
}

function roleOptionLabel(role: string): string {
  switch (role) {
    case 'waiter':
      return t('Ofitsiant (Buyurtmalar, stollar)');
    case 'kitchen':
      return restoUz.staffPage.kitchenRoleOption;
    case 'hostess':
      return t('Hostess (Qabulxona, bronlar)');
    case 'shop_manager':
      return t('Menejer (Boshqaruv, hisobotlar)');
    default:
      return roleLabel(role);
  }
}

function readonlyText(reason: ReadonlyReason): string {
  switch (reason) {
    case 'owner':
      return t("Egada hamma ruxsat bor. Uning ruxsatlarini cheklab bo'lmaydi.");
    case 'self':
      return t("O'z ruxsatlaringizni o'zgartirib bo'lmaydi.");
    case 'no_access':
      return t("Ruxsatlarni o'zgartirish uchun sizga «Xodimlar» ruxsati kerak.");
    default:
      return t("Bu xodimning ruxsatlarini siz o'zgartira olmaysiz.");
  }
}

export const ProfilePermissions: React.FC<Props> = ({ staff, catalogState, onReloadCatalog, actor, isSelf, readOnly, onSave, onDirtyChange }) => {
  const { showToast } = useToast();
  const perms = staff.permissions ?? null;
  const targetRole: string = staff.role;
  const ownerTarget = targetRole === 'shop_owner' || targetRole === 'super_admin';
  const canEditPermissions = staff.editable_permissions === true && !ownerTarget && perms !== null;
  const roleEditable = !ownerTarget && !isSelf && !readOnly;

  const savedKey = JSON.stringify([staff.role, perms?.role_defaults, perms?.extra, perms?.revoked]);
  const [role, setRole] = useState<string>(staff.role);
  // Qoralama: xom qo'shimcha/olib tashlanganlar. Rol o'zgarsa yangi standartga nisbatan tozalanib ko'rsatiladi (xom qiymat saqlanadi:
  // foydalanuvchi ruxsatga tegmasdan eski rolga qaytsa, hech narsa yo'qolmaydi).
  const [rawOverrides, setRawOverrides] = useState<Overrides>({ extra: perms?.extra ?? [], revoked: perms?.revoked ?? [] });
  const [base, setBase] = useState(savedKey);
  const [saving, setSaving] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [adjusted, setAdjusted] = useState(false);

  if (base !== savedKey) {
    setBase(savedKey);
    setRole(staff.role);
    setRawOverrides({ extra: perms?.extra ?? [], revoked: perms?.revoked ?? [] });
    setRoleError('');
  }

  const catalog = catalogState.status === 'ready' ? catalogState.catalog : null;
  const known = useMemo(() => (catalog ? knownKeySet(catalog) : new Set<string>()), [catalog]);

  const view = useMemo(() => {
    if (!catalog) return null;
    const savedDefaults = defaultsForRole(staff.role, staff.role, perms?.role_defaults, catalog);
    const savedOverrides = tidyOverrides({ extra: perms?.extra ?? [], revoked: perms?.revoked ?? [] }, savedDefaults, known);
    const draftDefaults = defaultsForRole(role, staff.role, perms?.role_defaults, catalog);
    const draftOverrides = tidyOverrides(rawOverrides, draftDefaults, known);
    return {
      savedDefaults,
      savedOverrides,
      draftDefaults,
      draftOverrides,
      effective: computeEffective(draftDefaults, draftOverrides),
      groups: groupItems(catalog.items),
    };
  }, [catalog, known, perms, rawOverrides, role, staff.role]);

  const patch = view
    ? buildPermissionsPatch(
        { role: staff.role, overrides: view.savedOverrides },
        { role: roleEditable ? role : staff.role, overrides: view.draftOverrides },
        canEditPermissions,
      )
    : roleEditable && role !== staff.role
      ? { role }
      : {};
  const dirty = Object.keys(patch).length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const grant: GrantContext = { actorUnlimited: actor.unlimited, grantable: actor.grantable };

  const toggle = (key: string, next: boolean) => {
    if (!view || !canEditPermissions) return;
    setRawOverrides(setPermission(key, next, view.draftDefaults, view.draftOverrides));
    setGeneralError('');
    setAdjusted(false);
  };

  const revert = () => {
    setRole(staff.role);
    setRawOverrides({ extra: perms?.extra ?? [], revoked: perms?.revoked ?? [] });
    setRoleError('');
    setGeneralError('');
  };

  const submit = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setRoleError('');
    setGeneralError('');
    try {
      const res = await onSave(patch);
      const sentEffective = view ? onlyKnown(view.effective, known) : [];
      const gotEffective = res.permissions ? onlyKnown(res.permissions.effective, known) : null;
      // Server yuborilganni tozalagan bo'lishi mumkin: javob haqiqat, farq bo'lsa aytamiz
      const differs = view !== null && gotEffective !== null && !sameKeySet(sentEffective, gotEffective);
      setAdjusted(differs);
      showToast(t('Rol va ruxsatlar saqlandi'), differs ? 'info' : 'success');
    } catch (err: unknown) {
      const problem = readProfileError(err);
      const text = profileErrorText(problem);
      if (problem.field === 'role') setRoleError(text);
      else setGeneralError(text);
    } finally {
      setSaving(false);
    }
  };

  const reason = readonlyReason({ targetRole: staff.role, isSelf, actorHasStaffAccess: actor.hasStaffAccess });
  const roles = assignableRoles(actor.role, staff.role);
  const roleChanged = role !== staff.role;
  const summary = view && catalog ? summarizeAccess(catalog.items, view.effective) : null;

  return (
    <div style={panelStyle}>
      {/* Rol */}
      <div style={cardStyle}>
        <div>
          <label htmlFor="staff-role" style={labelStyle}>
            {t('Rol')}
          </label>
          <select
            id="staff-role"
            value={role}
            disabled={!roleEditable || saving}
            onChange={(e) => {
              setRole(e.target.value);
              setRoleError('');
              setAdjusted(false);
            }}
            aria-invalid={roleError ? true : undefined}
            style={{ ...inputStyle, ...(roleError ? inputErrorStyle : null) }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleOptionLabel(r)}
              </option>
            ))}
          </select>
          {roleError && (
            <p role="alert" style={errorTextStyle}>
              {roleError}
            </p>
          )}
          {!roleEditable && (
            <p style={hintStyle}>
              {ownerTarget
                ? t("Egasining rolini o'zgartirib bo'lmaydi.")
                : isSelf
                  ? t("O'z rolingizni o'zgartira olmaysiz.")
                  : t("Rolni faqat restoran egasi o'zgartira oladi.")}
            </p>
          )}
        </div>
        {roleChanged && (
          <Notice tone="info">
            {t("Rol o'zgardi. Quyida yangi rolning standart ruxsatlari ko'rsatilgan; saqlagandan keyin kuchga kiradi.")}
          </Notice>
        )}
      </div>

      {/* Ruxsatlar */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h4 style={cardTitleStyle}>{t('Ruxsatlar')}</h4>
          {canEditPermissions && view && hasOverrides(view.draftOverrides) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRawOverrides(resetOverrides());
                setAdjusted(false);
              }}
              disabled={saving}
              style={buttonTap}
            >
              <RotateCcw size={16} />
              {t('Rol standartiga qaytarish')}
            </Button>
          )}
        </div>

        {ownerTarget ? (
          <Notice tone="info">{readonlyText('owner')}</Notice>
        ) : perms === null ? (
          <Notice tone="warn">{t("Ruxsatlar ma'lumoti serverdan kelmadi. Sahifani yangilab ko'ring.")}</Notice>
        ) : catalogState.status === 'loading' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton height="56px" />
            <Skeleton height="56px" />
            <Skeleton height="56px" />
          </div>
        ) : catalogState.status === 'error' || !view ? (
          <Notice tone="error">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
              <span>{t("Ruxsatlar ro'yxatini yuklab bo'lmadi.")}</span>
              <Button type="button" variant="secondary" size="sm" onClick={onReloadCatalog} style={buttonTap}>
                {t('Qayta urinish')}
              </Button>
            </div>
          </Notice>
        ) : (
          <>
            {!canEditPermissions && <Notice tone="info">{readonlyText(reason)}</Notice>}
            {canEditPermissions && (
              <p style={{ ...hintStyle, margin: 0 }}>
                {t('Yoqilgan: {on} / {total}', { on: onlyKnown(view.effective, known).length, total: known.size })}
                {hasOverrides(view.draftOverrides)
                  ? ` · ${t("Qo'shimcha berilgan: {n}", { n: view.draftOverrides.extra.length })} · ${t('Olib tashlangan: {n}', { n: view.draftOverrides.revoked.length })}`
                  : ''}
              </p>
            )}
            {view.groups.map(({ group, items }) => (
              <section key={group || '_other'} aria-label={groupTitle(group)}>
                <h5 style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {groupTitle(group)}
                </h5>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {items.map((item) => {
                    const state = permissionState(item.key, view.draftDefaults, view.draftOverrides);
                    const on = isOn(state);
                    const wasOn = isOn(permissionState(item.key, view.savedDefaults, view.savedOverrides));
                    return (
                      <PermissionRow
                        key={item.key}
                        item={item}
                        state={state}
                        on={on}
                        lock={canEditPermissions ? lockReason(item, grant, { currentlyOn: on, wasOn }) : null}
                        readOnly={!canEditPermissions}
                        onToggle={toggle}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>

      {/* Bu xodim nimani ko'radi */}
      {(ownerTarget || (perms !== null && view && summary)) && (
        <AccessSummaryCard
          summary={summary ?? { total: 0, groups: [] }}
          everything={ownerTarget}
          panelLabel={staff.panel_label}
          panelStale={roleChanged}
        />
      )}

      {adjusted && <Notice tone="warn">{t("Server ba'zi ruxsatlarni o'zgartirdi: ro'yxat serverdagi holatga yangilandi.")}</Notice>}
      {generalError && <Notice tone="error">{generalError}</Notice>}

      {/* Hech narsa o'zgartirib bo'lmaydigan holatda (egasi, o'zi) saqlash tugmasi ko'rsatilmaydi */}
      {(roleEditable || canEditPermissions) && (
        <div style={stickyBarStyle}>
          <Button type="button" variant="primary" onClick={submit} disabled={!dirty || saving} style={{ ...buttonTap, flex: '1 1 160px' }}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </Button>
          {dirty && !saving && (
            <Button type="button" variant="ghost" onClick={revert} style={buttonTap}>
              {t('Qaytarish')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
