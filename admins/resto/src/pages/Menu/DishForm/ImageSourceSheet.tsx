import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Images } from 'lucide-react';
import { restoUz } from '../../../i18n/uz';
import { TAP, mutedTextStyle } from '../BulkImport/styles';

const t = restoUz.dishForm.photo;

interface ImageSourceSheetProps {
  open: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

const optionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  width: '100%',
  minHeight: 64,
  padding: '12px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  textAlign: 'left',
};

/**
 * Pastdan chiqadigan tanlov varag'i: "Kamera" yoki "Galereya". Telefonda bosh barmoq yetadigan joyda turadi.
 * Oyna (Modal) ustida turishi uchun `document.body` ga chiqariladi.
 */
export const ImageSourceSheet: React.FC<ImageSourceSheetProps> = ({ open, onClose, onCamera, onGallery }) => {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Klaviatura: Escape faqat varaqni yopadi (ostidagi taom oynasini emas): ushlash bosqichida to'xtatiladi
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: 'var(--scrim)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.sheetTitle}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '20px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-main)' }}>{t.sheetTitle}</strong>

        <button ref={firstRef} type="button" onClick={onCamera} style={optionStyle}>
          <Camera size={26} aria-hidden="true" style={{ color: 'var(--action)', flexShrink: 0 }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{t.camera}</span>
            <span style={mutedTextStyle}>{t.cameraHint}</span>
          </span>
        </button>

        <button type="button" onClick={onGallery} style={optionStyle}>
          <Images size={26} aria-hidden="true" style={{ color: 'var(--action)', flexShrink: 0 }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{t.gallery}</span>
            <span style={mutedTextStyle}>{t.galleryHint}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            minHeight: TAP,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.sheetCancel}
        </button>
      </div>
    </div>,
    document.body,
  );
};
