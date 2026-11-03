import React, { useRef, useState } from 'react';
import { ExternalLink, Image as ImageIcon, ImageOff, Search, Upload, X } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { uploadImportPhoto } from './api';
import { downscaleImage } from './imageResize';
import { choiceFromPhoto, safeHttpUrl } from './images';
import { fill } from './text';
import { TAP, mutedTextStyle } from './styles';
import type { ImageChoice } from './types';

const t = restoUz.bulkImport.images;

interface ImageCellProps {
  /** Taom nomi (rasmning alt matni). */
  name: string;
  value: ImageChoice | null;
  onChange: (next: ImageChoice | null) => void;
  /** "Rasm topish" bosildi: qidiruv paneli ochiladi (panelni egasi joylashtiradi). */
  onFind: () => void;
  findOpen: boolean;
  /** Taomning hozirgi (saqlangan) rasmi: tahrirlashda "Rasm yo'q" deb ko'rsatilmasin. */
  currentPreview?: string | null;
  /** "O'z rasmim" tugmasi (taom formasida fayl tanlash maydoni allaqachon bor, shuning uchun u yerda yopiladi). */
  allowOwn?: boolean;
}

/** Qatordagi rasm: kichik surat, manba yozuvi va "Rasm topish / O'z rasmim / Olib tashlash" tugmalari. */
export const ImageCell: React.FC<ImageCellProps> = ({
  name,
  value,
  onChange,
  onFind,
  findOpen,
  allowOwn = true,
  currentPreview = null,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      const small = await downscaleImage(file);
      const response = await uploadImportPhoto(small);
      onChange(choiceFromPhoto(response));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const source = value ? safeHttpUrl(value.sourceUrl) : '';
  const hasImage = value !== null || Boolean(currentPreview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            border: hasImage ? '1px solid var(--border-strong)' : '1px dashed var(--border-strong)',
            backgroundColor: 'var(--bg-elevated)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
          }}
        >
          {value?.previewUrl || (!value && currentPreview) ? (
            <img
              src={value?.previewUrl || currentPreview || ''}
              alt={name}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : value ? (
            <ImageIcon size={26} aria-label={t.attached} />
          ) : (
            <ImageOff size={24} aria-label={t.none} />
          )}
        </div>
        <div style={{ ...mutedTextStyle, fontSize: '12px', minWidth: 0, overflowWrap: 'anywhere' }}>
          {busy ? (
            t.uploading
          ) : !value ? (
            currentPreview ? t.current : t.none
          ) : value.fromInternet ? (
            <>
              <span>{fill(t.fromInternet, { credit: value.credit })}</span>
              {source && (
                <>
                  {' '}
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.sourceLinkAria}
                    style={{ color: 'var(--accent-amber)', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    <ExternalLink size={11} /> {t.sourceLink}
                  </a>
                </>
              )}
            </>
          ) : (
            t.ownPhoto
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Button
          type="button"
          variant={findOpen ? 'primary' : 'secondary'}
          size="sm"
          onClick={onFind}
          disabled={busy}
          icon={<Search size={15} />}
          style={{ minHeight: TAP }}
        >
          {hasImage ? t.change : t.find}
        </Button>
        {allowOwn && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              icon={<Upload size={15} />}
              style={{ minHeight: TAP }}
            >
              {t.own}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFailed(false);
              onChange(null);
            }}
            disabled={busy}
            icon={<X size={15} />}
            style={{ minHeight: TAP }}
          >
            {t.remove}
          </Button>
        )}
      </div>
      {failed && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)', fontSize: '12px' }}>
          {t.uploadFailed}
        </p>
      )}
    </div>
  );
};
