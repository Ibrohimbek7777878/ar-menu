import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import type { UserRole } from './types';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PIN_ROLE_MAP: Record<string, { role: UserRole; name: string; redirect: string }> = {
  '1111': { role: 'waiter', name: 'Ofitsiant', redirect: '/waiter' },
  '2222': { role: 'kitchen', name: 'Oshxona (KDS)', redirect: '/kds' },
  '3333': { role: 'hostess', name: 'Zarina (Hostess)', redirect: '/hostess' },
  '7777': { role: 'admin', name: 'Administrator', redirect: '/admin' },
};

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginStaff, navigate } = useNavigation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleKeyClick = (val: string) => {
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = (enteredPin: string) => {
    const target = PIN_ROLE_MAP[enteredPin];
    if (target) {
      loginStaff(target.role, target.name);
      onClose();
      setPin('');
      navigate(target.redirect);
    } else {
      setError('PIN-kod noto\'g\'ri!');
      setPin('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
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
          background: '#1e293b',
          borderRadius: '24px',
          padding: '28px',
          width: '100%',
          maxWidth: '320px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔐</div>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800 }}>Xodimlar Kirishi</h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#94a3b8' }}>
          Ofitsiant, oshxona yoki admin PIN-kodini kiriting
        </p>

        {/* PIN indikatorlari */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: pin.length > idx ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                border: pin.length > idx ? '2px solid #60a5fa' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Raqamli klaviatura */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <button
              key={k}
              type="button"
              style={{
                background: k === 'C' || k === '⌫' ? '#334155' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '14px 0',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onClick={() => {
                if (k === 'C') {
                  setPin('');
                  setError('');
                } else if (k === '⌫') {
                  handleDelete();
                } else {
                  handleKeyClick(k);
                }
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '12px' }}>
          Ofitsiant: 1111 | Oshxona: 2222 | Admin: 7777
        </div>

        <button
          type="button"
          style={{
            marginTop: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          Bekor qilish
        </button>
      </div>
    </div>
  );
};
