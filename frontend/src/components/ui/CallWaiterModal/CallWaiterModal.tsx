import React, { useState } from 'react';
import { useNavigation, type LiveServiceCall } from '../../../context/NavigationContext';
import './CallWaiterModal.css';

interface CallOption {
  type: LiveServiceCall['type'];
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const CALL_OPTIONS: CallOption[] = [
  {
    type: 'tea',
    icon: '🫖',
    title: 'Ko\'k / Qora Choy',
    desc: 'Choynakni yangilash yoki qo\'shimcha choy',
    color: '#16A34A',
  },
  {
    type: 'bread',
    icon: '🍞',
    title: 'Issiq Tandir Non',
    desc: 'Yangi issiq non olib kelish',
    color: '#D97706',
  },
  {
    type: 'bill',
    icon: '🧾',
    title: 'Hisob-kitob (Chek)',
    desc: 'To\'lov uchun yakuniy hisobni olib kelish',
    color: '#E11D48',
  },
  {
    type: 'waiter',
    icon: '🙋‍♂️',
    title: 'Ofitsiantni chaqirish',
    desc: 'Stolga xizmat ko\'rsatish bo\'yicha yordam',
    color: '#EA580C',
  },
];

export const CallWaiterModal: React.FC = () => {
  const { isCallWaiterOpen, setIsCallWaiterOpen, tableNumber, createServiceCall } = useNavigation();
  const [selectedType, setSelectedType] = useState<LiveServiceCall['type']>('waiter');
  const [customNote, setCustomNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isCallWaiterOpen) return null;

  const handleSendCall = () => {
    const opt = CALL_OPTIONS.find((o) => o.type === selectedType) || CALL_OPTIONS[3];
    const fullTitle = customNote.trim() ? `${opt.title}: ${customNote.trim()}` : opt.title;

    createServiceCall({
      table_number: tableNumber || '05',
      type: selectedType,
      title: fullTitle,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setCustomNote('');
      setIsCallWaiterOpen(false);
    }, 1800);
  };

  return (
    <div className="call-waiter-overlay" onClick={() => setIsCallWaiterOpen(false)}>
      <div className="call-waiter-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="call-waiter-close"
          onClick={() => setIsCallWaiterOpen(false)}
          aria-label="Yopish"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {isSuccess ? (
          <div className="call-waiter-success">
            <div className="success-icon-bubble">✓</div>
            <h3>Ofitsiantga xabar yuborildi!</h3>
            <p>
              Stol <strong>#{tableNumber}</strong> bo'yicha xodimingiz zudlik bilan yo'lga chiqdi.
            </p>
          </div>
        ) : (
          <>
            <div className="call-waiter-header">
              <span className="call-waiter-badge">Stol #{tableNumber}</span>
              <h3 className="call-waiter-title">Ofitsiantga xabar berish</h3>
              <p className="call-waiter-desc">
                Qanday xizmat kerakligini tanlang, ofitsiantimiz bir necha daqiqada stolingizga yetib keladi.
              </p>
            </div>

            <div className="call-options-grid">
              {CALL_OPTIONS.map((opt) => (
                <div
                  key={opt.type}
                  className={`call-opt-card ${selectedType === opt.type ? 'active' : ''}`}
                  onClick={() => setSelectedType(opt.type)}
                >
                  <span className="call-opt-emoji" role="img" aria-label={opt.title}>
                    {opt.icon}
                  </span>
                  <div className="call-opt-info">
                    <span className="call-opt-title">{opt.title}</span>
                    <span className="call-opt-desc">{opt.desc}</span>
                  </div>
                  <div className="call-opt-radio">
                    {selectedType === opt.type && <span className="radio-dot" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="call-waiter-note-wrap">
              <label htmlFor="call-waiter-note" className="call-note-label">
                Qo'shimcha izoh (ixtiyoriy):
              </label>
              <input
                id="call-waiter-note"
                type="text"
                className="call-note-input"
                placeholder="Masalan: limonli bo'lsin, 2 ta stakan..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
            </div>

            <button type="button" className="btn-send-call" onClick={handleSendCall}>
              <span>Chaqiruvni yuborish</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
