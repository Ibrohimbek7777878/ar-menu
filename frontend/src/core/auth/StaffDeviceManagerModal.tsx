import React, { useState } from 'react';
import { roleService } from './RoleService';
import { useNavigation } from '../../context/NavigationContext';
import type { UserRole } from './types';

interface StaffDeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StaffRoleConfig {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
  defaultName: string;
}

const STAFF_ROLES: StaffRoleConfig[] = [
  {
    role: 'waiter',
    title: 'Ofitsiant Paneli',
    description: 'Jonli chaqiruvlar, stollar xizmati va chek buyurtmalari',
    icon: '🤵',
    defaultName: 'Ofitsiant',
  },
  {
    role: 'kitchen',
    title: 'Oshxona Ekrani (KDS)',
    description: 'Oshpazlar uchun buyurtmalar tayyorlanish navbati va vaqt nazorati',
    icon: '👨‍🍳',
    defaultName: 'Oshpaz',
  },
  {
    role: 'hostess',
    title: 'Kutib Olish (Hostess)',
    description: 'Mehmonlar tashrifi, stollarga joylashtirish va bronlar',
    icon: '💁‍♀️',
    defaultName: 'Hostess Zarina',
  },
  {
    role: 'admin',
    title: 'Moliya & Kassa (Admin)',
    description: 'To\'liq kassa, moliya daftari va restoran boshqaruvi',
    icon: '👑',
    defaultName: 'Admin',
  },
];

export const StaffDeviceManagerModal: React.FC<StaffDeviceManagerModalProps> = ({ isOpen, onClose }) => {
  const { grantStaffRole, navigate } = useNavigation();
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = (role: UserRole, defaultName: string) => {
    const grantUrl = roleService.generateGrantUrl(role, defaultName);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(grantUrl);
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2500);
    } else {
      prompt('Xodim uchun to\'g\'ridan-to\'g\'ri ruxsat havolasi:', grantUrl);
    }
  };

  const handleActivateThisDevice = (role: UserRole, defaultName: string) => {
    grantStaffRole(role, defaultName);
    onClose();
    const targetPath = role === 'waiter' ? '/waiter' : role === 'kitchen' ? '/kds' : role === 'hostess' ? '/hostess' : '/admin';
    navigate(targetPath);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          borderRadius: '24px',
          padding: '28px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              👥 Xodimlar Qurilmalariga Ruxsat Berish
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Parol va kodlarsiz: Admin xodimlarning telefon yoki planshetiga bir martalik to'g'ridan-to'g'ri ruxsat beradi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
          {STAFF_ROLES.map((cfg) => {
            const isCopied = copiedRole === cfg.role;
            return (
              <div
                key={cfg.role}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {cfg.title}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      {cfg.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(cfg.role, cfg.defaultName)}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isCopied ? '#059669' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span>{isCopied ? '✓ Havola nusxalandi!' : '📋 Xodim uchun havolani nusxalash'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActivateThisDevice(cfg.role, cfg.defaultName)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Ushbu brauzerni darhol shu rolda ochish"
                  >
                    ⚡ Shu qurilmada ochish
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', fontSize: '0.75rem', color: '#fbbf24' }}>
          💡 <b>Qo'llanma:</b> Havolani Telegram orqali ofitsiant yoki oshpazning qurilmasiga yuboring. Bir marta bosilgach, ushbu qurilma parolsiz doimiy ravishda o'z panelida ishlayveradi. Oddiy mehmonlar esa bu sahifalarni ko'ra olmaydi.
        </div>
      </div>
    </div>
  );
};
