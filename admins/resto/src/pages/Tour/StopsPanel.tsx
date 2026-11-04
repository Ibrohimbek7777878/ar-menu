import React, { useId, useState } from 'react';
import { Button, t } from '@admins/shared';
import { Check, MapPin, Plus, Trash2, X } from 'lucide-react';
import { TITLE_MAX, confidencePercent, stopIndexAt } from './editModel';
import type { DraftIssue, KeyedStopSuggestion } from './editModel';
import { issueText } from './labels';
import { errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, listRowStyle, listStyle, rowStyle, sectionTitleStyle, suggestionRowStyle, tapButton } from './styles';
import { formatTime } from './time';
import type { DraftStop } from './types';
import { TimeField } from './ui';

interface Props {
  stops: DraftStop[];
  suggestions: KeyedStopSuggestion[];
  time: number;
  disabled: boolean;
  issues: DraftIssue[];
  onAdd: (title: string) => void;
  onUpdate: (key: string, patch: Partial<Pick<DraftStop, 'title' | 't'>>) => void;
  onRemove: (key: string) => void;
  onSeek: (seconds: number) => void;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
}

/** Nuqtalar (boblar): video bo'limlari. Mehmon ular orasida sakraydi. */
export const StopsPanel: React.FC<Props> = ({ stops, suggestions, time, disabled, issues, onAdd, onUpdate, onRemove, onSeek, onAccept, onReject }) => {
  const [title, setTitle] = useState('');
  const titleId = useId();
  const current = stopIndexAt(stops, time);
  const issueFor = (key: string) => issues.find((issue) => issue.kind === 'stop' && issue.key === key);

  const add = () => {
    onAdd(title);
    setTitle('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={sectionTitleStyle}>{t('Nuqtalar')}</h2>
        <p style={hintStyle}>{t("Nuqta — videoning bir bo'limi (masalan «Kirish», «Terrasa»). Mehmonlar nuqtalar orasida sakrab o'tadi.")}</p>
      </div>

      <div>
        <label htmlFor={titleId} style={labelStyle}>
          {t('Yangi nuqta nomi')}
        </label>
        <div style={rowStyle}>
          <input
            id={titleId}
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            disabled={disabled}
            placeholder={t('Masalan: Kirish')}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            style={{ ...inputStyle, flex: '1 1 160px', width: 'auto' }}
          />
          <Button onClick={add} disabled={disabled} style={tapButton} icon={<Plus size={18} aria-hidden="true" />}>
            {t("Nuqta qo'shish — hozirgi vaqtda")}
          </Button>
        </div>
        <p style={hintStyle}>{t('Hozirgi vaqt: {time}', { time: formatTime(time) })}</p>
      </div>

      {suggestions.length > 0 && (
        <ul aria-label={t('AI takliflari: nuqtalar')} style={listStyle}>
          {suggestions.map((suggestion) => {
            const percent = confidencePercent(suggestion.confidence);
            return (
              <li key={suggestion.key} style={suggestionRowStyle}>
                <div style={{ fontSize: 14, color: 'var(--text-main)' }}>
                  <strong>{t('Taklif')}</strong>: {formatTime(suggestion.t)} — {suggestion.title || t('Nomsiz nuqta')}
                  {percent !== null && <span style={{ color: 'var(--text-dim)' }}> ({t('ishonch {percent}%', { percent })})</span>}
                </div>
                <div style={rowStyle}>
                  <Button variant="secondary" style={tapButton} onClick={() => onSeek(suggestion.t)} icon={<MapPin size={16} aria-hidden="true" />}>
                    {t("O'tish")}
                  </Button>
                  <Button style={tapButton} disabled={disabled} onClick={() => onAccept(suggestion.key)} icon={<Check size={16} aria-hidden="true" />}>
                    {t('Qabul')}
                  </Button>
                  <Button variant="ghost" style={tapButton} onClick={() => onReject(suggestion.key)} icon={<X size={16} aria-hidden="true" />}>
                    {t('Rad')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {stops.length === 0 ? (
        <p style={{ ...hintStyle, margin: 0 }}>{t("Hali nuqta yo'q. Videoni kerakli joyda to'xtatib, nom yozing va «Nuqta qo'shish» ni bosing.")}</p>
      ) : (
        <ul aria-label={t("Nuqtalar ro'yxati")} style={listStyle}>
          {stops.map((stop, index) => {
            const issue = issueFor(stop.key);
            const message = issue ? issueText(issue) : '';
            return (
              <li key={stop.key} style={listRowStyle(false, index === current)}>
                <div style={{ ...rowStyle, flexWrap: 'nowrap' }}>
                  <span aria-hidden="true" style={{ minWidth: 22, fontWeight: 700, color: 'var(--text-dim)' }}>
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    aria-label={t('Nuqta nomi')}
                    aria-invalid={message && (issue?.code === 'title_empty' || issue?.code === 'title_long') ? true : undefined}
                    value={stop.title}
                    maxLength={TITLE_MAX}
                    disabled={disabled}
                    onChange={(event) => onUpdate(stop.key, { title: event.target.value })}
                    style={{ ...inputStyle, flex: 1, minWidth: 0, ...(message && (issue?.code === 'title_empty' || issue?.code === 'title_long') ? inputErrorStyle : null) }}
                  />
                </div>
                <div style={{ ...rowStyle, alignItems: 'flex-end' }}>
                  <div style={{ width: 130 }}>
                    <TimeField label={t('Vaqti')} value={stop.t} disabled={disabled} onCommit={(seconds) => onUpdate(stop.key, { t: seconds })} />
                  </div>
                  <Button variant="secondary" style={tapButton} onClick={() => onSeek(stop.t)} icon={<MapPin size={16} aria-hidden="true" />}>
                    {t("Shu nuqtaga o'tish")}
                  </Button>
                  <Button variant="ghost" style={tapButton} disabled={disabled} onClick={() => onRemove(stop.key)} aria-label={t("Nuqtani o'chirish")} icon={<Trash2 size={16} aria-hidden="true" />}>
                    {t("O'chirish")}
                  </Button>
                </div>
                {message && (
                  <p role="alert" style={errorTextStyle}>
                    {message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
