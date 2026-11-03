import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, type LiveServiceCall } from '../../../context/NavigationContext';
import { fxEnabled } from '../../../motion/env';
import { pop, ringBell, rippleRings, setButtonState } from '../../../motion/fx';
import { t, tr } from '../../../i18n';
import './CallWaiterModal.css';

interface CallOption {
  type: LiveServiceCall['type'];
  icon: string;
  /** O'zbekcha matn: xodimlarga serverga shu holatda yuboriladi; mehmonga `t(title)` ko'rsatiladi */
  title: string;
  desc: string;
  color: string;
}

const CALL_OPTIONS: CallOption[] = [
  {
    type: 'tea',
    icon: '🫖',
    title: tr("Ko'k / Qora Choy"),
    desc: tr("Choynakni yangilash yoki qo'shimcha choy"),
    color: '#16A34A',
  },
  {
    type: 'bread',
    icon: '🍞',
    title: tr('Issiq Tandir Non'),
    desc: tr('Yangi issiq non olib kelish'),
    color: '#D97706',
  },
  {
    type: 'bill',
    icon: '🧾',
    title: tr('Hisob-kitob (Chek)'),
    desc: tr("To'lov uchun yakuniy hisobni olib kelish"),
    color: '#E11D48',
  },
  {
    type: 'waiter',
    icon: '🙋‍♂️',
    title: tr('Ofitsiantni chaqirish'),
    desc: tr("Stolga xizmat ko'rsatish bo'yicha yordam"),
    color: 'var(--brand-primary)',
  },
];

export const CallWaiterModal: React.FC = () => {
  const { isCallWaiterOpen, setIsCallWaiterOpen, tableNumber, createServiceCall } = useNavigation();
  const [selectedType, setSelectedType] = useState<LiveServiceCall['type']>('waiter');
  const [customNote, setCustomNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const sendRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // "Yuborildi": belgi pop qiladi, sarlavhadagi qo'ng'iroq silkinadi (faqat ko'rinish)
  useEffect(() => {
    if (!isSuccess) return;
    pop(bubbleRef.current);
    rippleRings(bubbleRef.current, 2);
    ringBell(document.querySelector('.btn-header-call-waiter svg'));
  }, [isSuccess]);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isCallWaiterOpen) return null;

  // "Stol #5 bo'yicha ..." — stol raqami qalin chiqishi uchun jumla belgi bo'yicha ikkiga bo'linadi (so'z tartibi tilga qarab o'zgaradi)
  const sentParts = t("Stol {num} bo'yicha xodimingiz zudlik bilan yo'lga chiqdi.", { num: '\u0001' }).split('\u0001');

  const handleSendCall = async () => {
    if (isSending) return;
    if (!tableNumber) {
      setErrorMsg(t('Stol aniqlanmadi. Stol ustidagi QR kodni skanerlang.'));
      return;
    }
    const opt = CALL_OPTIONS.find((o) => o.type === selectedType) || CALL_OPTIONS[3];
    const fullTitle = customNote.trim() ? `${opt.title}: ${customNote.trim().slice(0, 120)}` : opt.title;

    setIsSending(true);
    setButtonState(sendRef.current, 'loading');
    setErrorMsg('');
    // "Yuborildi" faqat server qabul qilganda ko'rsatiladi (avval so'rov muvaffaqiyatsiz bo'lsa ham shunday deyilardi)
    const ok = await createServiceCall({
      table_number: tableNumber,
      type: selectedType,
      title: fullTitle,
    });
    setIsSending(false);
    if (!ok) {
      setButtonState(sendRef.current, 'error');
      window.setTimeout(() => setButtonState(sendRef.current, 'idle'), 1400);
      setErrorMsg(t("Chaqiruv yuborilmadi. Internetni tekshirib, qayta urinib ko'ring yoki ofitsiantga qo'l ko'taring."));
      return;
    }

    // Avval tugmada ✓ va to'lqin halqalar ko'rinadi, so'ng "yuborildi" ekrani (animatsiya o'chiq bo'lsa darhol)
    setButtonState(sendRef.current, 'success');
    rippleRings(sendRef.current);
    window.setTimeout(() => {
      setIsSuccess(true);
      window.setTimeout(() => {
        setIsSuccess(false);
        setCustomNote('');
        setIsCallWaiterOpen(false);
      }, 1800);
    }, fxEnabled() ? 700 : 0);
  };

  return (
    <div className="call-waiter-overlay" onClick={() => setIsCallWaiterOpen(false)}>
      <div className="call-waiter-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="call-waiter-close"
          onClick={() => setIsCallWaiterOpen(false)}
          aria-label={t('Yopish')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {isSuccess ? (
          <div className="call-waiter-success">
            <div className="success-icon-bubble" ref={bubbleRef}>✓</div>
            <h3>{t('Ofitsiantga xabar yuborildi!')}</h3>
            <p>
              {sentParts[0]}<strong>#{tableNumber}</strong>{sentParts[1] ?? ''}
            </p>
          </div>
        ) : (
          <>
            <div className="call-waiter-header">
              <span className="call-waiter-badge">{t('Stol #{num}', { num: tableNumber })}</span>
              <h3 className="call-waiter-title">{t('Ofitsiantga xabar berish')}</h3>
              <p className="call-waiter-desc">
                {t('Qanday xizmat kerakligini tanlang, ofitsiantimiz bir necha daqiqada stolingizga yetib keladi.')}
              </p>
            </div>

            <div className="call-options-grid">
              {CALL_OPTIONS.map((opt) => (
                <div
                  key={opt.type}
                  className={`call-opt-card ${selectedType === opt.type ? 'active' : ''}`}
                  onClick={() => setSelectedType(opt.type)}
                >
                  <span className="call-opt-emoji" role="img" aria-label={t(opt.title)}>
                    {opt.icon}
                  </span>
                  <div className="call-opt-info">
                    <span className="call-opt-title">{t(opt.title)}</span>
                    <span className="call-opt-desc">{t(opt.desc)}</span>
                  </div>
                  <div className="call-opt-radio">
                    {selectedType === opt.type && <span className="radio-dot" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="call-waiter-note-wrap">
              <label htmlFor="call-waiter-note" className="call-note-label">
                {t("Qo'shimcha izoh (ixtiyoriy):")}
              </label>
              <input
                id="call-waiter-note"
                type="text"
                className="call-note-input"
                placeholder={t("Masalan: limonli bo'lsin, 2 ta stakan...")}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
            </div>

            {errorMsg && (
              <p role="alert" style={{ color: '#B91C1C', fontSize: '13px', margin: '0 0 10px' }}>{errorMsg}</p>
            )}

            <button type="button" ref={sendRef} className="btn-send-call" onClick={handleSendCall} disabled={isSending}>
              <span>{isSending ? t('Yuborilmoqda...') : t('Chaqiruvni yuborish')}</span>
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
