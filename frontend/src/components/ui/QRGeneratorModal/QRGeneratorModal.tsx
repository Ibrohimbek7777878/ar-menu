import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useNavigation, type LiveTable } from '../../../context/NavigationContext';
import './QRGeneratorModal.css';

export interface QRGeneratorModalProps {
  initialTable?: LiveTable | null;
  isOpen: boolean;
  onClose: () => void;
}

export type PrintPaperSize = 'a4' | 'a5' | 'a6' | 'sticker' | 'tent';

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  initialTable,
  isOpen,
  onClose,
}) => {
  const { tables } = useNavigation();

  // Selected table
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>(
    initialTable ? String(initialTable.number) : tables[0]?.number ? String(tables[0].number) : '01'
  );

  // Configuration options
  const [printSize, setPrintSize] = useState<PrintPaperSize>('tent');
  const [qrColor, setQrColor] = useState<string>('#1b2d20');
  const [customTitle, setCustomTitle] = useState<string>('Guliston Milliy Taomlari');
  const [customSubtitle, setCustomSubtitle] = useState<string>("Smart Menyu va To'lov");
  const [includeWifi, setIncludeWifi] = useState<boolean>(true);
  const [wifiPassword, setWifiPassword] = useState<string>('guliston2026');
  const [callWaiterNotice, setCallWaiterNotice] = useState<boolean>(true);
  const [include3DBadge, setInclude3DBadge] = useState<boolean>(true);

  // Bulk print mode
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedHallFilter, setSelectedHallFilter] = useState<string>('all');

  // Generated QR data URLs cache
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [bulkQrMap, setBulkQrMap] = useState<Record<string, string>>({});

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Helper to get real target URL for a table
  const getTableMenuUrl = (tableNum: string | number) => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://guliston-restaurant.uz';
    return `${origin}/menu/?table=${encodeURIComponent(String(tableNum))}`;
  };

  // Generate Single QR Code
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const url = getTableMenuUrl(selectedTableNumber);

    QRCode.toDataURL(url, {
      width: 480,
      margin: 1,
      color: {
        dark: qrColor,
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((dataUri: string) => {
        if (isMounted) setQrDataUrl(dataUri);
      })
      .catch((err: unknown) => {
        console.error('QR generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedTableNumber, qrColor]);

  // Generate Bulk QR codes when in bulk mode
  useEffect(() => {
    if (!isOpen || !isBulkMode) return;

    const targetTables = selectedHallFilter === 'all'
      ? tables
      : tables.filter((t: LiveTable) => t.hall === selectedHallFilter);

    const promises = targetTables.map((tbl: LiveTable) => {
      const url = getTableMenuUrl(tbl.number);
      return QRCode.toDataURL(url, {
        width: 400,
        margin: 1,
        color: { dark: qrColor, light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then((dataUri: string) => ({ number: String(tbl.number), dataUri }));
    });

    Promise.all(promises)
      .then((results: { number: string; dataUri: string }[]) => {
        const map: Record<string, string> = {};
        results.forEach((r) => {
          map[r.number] = r.dataUri;
        });
        setBulkQrMap(map);
      })
      .catch((err: unknown) => {
        console.error('Bulk QR generation error:', err);
      });
  }, [isOpen, isBulkMode, selectedHallFilter, tables, qrColor]);

  if (!isOpen) return null;

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Download Single QR as PNG
  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `stol-${selectedTableNumber}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const halls: string[] = Array.from(new Set(tables.map((t: LiveTable) => t.hall)));

  const bulkTablesList: LiveTable[] = selectedHallFilter === 'all'
    ? tables
    : tables.filter((t: LiveTable) => t.hall === selectedHallFilter);

  return (
    <div className="qr-gen-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="qr-gen-modal" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <header className="qr-gen-header">
          <div className="qr-header-left">
            <div className="qr-header-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h.01M17 7h.01M7 17h.01M12 12h.01" />
                <path d="M12 7v5M7 12h5M12 17v-2M17 12v5" />
              </svg>
            </div>
            <div>
              <h2 className="qr-modal-title">Stollar uchun Haqiqiy QR Kod Generator</h2>
              <p className="qr-modal-subtitle">
                Haqiqiy skanerlanuvchi QR kod yarating, dizaynini sozlang va kerakli o'lchamda chop eting
              </p>
            </div>
          </div>
          <button type="button" className="qr-close-btn" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </header>

        {/* MODAL BODY (TWO PANELS: SETTINGS & PREVIEW) */}
        <div className="qr-gen-body">
          {/* LEFT PANEL: CONTROLS & SETTINGS */}
          <aside className="qr-controls-panel">
            {/* 1. Mode Switch: Single vs Bulk */}
            <div className="qr-control-group">
              <label className="qr-control-label">Chop etish rejimi</label>
              <div className="qr-segmented-pill">
                <button
                  type="button"
                  className={`pill-option ${!isBulkMode ? 'active' : ''}`}
                  onClick={() => setIsBulkMode(false)}
                >
                  Yakka stol
                </button>
                <button
                  type="button"
                  className={`pill-option ${isBulkMode ? 'active' : ''}`}
                  onClick={() => setIsBulkMode(true)}
                >
                  Barcha stollar ({tables.length} ta)
                </button>
              </div>
            </div>

            {/* If Single: Table select */}
            {!isBulkMode ? (
              <div className="qr-control-group">
                <label className="qr-control-label" htmlFor="table-selector">
                  Stolni tanlang
                </label>
                <select
                  id="table-selector"
                  className="qr-select-input"
                  value={selectedTableNumber}
                  onChange={(e) => setSelectedTableNumber(e.target.value)}
                >
                  {tables.map((t: LiveTable) => (
                    <option key={t.id} value={String(t.number)}>
                      Stol #{t.number} — {t.hall} ({t.capacity} kishilik)
                    </option>
                  ))}
                </select>
                <div className="qr-url-hint">
                  <span className="hint-label">Haqiqiy URL:</span>
                  <code className="hint-url">{getTableMenuUrl(selectedTableNumber)}</code>
                </div>
              </div>
            ) : (
              <div className="qr-control-group">
                <label className="qr-control-label" htmlFor="hall-selector">
                  Zal bo'yicha filtrlash
                </label>
                <select
                  id="hall-selector"
                  className="qr-select-input"
                  value={selectedHallFilter}
                  onChange={(e) => setSelectedHallFilter(e.target.value)}
                >
                  <option value="all">Barcha zallar ({tables.length} ta stol)</option>
                  {halls.map((h: string) => (
                    <option key={h} value={h}>
                      {h} ({tables.filter((t: LiveTable) => t.hall === h).length} ta)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Paper & Display Sizes */}
            <div className="qr-control-group">
              <label className="qr-control-label">Chop etish formati (O'lchami)</label>
              <div className="qr-sizes-grid">
                <button
                  type="button"
                  className={`size-card ${printSize === 'tent' ? 'selected' : ''}`}
                  onClick={() => setPrintSize('tent')}
                >
                  <div className="size-badge">Tavsiya</div>
                  <strong className="size-title">Stol Ustligi (Tent)</strong>
                  <span className="size-dim">10 × 15 sm (Burchakli)</span>
                </button>

                <button
                  type="button"
                  className={`size-card ${printSize === 'sticker' ? 'selected' : ''}`}
                  onClick={() => setPrintSize('sticker')}
                >
                  <strong className="size-title">Stiker / Yorliq</strong>
                  <span className="size-dim">8 × 8 sm (Kompakt)</span>
                </button>

                <button
                  type="button"
                  className={`size-card ${printSize === 'a6' ? 'selected' : ''}`}
                  onClick={() => setPrintSize('a6')}
                >
                  <strong className="size-title">A6 Posteri</strong>
                  <span className="size-dim">10.5 × 14.8 sm</span>
                </button>

                <button
                  type="button"
                  className={`size-card ${printSize === 'a5' ? 'selected' : ''}`}
                  onClick={() => setPrintSize('a5')}
                >
                  <strong className="size-title">A5 Formati</strong>
                  <span className="size-dim">14.8 × 21.0 sm</span>
                </button>

                <button
                  type="button"
                  className={`size-card ${printSize === 'a4' ? 'selected' : ''}`}
                  onClick={() => setPrintSize('a4')}
                >
                  <strong className="size-title">A4 Katta Banner</strong>
                  <span className="size-dim">21.0 × 29.7 sm</span>
                </button>
              </div>
            </div>

            {/* 3. Branding & Custom Text */}
            <div className="qr-control-group">
              <label className="qr-control-label">Stend matnlari va brending</label>
              <input
                type="text"
                className="qr-text-input"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Restoran nomi..."
              />
              <input
                type="text"
                className="qr-text-input mt-2"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="Tagso'z..."
              />
            </div>

            {/* 4. Extra Features Toggles */}
            <div className="qr-control-group">
              <label className="qr-control-label">Qo'shimcha elementlar</label>

              <label className="qr-checkbox-row">
                <input
                  type="checkbox"
                  checked={includeWifi}
                  onChange={(e) => setIncludeWifi(e.target.checked)}
                />
                <span>Wi-Fi parolini stendga qo'shish</span>
              </label>

              {includeWifi && (
                <input
                  type="text"
                  className="qr-text-input mt-1"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Wi-Fi paroli"
                />
              )}

              <label className="qr-checkbox-row mt-2">
                <input
                  type="checkbox"
                  checked={callWaiterNotice}
                  onChange={(e) => setCallWaiterNotice(e.target.checked)}
                />
                <span>"Ofitsiantni chaqirish" imkoniyatini bildirish</span>
              </label>

              <label className="qr-checkbox-row mt-2">
                <input
                  type="checkbox"
                  checked={include3DBadge}
                  onChange={(e) => setInclude3DBadge(e.target.checked)}
                />
                <span>"3D & AR Taomlar" nishonini ko'rsatish</span>
              </label>
            </div>

            {/* 5. Colors */}
            <div className="qr-control-group">
              <label className="qr-control-label">QR Ranglari</label>
              <div className="qr-color-options">
                <button
                  type="button"
                  className={`color-pick-circle ${qrColor === '#1b2d20' ? 'active' : ''}`}
                  style={{ background: '#1b2d20' }}
                  onClick={() => setQrColor('#1b2d20')}
                  title="To'q Yashil (Restoran uslubi)"
                />
                <button
                  type="button"
                  className={`color-pick-circle ${qrColor === '#c25e2e' ? 'active' : ''}`}
                  style={{ background: '#c25e2e' }}
                  onClick={() => setQrColor('#c25e2e')}
                  title="Issiq Terakotta"
                />
                <button
                  type="button"
                  className={`color-pick-circle ${qrColor === '#0f172a' ? 'active' : ''}`}
                  style={{ background: '#0f172a' }}
                  onClick={() => setQrColor('#0f172a')}
                  title="Klassik Qora"
                />
                <button
                  type="button"
                  className={`color-pick-circle ${qrColor === '#7c2d12' ? 'active' : ''}`}
                  style={{ background: '#7c2d12' }}
                  onClick={() => setQrColor('#7c2d12')}
                  title="Shokolad / Qahva"
                />
              </div>
            </div>
          </aside>

          {/* RIGHT PANEL: LIVE PRINT PREVIEW */}
          <main className="qr-preview-panel">
            <div className="preview-toolbar">
              <div className="preview-info-badge">
                <span>Ko'rinish: <strong>{printSize.toUpperCase()} formati</strong></span>
                <span className="dot-sep">•</span>
                <span>{isBulkMode ? `${bulkTablesList.length} ta stol` : `Stol #${selectedTableNumber}`}</span>
              </div>

              <div className="preview-actions-bar">
                {!isBulkMode && (
                  <button
                    type="button"
                    className="btn-qr-action btn-outline"
                    onClick={handleDownloadPNG}
                    title="PNG rasm sifatida saqlash"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>PNG Yuklab Olish</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-qr-action btn-primary"
                  onClick={handlePrint}
                  title="Brauzer orqali printerga yuborish"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect width="12" height="8" x="6" y="14" />
                  </svg>
                  <span>Chop Etish (Print)</span>
                </button>
              </div>
            </div>

            {/* ACTUAL RENDERED PRINT CANVAS / CARDS CONTAINER */}
            <div className="print-canvas-scroller">
              <div
                ref={printAreaRef}
                className={`qr-printable-area size-${printSize} ${isBulkMode ? 'bulk-grid-layout' : 'single-layout'}`}
                id="restaurant-qr-printable-container"
              >
                {!isBulkMode ? (
                  /* SINGLE TABLE CARD */
                  <div className={`qr-stand-card paper-${printSize}`}>
                    {/* Header */}
                    <div className="stand-header">
                      <div className="stand-brand-mark">
                        <span className="brand-logo-letter">G</span>
                        <div className="brand-titles">
                          <h3 className="stand-brand-name">{customTitle}</h3>
                          <p className="stand-brand-sub">{customSubtitle}</p>
                        </div>
                      </div>

                      <div className="stand-table-badge">
                        <span className="stand-tbl-prefix">STOL</span>
                        <span className="stand-tbl-num tabular-nums">{selectedTableNumber}</span>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="stand-qr-box">
                      <div className="stand-qr-frame">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt={`Stol #${selectedTableNumber} QR kodi`}
                            className="stand-qr-image"
                          />
                        ) : (
                          <div className="qr-loading-placeholder">QR yaratilmoqda...</div>
                        )}
                        <div className="stand-scan-prompt">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span>Kamerangizni qarating</span>
                        </div>
                      </div>
                    </div>

                    {/* Instructions & Features */}
                    <div className="stand-instructions">
                      <div className="step-point">
                        <span className="step-num">1</span>
                        <span>Kamera bilan QR kodni skanerlang</span>
                      </div>
                      <div className="step-point">
                        <span className="step-num">2</span>
                        <span>3D taomlarni stolingizda ko'ring</span>
                      </div>
                      <div className="step-point">
                        <span className="step-num">3</span>
                        <span>Ofitsiant va hisobni bitta bosishda chaqiring</span>
                      </div>
                    </div>

                    {/* Extras Footer (WiFi & 3D Badges) */}
                    <div className="stand-footer">
                      {includeWifi && (
                        <div className="stand-wifi-badge">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <line x1="12" y1="20" x2="12.01" y2="20" />
                          </svg>
                          <span>Wi-Fi: <strong>{wifiPassword}</strong></span>
                        </div>
                      )}

                      {include3DBadge && (
                        <div className="stand-3d-badge">
                          <span>✨ 3D Menyu</span>
                        </div>
                      )}

                      {callWaiterNotice && (
                        <div className="stand-call-badge">
                          <span>🔔 Chaqiruv</span>
                        </div>
                      )}
                    </div>

                    <div className="stand-cut-line" aria-hidden="true">
                      <span>✂️ Stol ustiga o'rnatish uchun bukish chizig'i</span>
                    </div>
                  </div>
                ) : (
                  /* BULK PRINTING (ALL SELECTED TABLES) */
                  bulkTablesList.map((tbl: LiveTable) => {
                    const uri = bulkQrMap[String(tbl.number)];
                    return (
                      <div key={tbl.id} className={`qr-stand-card paper-${printSize} bulk-item`}>
                        <div className="stand-header">
                          <div className="stand-brand-mark">
                            <span className="brand-logo-letter">G</span>
                            <div className="brand-titles">
                              <h3 className="stand-brand-name">{customTitle}</h3>
                              <p className="stand-brand-sub">{tbl.hall}</p>
                            </div>
                          </div>

                          <div className="stand-table-badge">
                            <span className="stand-tbl-prefix">STOL</span>
                            <span className="stand-tbl-num tabular-nums">{tbl.number}</span>
                          </div>
                        </div>

                        <div className="stand-qr-box">
                          <div className="stand-qr-frame">
                            {uri ? (
                              <img
                                src={uri}
                                alt={`Stol #${tbl.number} QR kodi`}
                                className="stand-qr-image"
                              />
                            ) : (
                              <div className="qr-loading-placeholder">...</div>
                            )}
                            <div className="stand-scan-prompt">
                              <span>Menyuni ochish</span>
                            </div>
                          </div>
                        </div>

                        <div className="stand-instructions">
                          <div className="step-point">
                            <span className="step-num">✓</span>
                            <span>Taomlarni tanlang va ofitsiantni chaqiring</span>
                          </div>
                        </div>

                        <div className="stand-footer">
                          {includeWifi && (
                            <div className="stand-wifi-badge">
                              <span>Wi-Fi: <strong>{wifiPassword}</strong></span>
                            </div>
                          )}
                          {include3DBadge && (
                            <div className="stand-3d-badge">
                              <span>✨ 3D Menyu</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
