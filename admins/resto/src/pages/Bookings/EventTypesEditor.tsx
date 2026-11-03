import React from 'react';
import { t } from '@admins/shared';
import { Lock } from 'lucide-react';
import { AddRow, NameTranslations, RowActions } from './SettingsParts';
import {
  LIMITS,
  addEventType,
  canAddEventType,
  canRemoveEventType,
  moveEventType,
  removeEventType,
  renameEventType,
  setEventTypeTranslation,
} from './settingsModel';
import { badgeStyle, hintStyle, innerCardStyle, errorTextStyle } from './styles';
import type { BookingConfig } from './types';
import { TextField } from './ui';

interface Props {
  config: BookingConfig;
  messageFor: (path: string) => string | undefined;
  commit: (next: BookingConfig) => void;
}

/** Tadbir turlari: qo'shish, nomini o'zgartirish, tartibini surish, o'chirish. "Yo'q" (none) turi olib tashlanmaydi. */
export const EventTypesEditor: React.FC<Props> = ({ config, messageFor, commit }) => {
  const rootError = messageFor('event_types');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {config.event_types.map((type, index) => {
        const removable = canRemoveEventType(type);
        return (
          <div key={type.key} style={innerCardStyle}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <TextField
                  label={t('Tadbir turi nomi')}
                  value={type.label}
                  maxLength={LIMITS.labelLength}
                  autoComplete="off"
                  onChange={(e) => commit(renameEventType(config, index, e.target.value))}
                  error={messageFor(`event_types[${index}].label`) ?? messageFor(`event_types[${index}].key`)}
                />
              </div>
              <div style={{ paddingTop: '20px' }}>
                <RowActions
                  index={index}
                  count={config.event_types.length}
                  onMove={(delta) => commit(moveEventType(config, index, delta))}
                  onRemove={removable ? () => commit(removeEventType(config, index)) : undefined}
                  moveUpLabel={t('Tadbir turini yuqoriga surish')}
                  moveDownLabel={t('Tadbir turini pastga surish')}
                  removeLabel={t('Tadbir turini olib tashlash')}
                />
              </div>
            </div>
            {!removable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={badgeStyle('neutral')}>
                  <Lock size={12} aria-hidden="true" />
                  {t('Asosiy tanlov')}
                </span>
                <span style={{ ...hintStyle, margin: 0 }}>{t("Mehmon tadbirsiz bron qilishi uchun kerak: olib tashlab bo'lmaydi, faqat nomini o'zgartirish mumkin.")}</span>
              </div>
            )}
            <NameTranslations
              ru={type.label_ru ?? ''}
              en={type.label_en ?? ''}
              onChange={(lang, value) => commit(setEventTypeTranslation(config, index, lang, value))}
              ruError={messageFor(`event_types[${index}].label_ru`)}
              enError={messageFor(`event_types[${index}].label_en`)}
            />
          </div>
        );
      })}
      {rootError && (
        <p role="alert" style={errorTextStyle}>
          {rootError}
        </p>
      )}
      <AddRow
        label={t("Yangi tadbir turi qo'shish")}
        placeholder={t('Masalan: Bolalar bayrami')}
        buttonLabel={t("Qo'shish")}
        disabled={!canAddEventType(config)}
        onAdd={(label) => commit(addEventType(config, label))}
        hint={!canAddEventType(config) ? t("Tadbir turlari {max} tadan oshmasin.", { max: LIMITS.eventTypes }) : undefined}
      />
    </div>
  );
};
