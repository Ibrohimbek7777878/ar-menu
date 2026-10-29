import React, { useState, useEffect } from 'react';
import { Card, Button } from '@admins/shared';
import {
  Building2,
  Clock,
  Percent,
  Timer,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Power,
  RotateCcw,
} from 'lucide-react';
import { useSettings } from './useSettings';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '13px',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-main)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const disabledInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: 'var(--bg-surface-hover)',
  color: 'var(--text-dim)',
  cursor: 'not-allowed',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '6px',
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-dim)',
  margin: '4px 0 0',
};

const gridTwoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
};

export function SettingsPage() {
  const { settings, loading, saving, error, successMessage, refresh, saveSettings } = useSettings();

  // Lokal form holatlari
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [workingHours, setWorkingHours] = useState('08:00-23:00');
  const [workingDays, setWorkingDays] = useState('Dush-Yak');
  const [isOpen, setIsOpen] = useState(true);
  const [colorPrimary, setColorPrimary] = useState('#16a34a');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [serviceFeePercent, setServiceFeePercent] = useState<number>(0);
  const [kdsWarningMinutes, setKdsWarningMinutes] = useState<number>(15);
  const [kdsCriticalMinutes, setKdsCriticalMinutes] = useState<number>(30);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setDescription(settings.description || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setPhone2(settings.phone2 || '');
      setWorkingHours(settings.working_hours || '08:00-23:00');
      setWorkingDays(settings.working_days || 'Dush-Yak');
      setIsOpen(Boolean(settings.is_open));
      setColorPrimary(settings.color_primary || '#16a34a');
      setInstagramUrl(settings.instagram_url || '');
      setServiceFeePercent(settings.service_fee_percent ?? 0);
      setKdsWarningMinutes(settings.kds_warning_minutes ?? 15);
      setKdsCriticalMinutes(settings.kds_critical_minutes ?? 30);
      setTelegramChatId(settings.telegram_chat_id || '');
      setAutoAcceptOrders(Boolean(settings.auto_accept_orders));
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
      phone2: phone2.trim(),
      working_hours: workingHours.trim(),
      working_days: workingDays.trim(),
      is_open: isOpen,
      color_primary: colorPrimary.trim(),
      instagram_url: instagramUrl.trim(),
      service_fee_percent: serviceFeePercent,
      kds_warning_minutes: kdsWarningMinutes,
      kds_critical_minutes: kdsCriticalMinutes,
      telegram_chat_id: telegramChatId.trim(),
      auto_accept_orders: autoAcceptOrders,
    });
  };

  if (loading && !settings) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)' }}>
        Restoran sozlamalari yuklanmoqda...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
      {/* Header */}
      <Card
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Restoran Sozlamalari
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Restoran profili, oshxona (KDS) taymerlari va xizmat haqi parametrlari
          </p>
        </div>

        <Button type="button" variant="ghost" onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RotateCcw size={15} />
          <span>Qayta yuklash</span>
        </Button>
      </Card>

      {/* Bildirishnomalar */}
      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--accent-emerald-bg)',
            border: '1px solid var(--accent-emerald)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-emerald)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. ASOSIY MA'LUMOTLAR */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            <Building2 size={18} color="var(--accent-emerald)" />
            <span>Restoran Asosiy Profili</span>
          </div>

          <div style={gridTwoCol}>
            <div>
              <label style={labelStyle}>Restoran nomi *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rayhon Milliy Taomlar"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tizimdagi identifikator (Slug)</label>
              <input
                type="text"
                disabled
                value={settings?.slug || ''}
                style={disabledInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Manzil</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent sh., Chilonzor tumani, 9-mavze"
              style={inputStyle}
            />
          </div>

          <div style={gridTwoCol}>
            <div>
              <label style={labelStyle}>Asosiy telefon</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Qo'shimcha telefon</label>
              <input
                type="text"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="+998 71 200 00 00"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Restoran tavsifi (Mehmon menyusida ko'rinadi)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shinam muhit va milliy taomlar restorani..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </Card>

        {/* 2. ISH TARTIBI VA HOLATI */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            <Clock size={18} color="var(--accent-indigo)" />
            <span>Ish Tartibi va Faollik</span>
          </div>

          {/* Restoran Ochiq/Yopiq Switch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isOpen ? 'var(--accent-emerald-bg)' : 'var(--accent-rose-bg)',
              border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                  color: isOpen ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              >
                <Power size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Restoran hozir {isOpen ? 'Ochiq (Mijozlarni qabul qilmoqda)' : 'Yopiq (Buyurtma qabul qilinmaydi)'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  QR menyu orqali yangi mehmon buyurtmalarini qabul qilishni yoqish yoki to'xtatish
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isOpen}
              onClick={() => setIsOpen(!isOpen)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isOpen ? 'var(--accent-emerald)' : 'var(--bg-elevated)',
                border: '1px solid ' + (isOpen ? 'var(--accent-emerald)' : 'var(--border-strong)'),
                position: 'relative',
                cursor: 'pointer',
                padding: '2px',
                transition: 'background-color var(--transition-fast)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: isOpen ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform var(--transition-fast)',
                }}
              />
            </button>
          </div>

          <div style={gridTwoCol}>
            <div>
              <label style={labelStyle}>Ish soatlari</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="09:00 - 23:00"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ish kunlari</label>
              <input
                type="text"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                placeholder="Dushanba - Yakshanba (Har kuni)"
                style={inputStyle}
              />
            </div>
          </div>
        </Card>

        {/* 3. XIZMAT HAQI VA BUYURTMA QABUL QILISH */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            <Percent size={18} color="var(--accent-amber)" />
            <span>Xizmat Haqi va Buyurtmalar Oqimi</span>
          </div>

          <div style={gridTwoCol}>
            <div>
              <label style={labelStyle}>Xizmat haqi (Servis) foizi (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={serviceFeePercent}
                onChange={(e) => setServiceFeePercent(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
              <p style={helpTextStyle}>
                Chekdagi taomlar summasiga qo'shiladigan xizmat haqi (masalan 10%)
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                alignSelf: 'start',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Avtomatik qabul qilish
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Stoldan yuborilgan buyurtma to'g'ridan-to'g'ri oshxonaga o'tadi
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoAcceptOrders}
                onClick={() => setAutoAcceptOrders(!autoAcceptOrders)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: autoAcceptOrders ? 'var(--accent-emerald)' : 'var(--bg-surface-hover)',
                  border: '1px solid ' + (autoAcceptOrders ? 'var(--accent-emerald)' : 'var(--border-strong)'),
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'background-color var(--transition-fast)',
                  flexShrink: 0,
                  marginLeft: '12px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transform: autoAcceptOrders ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform var(--transition-fast)',
                  }}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* 4. OSHXONA KDS TAYMERLARI */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            <Timer size={18} color="var(--accent-amber)" />
            <span>Oshxona (KDS) Taymer Chegaralari</span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            KDS ekranida taomlar tayyorlanish vaqtiga qarab kartochka rangi sariq va qizilga aylanadi:
          </p>

          <div style={gridTwoCol}>
            <div>
              <label style={{ ...labelStyle, color: 'var(--accent-amber)' }}>
                Sariq ogohlantirish (Daqiqa)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={kdsWarningMinutes}
                onChange={(e) => setKdsWarningMinutes(parseInt(e.target.value) || 15)}
                style={inputStyle}
              />
              <p style={helpTextStyle}>Ushbu vaqtdan oshsa kartochka sariq rangga kiradi</p>
            </div>

            <div>
              <label style={{ ...labelStyle, color: 'var(--accent-rose)' }}>
                Qizil krizis va kechikish (Daqiqa)
              </label>
              <input
                type="number"
                min="2"
                max="300"
                value={kdsCriticalMinutes}
                onChange={(e) => setKdsCriticalMinutes(parseInt(e.target.value) || 30)}
                style={inputStyle}
              />
              <p style={helpTextStyle}>Ushbu vaqtdan oshsa buyurtma kechikkan deb hisoblanadi</p>
            </div>
          </div>
        </Card>

        {/* 5. BILDIRISHNOMALAR VA TELEGRAM */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            <Send size={18} color="var(--accent-indigo)" />
            <span>Telegram va Tashqi Havolalar</span>
          </div>

          <div style={gridTwoCol}>
            <div>
              <label style={labelStyle}>Telegram Chat / Guruh ID</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-1001234567890"
                style={inputStyle}
              />
              <p style={helpTextStyle}>
                Yangi buyurtmalar va hisobotlar yuboriladigan Telegram guruhi
              </p>
            </div>

            <div>
              <label style={labelStyle}>Instagram havolasi</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/restoran_nomi"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ maxWidth: '320px' }}>
            <label style={labelStyle}>Asosiy brend rangi</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                style={{
                  width: '38px',
                  height: '38px',
                  padding: '2px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  cursor: 'pointer',
                }}
              />
              <input
                type="text"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                style={{ ...inputStyle, width: '120px' }}
              />
            </div>
          </div>
        </Card>

        {/* SAQLASH TUGMASI */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '14px' }}
          >
            <Save size={18} />
            <span>{saving ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
