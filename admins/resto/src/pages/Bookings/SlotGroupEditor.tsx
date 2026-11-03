import React, { useId, useState } from 'react';
import { Button, t } from '@admins/shared';
import { Plus, X } from 'lucide-react';
import { generateErrorText } from './labels';
import { NameTranslations, RowActions } from './SettingsParts';
import {
  LIMITS,
  addGeneratedTimes,
  addSlotTime,
  moveSlotGroup,
  removeSlotTime,
  renameSlotGroup,
  setSlotGroupTranslation,
} from './settingsModel';
import { TAP, errorTextStyle, hintStyle, innerCardStyle, inputStyle, labelStyle, tapButton, toggleChipStyle } from './styles';
import { STEP_OPTIONS } from './time';
import type { BookingConfig } from './types';
import { TextField } from './ui';

interface Props {
  config: BookingConfig;
  index: number;
  /** Shu yo'ldagi xato matni (`slots[1].times[0]` …) yoki undefined */
  messageFor: (path: string) => string | undefined;
  commit: (next: BookingConfig) => void;
  /** Vaqti bor guruhni olib tashlashdan oldin tasdiq so'rash */
  onRequestRemove: (index: number) => void;
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

const summaryStyle: React.CSSProperties = { minHeight: TAP, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: '14px' };

/** Bitta vaqt guruhi ("Tushlik"): nomi, tarjimalari, vaqtlar chiplari va vaqt qo'shish (bittalab yoki "har N daqiqada"). */
export const SlotGroupEditor: React.FC<Props> = ({ config, index, messageFor, commit, onRequestRemove }) => {
  const group = config.slots[index];
  const uid = useId();
  const [newTime, setNewTime] = useState('');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('15:00');
  const [step, setStep] = useState<number>(30);
  const [feedback, setFeedback] = useState<Feedback>(null);
  if (!group) return null;

  const addOne = () => {
    const result = addSlotTime(config, index, newTime);
    if (result.status === 'added') {
      commit(result.config);
      setNewTime('');
      setFeedback(null);
    } else {
      setFeedback({
        tone: 'error',
        text:
          result.status === 'duplicate'
            ? t('Bu vaqt allaqachon bor.')
            : result.status === 'full'
              ? generateErrorText('full')
              : t('Avval vaqtni tanlang.'),
      });
    }
  };

  const generate = () => {
    const result = addGeneratedTimes(config, index, start, end, step);
    if (!result.ok) {
      setFeedback({ tone: 'error', text: generateErrorText(result.error) });
      return;
    }
    commit(result.config);
    setFeedback({
      tone: 'ok',
      text: result.added === 0 ? t("Yangi vaqt qo'shilmadi: hammasi allaqachon bor.") : t("{n} ta vaqt qo'shildi.", { n: result.added }),
    });
  };

  const timesError = messageFor(`slots[${index}].times`);
  const labelError = messageFor(`slots[${index}].label`);
  const keyError = messageFor(`slots[${index}].key`);

  return (
    <div style={innerCardStyle}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <TextField
            label={t('Guruh nomi')}
            value={group.label}
            maxLength={LIMITS.labelLength}
            autoComplete="off"
            onChange={(e) => commit(renameSlotGroup(config, index, e.target.value))}
            error={labelError ?? keyError}
          />
        </div>
        <div style={{ paddingTop: '20px' }}>
          <RowActions
            index={index}
            count={config.slots.length}
            onMove={(delta) => commit(moveSlotGroup(config, index, delta))}
            onRemove={() => onRequestRemove(index)}
            moveUpLabel={t('Guruhni yuqoriga surish')}
            moveDownLabel={t('Guruhni pastga surish')}
            removeLabel={t('Guruhni olib tashlash')}
          />
        </div>
      </div>

      <NameTranslations
        ru={group.label_ru ?? ''}
        en={group.label_en ?? ''}
        onChange={(lang, value) => commit(setSlotGroupTranslation(config, index, lang, value))}
        ruError={messageFor(`slots[${index}].label_ru`)}
        enError={messageFor(`slots[${index}].label_en`)}
      />

      {/* Vaqtlar */}
      <div>
        <div style={labelStyle}>{t('Vaqtlar')}</div>
        {group.times.length === 0 ? (
          <p style={{ ...hintStyle, margin: 0 }}>{t("Hozircha vaqt yo'q. Pastdan qo'shing.")}</p>
        ) : (
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
            {group.times.map((time, j) => {
              const bad = messageFor(`slots[${index}].times[${j}]`);
              return (
                <li key={`${time}-${j}`}>
                  <button
                    type="button"
                    onClick={() => commit(removeSlotTime(config, index, time))}
                    aria-label={t('{time} vaqtini olib tashlash', { time })}
                    title={bad ?? t('Olib tashlash')}
                    style={toggleChipStyle(false, { fontVariantNumeric: 'lining-nums', ...(bad ? { borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' } : null) })}
                  >
                    {time}
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {timesError && (
          <p role="alert" style={errorTextStyle}>
            {timesError}
          </p>
        )}
        {group.times.map((_, j) => {
          const bad = messageFor(`slots[${index}].times[${j}]`);
          return bad ? (
            <p key={j} role="alert" style={errorTextStyle}>
              {group.times[j]}: {bad}
            </p>
          ) : null;
        })}
      </div>

      {/* Vaqt qo'shish: bittalab */}
      <div>
        <label htmlFor={`${uid}-time`} style={labelStyle}>
          {t("Vaqt qo'shish")}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input id={`${uid}-time`} type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }} />
          <Button type="button" variant="secondary" onClick={addOne} style={tapButton}>
            <Plus size={18} aria-hidden="true" />
            {t("Qo'shish")}
          </Button>
        </div>
      </div>

      {/* Vaqt qo'shish: har N daqiqada */}
      <details>
        <summary style={summaryStyle}>{t("Har bir necha daqiqada vaqt qo'shish")}</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', paddingTop: '4px' }}>
          <div>
            <label htmlFor={`${uid}-from`} style={labelStyle}>
              {t('Boshlanishi')}
            </label>
            <input id={`${uid}-from`} type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 130 }} />
          </div>
          <div>
            <label htmlFor={`${uid}-to`} style={labelStyle}>
              {t('Tugashi')}
            </label>
            <input id={`${uid}-to`} type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 130 }} />
          </div>
          <div>
            <label htmlFor={`${uid}-step`} style={labelStyle}>
              {t('Har necha daqiqada')}
            </label>
            <select id={`${uid}-step`} value={step} onChange={(e) => setStep(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', minWidth: 110 }}>
              {STEP_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t('{n} daqiqa', { n: minutes })}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={generate} style={tapButton}>
            {t("Vaqtlarni qo'shish")}
          </Button>
        </div>
      </details>

      {feedback && (
        <p role={feedback.tone === 'error' ? 'alert' : 'status'} style={feedback.tone === 'error' ? errorTextStyle : { ...hintStyle, color: 'var(--accent-emerald)' }}>
          {feedback.text}
        </p>
      )}
    </div>
  );
};

