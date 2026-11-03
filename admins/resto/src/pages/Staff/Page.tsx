import React, { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatCard,
  t,
  useSession,
  useToast,
  formatHumanDateTime,
} from '@admins/shared';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Edit2,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { StaffItem } from './api';
import { StaffAccess, TAP_TARGET } from './StaffAccess';
import { StaffCredentials, type CredentialsState } from './StaffCredentials';
import { overrideCounts } from './permissions';
import { StaffProfile } from './StaffProfile';
import { useStaff } from './useStaff';
import { restoUz, roleLabel } from '../../i18n/uz';

/**
 * Eski "Tahrirlash" oynasi (ism, telefon, rol) o'chirilmagan, faqat yashirilgan (AGENTS 4-qoida): uning hammasi endi profil oynasida
 * (ma'lumotlar, login va parol, rol va ruxsatlar). Yangi xodim yaratish shu oynada qoladi.
 */
const LEGACY_EDIT_FORM: boolean = false;

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  shop_owner: {
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'var(--accent-emerald-border)',
  },
  shop_manager: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  waiter: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
  kitchen: {
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'var(--accent-amber-border)',
  },
  hostess: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'var(--border-strong)',
  },
};

export const StaffPage: React.FC = () => {
  const {
    staff,
    allStaff,
    summary,
    loading,
    error,
    roleFilter,
    setRoleFilter,
    searchQuery,
    setSearchQuery,
    addStaff,
    editStaff,
    toggleBlock,
    resetPassword,
    setPassword,
    refresh,
  } = useStaff();

  const { showToast } = useToast();
  const { session } = useSession();
  const restaurantName = session?.tenant?.name?.trim() || '';

  // Create / Edit Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [form, setForm] = useState({
    username: '',
    role: 'waiter',
    password: '',
    full_name: '',
    phone: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bir martalik oyna: xodim qo'shildi / parol yangilandi (parol faqat shu yerda ko'rinadi) + tayyor xabar
  const [revealModal, setRevealModal] = useState<CredentialsState | null>(null);

  // Kirish oynasi: xodim qayerdan va qanday kiradi (havola, ulashish, yo'riqnoma)
  const [accessStaff, setAccessStaff] = useState<StaffItem | null>(null);

  // Xodim profili (ma'lumotlar, login va parol, rol va ruxsatlar): ro'yxatdagi xodim id'si. Ro'yxat filtri xodimni yashirsa ham profil ochiq qoladi.
  const [profileId, setProfileId] = useState<number | null>(null);
  const profileStaff = profileId === null ? null : (allStaff.find((s) => s.id === profileId) ?? null);

  // Reset Password Modal
  const [resetModalStaff, setResetModalStaff] = useState<StaffItem | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Open Create
  const handleOpenCreate = () => {
    setEditingStaff(null);
    setForm({
      username: '',
      role: 'waiter',
      password: '',
      full_name: '',
      phone: '',
    });
    setFormError(null);
    setStaffModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (user: StaffItem) => {
    if (!LEGACY_EDIT_FORM) {
      setProfileId(user.id);
      return;
    }
    setEditingStaff(user);
    setForm({
      username: user.username,
      role: user.role,
      password: '',
      full_name: user.full_name,
      phone: user.phone,
    });
    setFormError(null);
    setStaffModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingStaff) {
        await editStaff(editingStaff.id, {
          role: form.role,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        });
        showToast(t('"{name}" ma\'lumotlari yangilandi', { name: form.full_name || form.username }), 'success');
        setStaffModalOpen(false);
      } else {
        const res = await addStaff({
          username: form.username.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        });
        setStaffModalOpen(false);

        if (res.generated_password) {
          setRevealModal({
            mode: 'created',
            staff: res,
            username: res.username,
            password: res.generated_password,
          });
        } else {
          showToast(t('"{name}" xodimi yaratildi', { name: res.username }), 'success');
          setAccessStaff(res);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? t(err.message) : t('Xatolik yuz berdi');
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Block / Unblock
  const handleToggleBlock = async (user: StaffItem) => {
    const question = user.is_active
      ? t('Haqiqatan ham "{name}" xodimini bloklamoqchimisiz?', { name: user.username })
      : t('Haqiqatan ham "{name}" xodimini faollashtirmoqchimisiz?', { name: user.username });
    if (!window.confirm(question)) {
      return;
    }

    try {
      await toggleBlock(user.id, user.is_active);
      showToast(
        user.is_active
          ? t('"{name}" bloklandi (sessiyalari yakunlandi)', { name: user.username })
          : t('"{name}" faollashtirildi', { name: user.username }),
        user.is_active ? 'info' : 'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? t(err.message) : t("Amalni bajarib bo'lmadi");
      showToast(msg, 'error');
    }
  };

  // Handle Reset Password Submit
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStaff) return;

    setResetSubmitting(true);
    try {
      const res = await resetPassword(resetModalStaff.id, customPassword.trim() || undefined);
      setResetModalStaff(null);
      setCustomPassword('');

      if (res.generated_password) {
        setRevealModal({
          mode: 'password_reset',
          staff: resetModalStaff,
          username: res.username,
          password: res.generated_password,
        });
      } else {
        showToast(t('"{name}" paroli yangilandi', { name: resetModalStaff.username }), 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? t(err.message) : t("Parolni yangilab bo'lmadi");
      showToast(msg, 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Profildan "Parolni almashtirish": tahrirlash/kirish oynasi yopilib, parol oynasi ochiladi
  const handleChangePasswordFrom = (user: StaffItem) => {
    setStaffModalOpen(false);
    setAccessStaff(null);
    setResetModalStaff(user);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Sarlavha va harakatlar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            {t('Xodimlar Boshqaruvi')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('Restoran xodimlari, ofitsiantlar, oshpazlar, rollar va xavfsiz kirish parollari.')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title={t('Qayta yuklash')}>
            <RefreshCw size={18} />
          </Button>
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            {t('Yangi Xodim')}
          </Button>
        </div>
      </div>

      {/* 4 ta Xulosa Kartasi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title={t('Jami Xodimlar')}
          value={summary.total}
          icon={<Users size={22} color="var(--primary)" />}
        />
        <StatCard
          title={t('Ofitsiantlar')}
          value={summary.waiters}
          icon={<User size={22} color="var(--accent-indigo)" />}
        />
        <StatCard
          title={restoUz.staffPage.cooksCard}
          value={summary.kitchen}
          icon={<UtensilsCrossed size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title={t('Menejerlar')}
          value={summary.managers}
          icon={<Shield size={22} color="var(--accent-emerald)" />}
        />
      </div>

      {/* Rol Filtrlari va Qidiruv */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: t('Barchasi ({n})', { n: summary.total }) },
            { id: 'waiter', label: t('Ofitsiantlar ({n})', { n: summary.waiters }) },
            { id: 'kitchen', label: t('Oshpazlar ({n})', { n: summary.kitchen }) },
            { id: 'hostess', label: t('Hostess') },
            { id: 'shop_manager', label: t('Menejerlar ({n})', { n: summary.managers }) },
            { id: 'blocked', label: t('Bloklanganlar ({n})', { n: summary.blocked }) },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: roleFilter === r.id ? 'var(--text-main)' : 'var(--card-bg)',
                color: roleFilter === r.id ? 'var(--bg-surface)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder={t('Ism, login yoki telefon...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-main)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Xatolik */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: 'var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              {t('Qayta urinish')}
            </Button>
          </div>
        </Card>
      )}

      {/* Yuklanish */}
      {loading && staff.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="160px" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={t('Xodimlar topilmadi')}
          description={
            searchQuery || roleFilter !== 'all'
              ? t("Qidiruv yoki filtr mezonlari bo'yicha xodimlar topilmadi.")
              : t("Hozircha birorta xodim qo'shilmagan. Yangi xodim yarating.")
          }
          action={
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus size={18} style={{ marginRight: '6px' }} />
              {t("Birinchi xodimni qo'shish")}
            </Button>
          }
        />
      ) : (
        /* Xodimlar Gridi */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {staff.map((user: StaffItem) => {
            const roleCfg = ROLE_COLORS[user.role] || ROLE_COLORS.waiter;
            const initials = user.full_name
              ? user.full_name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : user.username.slice(0, 2).toUpperCase();

            return (
              <Card
                key={user.id}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${user.is_active ? 'var(--border-color)' : 'var(--accent-rose-border)'}`,
                  background: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: user.is_active ? 1 : 0.65,
                }}
              >
                <div>
                  {/* Yuqori qator: Avatar, Ism va Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: roleCfg.bg,
                        color: roleCfg.text,
                        border: `1px solid ${roleCfg.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user.full_name || user.username}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        @{user.username}
                      </div>
                    </div>

                    {/* Holat nishoni */}
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: user.is_active ? 'var(--accent-emerald-bg)' : 'var(--accent-rose-bg)',
                        color: user.is_active ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        border: `1px solid ${user.is_active ? 'var(--accent-emerald-border)' : 'var(--accent-rose-border)'}`,
                      }}
                    >
                      {user.is_active ? t('Faol') : t('Bloklangan')}
                    </div>
                  </div>

                  {/* Rol va Telefon */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: roleCfg.bg,
                          color: roleCfg.text,
                          border: `1px solid ${roleCfg.border}`,
                        }}
                      >
                        {roleLabel(user.role)}
                      </span>

                      {user.phone && (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          📞 {user.phone}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const counts = overrideCounts(user.permissions);
                      if (counts.extra === 0 && counts.revoked === 0) return null;
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {counts.extra > 0 && (
                            <span
                              style={{
                                padding: '2px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: 'var(--accent-emerald-bg)',
                                color: 'var(--accent-emerald)',
                                border: '1px solid var(--accent-emerald-border)',
                              }}
                            >
                              {t("+{n} qo'shimcha ruxsat", { n: counts.extra })}
                            </span>
                          )}
                          {counts.revoked > 0 && (
                            <span
                              style={{
                                padding: '2px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: 'var(--accent-rose-bg)',
                                color: 'var(--accent-rose)',
                                border: '1px solid var(--accent-rose-border)',
                              }}
                            >
                              {t('{n} cheklangan', { n: counts.revoked })}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {user.last_login && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {restoUz.staffPage.lastLogin}: {formatHumanDateTime(user.last_login)}
                      </div>
                    )}
                  </div>

                  {/* Kirish: qaysi sahifaga kiradi va havola */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', minWidth: 0 }}>
                      {restoUz.staffPage.access.panelLabel}:{' '}
                      <strong style={{ color: 'var(--text-main)' }}>{user.panel_label || '—'}</strong>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAccessStaff(user)}
                      style={TAP_TARGET}
                    >
                      <Link2 size={16} />
                      {restoUz.staffPage.access.openButton}
                    </Button>
                  </div>
                </div>

                {/* Harakatlar tugmalari */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '12px',
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(user)}
                    title={t('Tahrirlash')}
                    style={{ ...TAP_TARGET, flex: 1 }}
                  >
                    <Edit2 size={14} style={{ marginRight: '4px' }} />
                    {t('Profil va ruxsatlar')}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetModalStaff(user)}
                    title={t('Parolni yangilash')}
                    style={TAP_TARGET}
                  >
                    <KeyRound size={15} />
                  </Button>

                  {user.role !== 'shop_owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleBlock(user)}
                      title={user.is_active ? t('Xodimni bloklash') : t('Blokdan chiqarish')}
                      style={{ ...TAP_TARGET, color: user.is_active ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
                    >
                      {user.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Xodim Qo'shish / Tahrirlash Modali */}
      {staffModalOpen && (
        <Modal
          isOpen={true}
          title={
            editingStaff
              ? t('Xodimni Tahrirlash (@{username})', { username: editingStaff.username })
              : t("Yangi Xodim Qo'shish")
          }
          onClose={() => setStaffModalOpen(false)}
        >
          <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid var(--accent-rose-border)',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                }}
              >
                {formError}
              </div>
            )}

            {!editingStaff && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('Login (Username) *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('Masalan: ali_waiter, zarina_hostess')}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t("To'liq Ism")}
              </label>
              <input
                type="text"
                placeholder={t('Masalan: Ali Valiyev')}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Telefon Raqami')}
              </label>
              <input
                type="text"
                placeholder="+998901234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Rol *')}
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={editingStaff?.role === 'shop_owner'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="waiter">{t('Ofitsiant (Buyurtmalar, stollar)')}</option>
                <option value="kitchen">{restoUz.staffPage.kitchenRoleOption}</option>
                <option value="hostess">{t('Hostess (Qabulxona, bronlar)')}</option>
                <option value="shop_manager">{t('Menejer (Boshqaruv, hisobotlar)')}</option>
                {/* Egasi rolini o'zgartirib bo'lmaydi: tanlov egasini to'g'ri ko'rsatadi (avval "Ofitsiant" ko'rinardi) */}
                {editingStaff?.role === 'shop_owner' && <option value="shop_owner">{roleLabel('shop_owner')}</option>}
              </select>
            </div>

            {editingStaff && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {restoUz.staffPage.access.sectionTitle}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {restoUz.staffPage.access.panelLabel}:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>{editingStaff.panel_label || '—'}</strong>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <Button
                    variant="secondary"
                    type="button"
                    style={TAP_TARGET}
                    onClick={() => {
                      setStaffModalOpen(false);
                      setAccessStaff(editingStaff);
                    }}
                  >
                    <Link2 size={18} />
                    {restoUz.staffPage.access.openButton}
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    style={TAP_TARGET}
                    onClick={() => handleChangePasswordFrom(editingStaff)}
                  >
                    <KeyRound size={18} />
                    {restoUz.staffPage.access.changePassword}
                  </Button>
                </div>
              </div>
            )}

            {!editingStaff && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('Parol (ixtiyoriy)')}
                </label>
                <input
                  type="password"
                  placeholder={t("Bo'sh qoldirilsa xavfsiz parol avtomatik yaratiladi")}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="ghost" type="button" onClick={() => setStaffModalOpen(false)}>
                {t('Bekor qilish')}
              </Button>
              <Button variant="primary" type="submit" disabled={formSubmitting}>
                {formSubmitting ? t('Saqlanmoqda...') : editingStaff ? t("O'zgarishlarni saqlash") : t('Xodimni yaratish')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Xodim profili: ma'lumotlar, login va parol, rol va ruxsatlar. Bir martalik parol / parolni almashtirish oynasi ochilganda yashiriladi. */}
      {profileStaff && (
        <StaffProfile
          staff={profileStaff}
          allStaff={allStaff}
          restaurantName={restaurantName}
          hidden={Boolean(revealModal || resetModalStaff || accessStaff)}
          onClose={() => setProfileId(null)}
          onSave={editStaff}
          onSetPassword={setPassword}
          onPasswordSet={(user, password) =>
            setRevealModal({ mode: 'password_reset', staff: user, username: user.username, password })
          }
          onServerReset={(user) => setResetModalStaff(user)}
        />
      )}

      {/* Xodim qo'shildi / parol yangilandi: bir martalik parol, kirish havolasi va tayyor xabar */}
      {revealModal && (
        <StaffCredentials
          state={revealModal}
          restaurantName={restaurantName}
          onClose={() => setRevealModal(null)}
        />
      )}

      {/* Kirish oynasi: xodim qayerdan va qanday kiradi */}
      {accessStaff && (
        <Modal
          isOpen={true}
          title={`${restoUz.staffPage.access.modalTitle}: ${accessStaff.full_name || accessStaff.username}`}
          onClose={() => setAccessStaff(null)}
          maxWidth="560px"
        >
          <div style={{ maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' }}>
            <StaffAccess
              staff={accessStaff}
              restaurantName={restaurantName}
              onChangePassword={() => handleChangePasswordFrom(accessStaff)}
            />
          </div>
        </Modal>
      )}

      {/* Parolni Yangilash Modali */}
      {resetModalStaff && (
        <Modal
          isOpen={true}
          title={t('Parolni Yangilash (@{username})', { username: resetModalStaff.username })}
          onClose={() => setResetModalStaff(null)}
        >
          <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              {t("Xodim uchun yangi parol o'rnating yoki bo'sh qoldirsangiz avtomatik xavfsiz parol yaratiladi. Xodimning joriy barcha ochiq sessiyalari tugatiladi.")}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                {t('Yangi Parol (ixtiyoriy)')}
              </label>
              <input
                type="password"
                placeholder={t("Avtomatik generatsiya qilish uchun bo'sh qoldiring")}
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="ghost" type="button" onClick={() => setResetModalStaff(null)}>
                {t('Bekor qilish')}
              </Button>
              <Button variant="primary" type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? t('Yangilanmoqda...') : t('Parolni Yangilash')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default StaffPage;
