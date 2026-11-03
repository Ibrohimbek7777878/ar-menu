import React, { useRef, useState } from 'react';
import { ExternalLink, Info, Search, Upload, UtensilsCrossed, X } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { safeHttpUrl } from '../BulkImport/images';
import { TAP, mutedTextStyle } from '../BulkImport/styles';
import { fill } from '../BulkImport/text';
import type { ParseResponse } from '../BulkImport/types';
import { ImageSourceSheet } from './ImageSourceSheet';
import { Spinner, usePulse } from './Motion';
import type { MenuMany, ReadNotice } from './useImageReader';
import type { DishImage } from './types';

const t = restoUz.dishForm.photo;
const r = restoUz.dishForm.read;
const p = restoUz.dishForm.preview;

/** Sensorli ekran (telefon, planshet): u yerda "Kamera / Galereya" tanlovi kerak. Kompyuterda to'g'ridan-to'g'ri fayl tanlanadi. */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
}

function imageUrl(image: DishImage): string {
  if (image.kind === 'current') return image.url;
  if (image.kind === 'file' || image.kind === 'internet') return image.previewUrl;
  return '';
}

interface PhotoCardProps {
  isEdit: boolean;
  image: DishImage;
  /** Tanlangan rasm tayyorlanguncha ko'rsatiladigan asl rasm. */
  pendingPreview: string | null;
  reading: boolean;
  notice: ReadNotice | null;
  menuMany: MenuMany | null;
  canKeepHeld: boolean;
  findOpen: boolean;
  /** Mehmon ko'radigan kartochka (jonli): forma maydonlaridan. */
  name: string;
  priceText: string;
  categoryName: string;
  description: string;
  onFile: (file: File) => void;
  onStopReading: () => void;
  onRemove: () => void;
  onKeepHeld: () => void;
  onFindOnline: () => void;
  onGoBulk: (response: ParseResponse) => void;
}

const bigButton: React.CSSProperties = { width: '100%', minHeight: 48, fontSize: '16px' };

/**
 * Formaning tepasi: katta rasm maydoni + "Rasm yuklash" tugmasi (telefonda Kamera / Galereya varag'i) va yonida (keng ekranda)
 * yoki ostida (tor ekranda) o'qilgan ma'lumotlardan jonli kartochka: rasm + nom + narx + kategoriya.
 */
export const PhotoCard: React.FC<PhotoCardProps> = (props) => {
  const { isEdit, image, reading, notice, menuMany, canKeepHeld, findOpen } = props;
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touch] = useState(isTouchDevice);
  usePulse(previewRef, reading);

  const url = props.pendingPreview || imageUrl(image);
  const hasImage = image.kind !== 'none' || Boolean(props.pendingPreview);
  const sourceHref =
    image.kind === 'internet' || image.kind === 'current' ? safeHttpUrl(image.sourceUrl) : '';

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Xuddi shu faylni qayta tanlash ham ishlashi uchun tozalanadi
    event.target.value = '';
    if (file) props.onFile(file);
  };

  const openPicker = () => {
    if (touch) setSheetOpen(true);
    else galleryRef.current?.click();
  };

  // Tanlov varag'i yopilgach fayl oynasi ochiladi: `click()` bosish ichida (sinxron) chaqirilishi shart
  const chooseCamera = () => {
    setSheetOpen(false);
    cameraRef.current?.click();
  };
  const chooseGallery = () => {
    setSheetOpen(false);
    galleryRef.current?.click();
  };

  let caption = '';
  if (image.kind === 'file') caption = t.ownPhoto;
  else if (image.kind === 'internet') caption = fill(t.fromInternet, { credit: image.credit });
  else if (image.kind === 'current' && image.credit) caption = fill(t.currentFromInternet, { credit: image.credit });
  else if (image.kind === 'current') caption = t.current;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        {/* Rasm va tugmalar */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              borderRadius: 'var(--radius-md)',
              border: hasImage ? '1px solid var(--border-subtle)' : '1px dashed var(--border-strong)',
              backgroundColor: 'var(--bg-elevated)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {url ? (
              <img
                src={url}
                alt={props.name || t.alt}
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : reading ? null : (
              <div style={{ padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <UtensilsCrossed size={36} aria-hidden="true" style={{ color: 'var(--text-dim)' }} />
                <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{t.emptyTitle}</strong>
                <span style={{ ...mutedTextStyle, fontSize: '12px' }}>{isEdit ? t.emptyHintEdit : t.emptyHintNew}</span>
              </div>
            )}

            {reading && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  textAlign: 'center',
                  color: 'var(--text-main)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-surface) 74%, transparent)',
                }}
              >
                <Spinner size={24} />
                <strong style={{ fontSize: '15px' }}>{t.reading}</strong>
                <button
                  type="button"
                  onClick={props.onStopReading}
                  style={{
                    minHeight: TAP,
                    padding: '0 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {t.stopReading}
                </button>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant={hasImage ? 'secondary' : 'primary'}
            onClick={openPicker}
            icon={<Upload size={18} />}
            style={bigButton}
          >
            {hasImage ? t.replace : t.upload}
          </Button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <Button
              type="button"
              variant={findOpen ? 'primary' : 'ghost'}
              size="sm"
              onClick={props.onFindOnline}
              icon={<Search size={15} />}
              style={{ minHeight: TAP }}
            >
              {hasImage ? t.findOnlineOther : t.findOnline}
            </Button>
            {(image.kind === 'file' || image.kind === 'internet') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={props.onRemove}
                icon={<X size={15} />}
                style={{ minHeight: TAP }}
              >
                {t.remove}
              </Button>
            )}
          </div>

          {caption && (
            <p style={{ ...mutedTextStyle, fontSize: '12px', overflowWrap: 'anywhere' }}>
              {caption}
              {sourceHref && (
                <>
                  {' '}
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.sourceLinkAria}
                    style={{ color: 'var(--action)', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    <ExternalLink size={11} aria-hidden="true" /> {t.sourceLink}
                  </a>
                </>
              )}
            </p>
          )}

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleInput} />
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handleInput} />
        </div>

        {/* Mehmon ko'radigan kartochka (jonli) */}
        <div
          ref={previewRef}
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minWidth: 0 }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>{p.title}</span>
          {props.categoryName && (
            <span
              style={{
                alignSelf: 'flex-start',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {props.categoryName}
            </span>
          )}
          <h3
            style={{
              margin: 0,
              fontSize: '20px',
              lineHeight: 1.25,
              color: props.name ? 'var(--text-main)' : 'var(--text-dim)',
              overflowWrap: 'anywhere',
            }}
          >
            {props.name || p.namePlaceholder}
          </h3>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: props.priceText ? 'var(--action)' : 'var(--text-dim)',
            }}
          >
            {props.priceText || p.pricePlaceholder}
          </div>
          {props.description && (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-muted)',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {props.description}
            </p>
          )}
        </div>
      </section>

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${notice.tone === 'error' ? 'var(--accent-rose)' : 'var(--border-strong)'}`,
            backgroundColor: notice.tone === 'error' ? 'var(--accent-rose-bg)' : 'var(--bg-elevated)',
            color: 'var(--text-main)',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <span>{notice.text}</span>
            {canKeepHeld && (
              <Button type="button" variant="secondary" size="sm" onClick={props.onKeepHeld} style={{ minHeight: TAP, alignSelf: 'flex-start' }}>
                {r.keepAnyway}
              </Button>
            )}
          </div>
        </div>
      )}

      {menuMany && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-amber-border)',
            backgroundColor: 'var(--accent-amber-bg)',
            color: 'var(--text-main)',
          }}
        >
          <strong style={{ fontSize: '15px' }}>{fill(r.menuMany, { n: menuMany.count })}</strong>
          <span style={{ ...mutedTextStyle, fontSize: '13px' }}>{r.menuManyHint}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Button type="button" variant="primary" onClick={() => props.onGoBulk(menuMany.response)} style={{ minHeight: 48 }}>
              {r.goBulk}
            </Button>
            {canKeepHeld && (
              <Button type="button" variant="ghost" onClick={props.onKeepHeld} style={{ minHeight: 48 }}>
                {r.keepAnyway}
              </Button>
            )}
          </div>
        </div>
      )}

      <ImageSourceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCamera={chooseCamera} onGallery={chooseGallery} />
    </div>
  );
};
