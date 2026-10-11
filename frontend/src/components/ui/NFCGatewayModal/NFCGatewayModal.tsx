import React, { useState } from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import './NFCGatewayModal.css';

export const NFCGatewayModal: React.FC = () => {
  const { isNfcModalOpen, setIsNfcModalOpen, tableNumber, setTableNumber, tables, navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<'nfc' | 'qr'>('nfc');
  const [selectedTbl, setSelectedTbl] = useState<string | number>(tableNumber || '05');
  const [isScanning, setIsScanning] = useState(false);

  if (!isNfcModalOpen) return null;

  const handleConnectTable = (tblNum: string | number) => {
    setIsScanning(true);
    setTimeout(() => {
      setTableNumber(String(tblNum));
      setIsScanning(false);
      setIsNfcModalOpen(false);
      navigate('/menu');
    }, 700);
  };

  return (
    <div className="nfc-modal-overlay" onClick={() => setIsNfcModalOpen(false)}>
      <div className="nfc-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="nfc-modal-close"
          onClick={() => setIsNfcModalOpen(false)}
          aria-label="Yopish"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="nfc-modal-top">
          <div className="nfc-tab-switch">
            <button
              type="button"
              className={`nfc-tab-btn ${activeTab === 'nfc' ? 'active' : ''}`}
              onClick={() => setActiveTab('nfc')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18h12M6 6h12" />
                <path d="M12 2v20" />
              </svg>
              <span>NFC Aloqa</span>
            </button>
            <button
              type="button"
              className={`nfc-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
              onClick={() => setActiveTab('qr')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1" />
                <rect width="5" height="5" x="16" y="3" rx="1" />
                <rect width="5" height="5" x="3" y="16" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                <path d="M21 21v.01" />
                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                <path d="M3 12h.01" />
                <path d="M12 3h.01" />
                <path d="M12 16v.01" />
                <path d="M16 12h1" />
                <path d="M21 12v.01" />
                <path d="M12 21v-1" />
              </svg>
              <span>QR Kod</span>
            </button>
          </div>
        </div>

        {activeTab === 'nfc' ? (
          <div className="nfc-view-body">
            <div className={`nfc-sensor-ring ${isScanning ? 'scanning' : ''}`}>
              <div className="nfc-phone-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div className="nfc-waves">
                <span className="wave wave-1" />
                <span className="wave wave-2" />
                <span className="wave wave-3" />
              </div>
            </div>

            <h3 className="nfc-title">
              {isScanning ? 'Stol aniqlanmoqda...' : 'Telefonni stol chipiga tekkizing'}
            </h3>
            <p className="nfc-subtitle">
              Yoki quyidagi ro'yxatdan o'tirgan stolingizni bosing:
            </p>
          </div>
        ) : (
          <div className="qr-view-body">
            <div className="qr-frame-box">
              <div className="qr-simulated-image">
                <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8">
                  <rect width="6" height="6" x="2" y="2" rx="1" />
                  <rect width="6" height="6" x="16" y="2" rx="1" />
                  <rect width="6" height="6" x="2" y="16" rx="1" />
                  <rect width="2" height="2" x="10" y="4" />
                  <rect width="2" height="2" x="10" y="10" />
                  <rect width="2" height="2" x="4" y="10" />
                  <rect width="2" height="2" x="16" y="16" />
                  <rect width="2" height="2" x="20" y="12" />
                </svg>
              </div>
              <div className="qr-scanner-line" />
            </div>
            <h3 className="nfc-title">Kamera orqali stol QR-kodini skanerlang</h3>
            <p className="nfc-subtitle">
              Stol ustidagi stikerga kamerani qarating yoki tanlang:
            </p>
          </div>
        )}

        <div className="nfc-tables-selection">
          <span className="nfc-select-label">Stollar ro'yxati (16 ta stol):</span>
          <div className="nfc-tables-grid">
            {tables.map((t) => {
              const isCurrent = String(t.number) === String(tableNumber);
              const isSelected = String(t.number) === String(selectedTbl);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`nfc-tbl-chip ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${t.status}`}
                  onClick={() => {
                    setSelectedTbl(t.number);
                    handleConnectTable(t.number);
                  }}
                >
                  <span className="tbl-name">{t.number}</span>
                  <span className="tbl-status-indicator" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="nfc-legend">
          <span className="legend-item"><span className="legend-dot free" /> Bo'sh</span>
          <span className="legend-item"><span className="legend-dot occupied" /> Band</span>
          <span className="legend-item"><span className="legend-dot bill_requested" /> Hisob kutilmoqda</span>
          <span className="legend-item"><span className="legend-dot reserved" /> Bron</span>
        </div>
      </div>
    </div>
  );
};
