import React, { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  StatCard,
  useToast,
  formatHumanDateTime,
} from '@admins/shared';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { StaffItem } from './api';
import { useStaff } from './useStaff';
import { restoUz, roleLabel } from '../../i18n/uz';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  shop_owner: {
    bg: 'var(--accent-emerald-bg)',
    text: 'var(--accent-emerald)',
    border: 'rgb(22 163 74 / 0.3)',
  },
  shop_manager: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'rgb(24 21 19 / 0.3)',
  },
  waiter: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'rgb(24 21 19 / 0.3)',
  },
  kitchen: {
    bg: 'var(--accent-amber-bg)',
    text: 'var(--accent-amber)',
    border: 'rgb(194 65 12 / 0.35)',
  },
  hostess: {
    bg: 'var(--accent-indigo-bg)',
    text: 'var(--accent-indigo)',
    border: 'rgb(24 21 19 / 0.3)',
  },
};

export const StaffPage: React.FC = () => {
  const {
    staff,
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
    refresh,
  } = useStaff();

  const { showToast } = useToast();

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

  // Password Reveal Modal (One-time password view)
  const [revealModal, setRevealModal] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

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
        showToast(`"${form.full_name || form.username}" ma'lumotlari yangilandi`, 'success');
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
            username: res.username,
            password: res.generated_password,
          });
        } else {
          showToast(`"${res.username}" xodimi yaratildi`, 'success');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Block / Unblock
  const handleToggleBlock = async (user: StaffItem) => {
    const actionName = user.is_active ? 'bloklamoqchimisiz' : 'faollashtirmoqchimisiz';
    if (!window.confirm(`Haqiqatan ham "${user.username}" xodimini ${actionName}?`)) {
      return;
    }

    try {
      await toggleBlock(user.id, user.is_active);
      showToast(
        user.is_active
          ? `"${user.username}" bloklandi (sessiyalari yakunlandi)`
          : `"${user.username}" faollashtirildi`,
        user.is_active ? 'info' : 'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Amalni bajarib bo'lmadi";
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
          username: res.username,
          password: res.generated_password,
        });
      } else {
        showToast(`"${resetModalStaff.username}" paroli yangilandi`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Parolni yangilab bo'lmadi";
      showToast(msg, 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!revealModal) return;
    navigator.clipboard.writeText(revealModal.password);
    setCopiedPass(true);
    showToast("Parol nusxalandi", 'success');
    setTimeout(() => setCopiedPass(false), 2000);
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
            Xodimlar Boshqaruvi
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Restoran xodimlari, ofitsiantlar, oshpazlar, rollar va xavfsiz kirish parollari.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={refresh} title="Qayta yuklash">
            <RefreshCw size={18} />
          </Button>
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            Yangi Xodim
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
          title="Jami Xodimlar"
          value={summary.total}
          icon={<Users size={22} color="var(--primary)" />}
        />
        <StatCard
          title="Ofitsiantlar"
          value={summary.waiters}
          icon={<User size={22} color="var(--accent-indigo)" />}
        />
        <StatCard
          title={restoUz.staffPage.cooksCard}
          value={summary.kitchen}
          icon={<UtensilsCrossed size={22} color="var(--accent-amber)" />}
        />
        <StatCard
          title="Menejerlar"
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
            { id: 'all', label: `Barchasi (${summary.total})` },
            { id: 'waiter', label: `Ofitsiantlar (${summary.waiters})` },
            { id: 'kitchen', label: `Oshpazlar (${summary.kitchen})` },
            { id: 'hostess', label: 'Hostess' },
            { id: 'shop_manager', label: `Menejerlar (${summary.managers})` },
            { id: 'blocked', label: `Bloklanganlar (${summary.blocked})` },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: roleFilter === r.id ? 'var(--text-main)' : 'var(--card-bg)',
                color: roleFilter === r.id ? '#ffffff' : 'var(--text-muted)',
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
            placeholder="Ism, login yoki telefon..."
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
        <Card style={{ marginBottom: '24px', borderColor: 'rgb(220 38 38 / 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <Button variant="secondary" onClick={refresh} style={{ marginLeft: 'auto' }}>
              Qayta urinish
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
          title="Xodimlar topilmadi"
          description={
            searchQuery || roleFilter !== 'all'
              ? "Qidiruv yoki filtr mezonlari bo'yicha xodimlar topilmadi."
              : "Hozircha birorta xodim qo'shilmagan. Yangi xodim yarating."
          }
          action={
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus size={18} style={{ marginRight: '6px' }} />
              Birinchi xodimni qo'shish
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
                  border: `1px solid ${user.is_active ? 'var(--border-color)' : 'rgb(220 38 38 / 0.3)'}`,
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
                        border: `1px solid ${user.is_active ? 'rgb(22 163 74 / 0.3)' : 'rgb(220 38 38 / 0.3)'}`,
                      }}
                    >
                      {user.is_active ? 'Faol' : 'Bloklangan'}
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

                    {user.last_login && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {restoUz.staffPage.lastLogin}: {formatHumanDateTime(user.last_login)}
                      </div>
                    )}
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
                    title="Tahrirlash"
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={14} style={{ marginRight: '4px' }} />
                    Tahrirlash
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetModalStaff(user)}
                    title="Parolni yangilash"
                  >
                    <KeyRound size={15} />
                  </Button>

                  {user.role !== 'shop_owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleBlock(user)}
                      title={user.is_active ? 'Xodimni bloklash' : 'Blokdan chiqarish'}
                      style={{ color: user.is_active ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
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
          title={editingStaff ? `Xodimni Tahrirlash (@${editingStaff.username})` : "Yangi Xodim Qo'shish"}
          onClose={() => setStaffModalOpen(false)}
        >
          <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid rgb(220 38 38 / 0.3)',
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
                  Login (Username) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: ali_waiter, zarina_hostess"
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
                To'liq Ism
              </label>
              <input
                type="text"
                placeholder="Masalan: Ali Valiyev"
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
                Telefon Raqami
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
                Rol *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
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
                <option value="waiter">Ofitsiant (Buyurtmalar, stollar)</option>
                <option value="kitchen">{restoUz.staffPage.kitchenRoleOption}</option>
                <option value="hostess">Hostess (Qabulxona, bronlar)</option>
                <option value="shop_manager">Menejer (Boshqaruv, hisobotlar)</option>
              </select>
            </div>

            {!editingStaff && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Parol (ixtiyoriy)
                </label>
                <input
                  type="password"
                  placeholder="Bo'sh qoldirilsa xavfsiz parol avtomatik yaratiladi"
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
                Bekor qilish
              </Button>
              <Button variant="primary" type="submit" disabled={formSubmitting}>
                {formSubmitting ? "Saqlanmoqda..." : editingStaff ? "O'zgarishlarni saqlash" : "Xodimni yaratish"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bir martalik Parol Ko'rsatish Modali (Reveal Modal) */}
      {revealModal && (
        <Modal
          isOpen={true}
          title="Xodim uchun Kirish Ma'lumotlari"
          onClose={() => setRevealModal(null)}
        >
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--accent-emerald-bg)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <ShieldCheck size={32} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-main)' }}>
              Akkaunt Muvaffaqiyatli Tayyorlandi!
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Ushbu parol faqat <strong>BIR MARTA</strong> ko'rsatiladi. Uni darhol xodimga yetkazing yoki saqlab oling.
            </p>

            <div
              style={{
                background: 'rgb(24 21 19 / 0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Login:</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {revealModal.username}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Parol:</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <code
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      fontFamily: 'monospace',
                      letterSpacing: '1px',
                    }}
                  >
                    {revealModal.password}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopyPassword} title="Nusxalash">
                    {copiedPass ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setRevealModal(null)} style={{ width: '100%' }}>
              Tushundim, Saqlab Oldim
            </Button>
          </div>
        </Modal>
      )}

      {/* Parolni Yangilash Modali */}
      {resetModalStaff && (
        <Modal
          isOpen={true}
          title={`Parolni Yangilash (@${resetModalStaff.username})`}
          onClose={() => setResetModalStaff(null)}
        >
          <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Xodim uchun yangi parol o'rnating yoki bo'sh qoldirsangiz avtomatik xavfsiz parol yaratiladi. Xodimning joriy barcha ochiq sessiyalari tugatiladi.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Yangi Parol (ixtiyoriy)
              </label>
              <input
                type="password"
                placeholder="Avtomatik generatsiya qilish uchun bo'sh qoldiring"
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
                Bekor qilish
              </Button>
              <Button variant="primary" type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? "Yangilanmoqda..." : "Parolni Yangilash"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default StaffPage;
