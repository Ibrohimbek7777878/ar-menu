import React, { useId, useRef, useState } from 'react';
import { Button, t } from '@admins/shared';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { checkImageFile } from './logoFile';
import { fileProblemText } from './labels';
import { ImageDecodeError, resizeBrandImage } from './logoResize';
import { errorTextStyle, hintStyle, labelStyle, tapButton } from './styles';
import type { ImageKind } from './types';
import type { ActionResult } from './useBrand';
import { readFailure } from '../Bookings/errors';

interface Props {
  kind: ImageKind;
  label: string;
  hint: string;
  url: string | null;
  disabled?: boolean;
  onUpload: (kind: ImageKind, file: File) => Promise<ActionResult<string | null>>;
  onRemove: (kind: ImageKind) => Promise<ActionResult>;
  onNotify: (message: string, tone: 'success' | 'error') => void;
}

/**
 * Logotip/favicon: katta ko'rinish maydoni, "Rasm tanlash" (telefonda kamera yoki galereya) va "Olib tashlash".
 * Fayl yuklashdan oldin brauzerda kichraytiriladi (logotip 512 px, favicon 256 px); rasm darrov saqlanadi (alohida so'rov),
 * "Saqlash" paneliga bog'liq emas.
 */
export const LogoField: React.FC<Props> = ({ kind, label, hint, url, disabled = false, onUpload, onRemove, onNotify }) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [problem, setProblem] = useState('');
  const [broken, setBroken] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProblem('');
    const fileProblem = checkImageFile(file);
    if (fileProblem) {
      setProblem(fileProblemText(fileProblem));
      return;
    }
    setBusy('upload');
    try {
      let prepared: File;
      try {
        prepared = await resizeBrandImage(file, kind);
      } catch (err: unknown) {
        setProblem(err instanceof ImageDecodeError ? t("Rasmni ochib bo'lmadi. PNG yoki JPG tanlang.") : t("Rasmni tayyorlab bo'lmadi. Boshqa rasm tanlang."));
        return;
      }
      const result = await onUpload(kind, prepared);
      if (result.status === 'done') {
        setBroken(false);
        onNotify(kind === 'logo' ? t('Logotip yuklandi') : t('Favicon yuklandi'), 'success');
      } else {
        const failure = result.failure;
        setProblem(failure.forbidden ? t("Rasm yuklashga ruxsatingiz yo'q") : failure.message ? t(failure.message) : t("Yuklab bo'lmadi. Qayta urinib ko'ring."));
      }
    } finally {
      setBusy(null);
      // Bir xil fayl qayta tanlansa ham o'zgarish hodisasi kelishi uchun
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setProblem('');
    setBusy('remove');
    try {
      const result = await onRemove(kind);
      if (result.status === 'done') onNotify(kind === 'logo' ? t('Logotip olib tashlandi') : t('Favicon olib tashlandi'), 'success');
      else setProblem(result.failure.message ? t(result.failure.message) : t("Olib tashlab bo'lmadi. Qayta urinib ko'ring."));
    } catch (err: unknown) {
      setProblem(readFailure(err).message || t("Olib tashlab bo'lmadi. Qayta urinib ko'ring."));
    } finally {
      setBusy(null);
    }
  };

  const square = kind === 'favicon';
  const showImage = Boolean(url) && !broken;
  return (
    <div role="group" aria-labelledby={`${inputId}-label`}>
      <div id={`${inputId}-label`} style={labelStyle}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div
          aria-busy={busy === 'upload' || undefined}
          style={{
            width: square ? 96 : 'min(100%, 220px)',
            height: square ? 96 : 140,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: `1px ${showImage ? 'solid' : 'dashed'} var(--border-strong)`,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-dim)',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {showImage ? (
            <img
              src={url as string}
              alt={label}
              onError={() => setBroken(true)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: busy ? 0.5 : 1 }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px', textAlign: 'center', fontSize: '13px' }}>
              <ImagePlus size={28} aria-hidden="true" />
              <span>{url && broken ? t("Rasm ochilmadi") : t('Rasm tanlanmagan')}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, flex: '1 1 180px' }}>
          <input ref={inputRef} id={inputId} type="file" accept="image/*" disabled={disabled || busy !== null} onChange={(event) => void pick(event.target.files?.[0])} style={{ display: 'none' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={disabled || busy !== null} loading={busy === 'upload'} style={tapButton}>
              <Upload size={18} aria-hidden="true" />
              {url ? t('Rasmni almashtirish') : t('Rasm tanlash')}
            </Button>
            {url && (
              <Button variant="ghost" onClick={() => void remove()} disabled={disabled || busy !== null} loading={busy === 'remove'} style={tapButton}>
                <Trash2 size={18} aria-hidden="true" />
                {t('Olib tashlash')}
              </Button>
            )}
          </div>
          <p style={hintStyle}>{hint}</p>
          {problem && (
            <p role="alert" style={errorTextStyle}>
              {problem}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
