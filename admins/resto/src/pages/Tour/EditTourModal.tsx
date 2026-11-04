import React, { useState } from 'react';
import { Button, Modal, t } from '@admins/shared';
import { TITLE_MAX } from './editModel';
import { errorTextStyle, hintStyle, inputStyle, labelStyle, tapButton } from './styles';
import type { HallOption } from './types';
import { ModalBody, TextField } from './ui';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initialTitle: string;
  initialHallId: number | null;
  halls: HallOption[];
  busy: boolean;
  /** Server xabari (nom band, ruxsat yo'q ...) */
  error: string;
  onClose: () => void;
  onSubmit: (title: string, hallId: number | null) => void;
}

/** "Yangi sayr" va "Nom va zal" oynasi. Zal ixtiyoriy: tanlanmasa sayr butun restoranga tegishli. */
export const EditTourModal: React.FC<Props> = ({ open, mode, initialTitle, initialHallId, halls, busy, error, onClose, onSubmit }) => {
  const [title, setTitle] = useState(initialTitle);
  const [hallId, setHallId] = useState<number | null>(initialHallId);
  const [touched, setTouched] = useState(false);
  const trimmed = title.trim();
  const problem = trimmed === '' ? t('Sayr nomini yozing.') : trimmed.length > TITLE_MAX ? t('Nom juda uzun ({max} belgigacha).', { max: TITLE_MAX }) : '';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem) return;
    onSubmit(trimmed, hallId);
  };

  return (
    <Modal isOpen={open} onClose={busy ? () => undefined : onClose} title={mode === 'create' ? t('Yangi sayr') : t('Nom va zal')} maxWidth="460px">
      <ModalBody>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <TextField
            label={t('Sayr nomi')}
            value={title}
            maxLength={TITLE_MAX + 20}
            autoFocus
            placeholder={t('Masalan: Asosiy zal')}
            error={touched ? problem : ''}
            onChange={(event) => setTitle(event.target.value)}
          />
          {halls.length > 0 && (
            <div>
              <label htmlFor="tour-hall" style={labelStyle}>
                {t('Qaysi zal uchun?')}
              </label>
              <select id="tour-hall" value={hallId === null ? '' : String(hallId)} onChange={(event) => setHallId(event.target.value === '' ? null : Number(event.target.value))} style={inputStyle}>
                <option value="">{t('Butun restoran')}</option>
                {halls.map((hall) => (
                  <option key={hall.id} value={String(hall.id)}>
                    {hall.name}
                  </option>
                ))}
              </select>
              <p style={hintStyle}>{t("Bitta zalda bitta sayr e'lon qilinadi. Zalni tanlasangiz, faqat shu zal stollariga belgi qo'yasiz.")}</p>
            </div>
          )}
          {error && (
            <p role="alert" style={errorTextStyle}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" style={tapButton} onClick={onClose} disabled={busy}>
              {t('Bekor qilish')}
            </Button>
            <Button type="submit" style={tapButton} loading={busy}>
              {mode === 'create' ? t('Yaratish') : t('Saqlash')}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
};
