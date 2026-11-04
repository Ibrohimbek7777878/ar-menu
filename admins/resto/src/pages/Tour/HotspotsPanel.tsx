import React, { useId, useState } from 'react';
import { Button, t } from '@admins/shared';
import { Check, Crosshair, MapPin, Plus, Trash2, X } from 'lucide-react';
import { LABEL_MAX, confidencePercent } from './editModel';
import type { Coverage, DraftIssue, KeyedHotspotSuggestion } from './editModel';
import { issueText } from './labels';
import { isVisibleAt, nudgeBound, setBound, withLength } from './ranges';
import {
  errorTextStyle,
  hintStyle,
  innerCardStyle,
  inputStyle,
  labelStyle,
  listRowStyle,
  listStyle,
  rowStyle,
  sectionTitleStyle,
  suggestionRowStyle,
  tableColor,
  tapButton,
} from './styles';
import { TableSelect, tableOptionLabel } from './TableSelect';
import { formatTime } from './time';
import type { DraftHotspot, TableOption } from './types';
import { Chip, Notice, TimeField } from './ui';

interface Props {
  hotspots: DraftHotspot[];
  /** Tanlash ro'yxati (sayr zalga biriktirilgan bo'lsa shu zal stollari) */
  tables: TableOption[];
  tablesFailed: boolean;
  coverage: Coverage;
  selected: DraftHotspot | null;
  suggestions: KeyedHotspotSuggestion[];
  selectedSuggestion: KeyedHotspotSuggestion | null;
  time: number;
  duration: number;
  disabled: boolean;
  relocating: boolean;
  issues: DraftIssue[];
  /** "Saqlash" bosilgan: stol tanlanmagan belgi xato sifatida ko'rsatiladi */
  submitted: boolean;
  tableNumberOf: (hotspot: DraftHotspot) => string;
  onSelect: (key: string | null) => void;
  onUpdate: (key: string, patch: Partial<Omit<DraftHotspot, 'key' | 'id'>>) => void;
  onRemove: (key: string) => void;
  onSeek: (seconds: number) => void;
  onToggleRelocate: () => void;
  onAddCenter: () => void;
  onSelectSuggestion: (key: string | null) => void;
  onAcceptSuggestion: (key: string, tableId: number | null) => void;
  onRejectSuggestion: (key: string) => void;
}

const LENGTH_CHIPS = [2, 4, 6];

export const HotspotsPanel: React.FC<Props> = (props) => {
  const {
    hotspots, tables, tablesFailed, coverage, selected, suggestions, selectedSuggestion, time, duration, disabled, relocating, issues, submitted, tableNumberOf,
    onSelect, onUpdate, onRemove, onSeek, onToggleRelocate, onAddCenter, onSelectSuggestion, onAcceptSuggestion, onRejectSuggestion,
  } = props;

  const tableName = (hotspot: DraftHotspot): string => {
    const number = tableNumberOf(hotspot);
    return number ? t('{number}-stol', { number }) : t('Stol tanlanmagan');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={sectionTitleStyle}>{t('Belgilar (stollar)')}</h2>
        <p style={hintStyle}>{t("Videoni kerakli kadrda to'xtating va stol ustiga bosing: belgi qo'yiladi. Mehmon shu belgiga bosib stolni bron qiladi.")}</p>
      </div>

      {tablesFailed && <Notice tone="warn">{t("Stollar ro'yxatini yuklab bo'lmadi yoki ko'rishga ruxsatingiz yo'q. Stol tanlash ishlamaydi.")}</Notice>}
      {!tablesFailed && tables.length === 0 && <Notice tone="warn">{t("Stollar topilmadi. Avval «Stollar & QR» bo'limida stol qo'shing.")}</Notice>}

      <div style={rowStyle}>
        <Button variant="secondary" style={tapButton} disabled={disabled} onClick={onAddCenter} icon={<Plus size={18} aria-hidden="true" />}>
          {t("Belgi qo'yish (kadr o'rtasiga)")}
        </Button>
      </div>

      {selectedSuggestion && (
        <SuggestionCard
          suggestion={selectedSuggestion}
          tables={tables}
          disabled={disabled}
          onSeek={onSeek}
          onClose={() => onSelectSuggestion(null)}
          onAccept={onAcceptSuggestion}
          onReject={onRejectSuggestion}
        />
      )}

      {selected && (
        <HotspotEditor
          hotspot={selected}
          tables={tables}
          time={time}
          duration={duration}
          disabled={disabled}
          relocating={relocating}
          issues={issues}
          submitted={submitted}
          tableName={tableName(selected)}
          fallbackTableLabel={tableNumberOf(selected) ? t('{number}-stol', { number: tableNumberOf(selected) }) : ''}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onSeek={onSeek}
          onToggleRelocate={onToggleRelocate}
          onClose={() => onSelect(null)}
        />
      )}

      {suggestions.length > 0 && (
        <ul aria-label={t('AI takliflari: belgilar')} style={listStyle}>
          {suggestions.map((suggestion) => {
            const percent = confidencePercent(suggestion.confidence);
            return (
              <li key={suggestion.key} style={suggestionRowStyle}>
                <div style={{ fontSize: 14, color: 'var(--text-main)' }}>
                  <strong>{t('Taklif')}</strong>: {formatTime(suggestion.t)} — {suggestion.label || t('stol')}
                  {percent !== null && <span style={{ color: 'var(--text-dim)' }}> ({t('ishonch {percent}%', { percent })})</span>}
                </div>
                <div style={rowStyle}>
                  <Button variant="secondary" style={tapButton} onClick={() => { onSeek(suggestion.t); onSelectSuggestion(suggestion.key); }} icon={<MapPin size={16} aria-hidden="true" />}>
                    {t("Ko'rish")}
                  </Button>
                  <Button variant="ghost" style={tapButton} onClick={() => onRejectSuggestion(suggestion.key)} icon={<X size={16} aria-hidden="true" />}>
                    {t('Rad')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hotspots.length === 0 ? (
        <p style={{ ...hintStyle, margin: 0 }}>{t("Hali belgi yo'q. Videoni to'xtatib, stol ustiga bosing.")}</p>
      ) : (
        <ul aria-label={t("Belgilar ro'yxati")} style={listStyle}>
          {hotspots.map((hotspot) => {
            const isSelected = selected?.key === hotspot.key;
            const problem = issues.find((issue) => issue.kind === 'hotspot' && issue.key === hotspot.key);
            const now = isVisibleAt(hotspot, time);
            return (
              <li key={hotspot.key} style={listRowStyle(isSelected, now)}>
                <button
                  type="button"
                  onClick={() => onSelect(isSelected ? null : hotspot.key)}
                  aria-expanded={isSelected}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 44,
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-main)',
                    fontSize: 15,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true" style={{ width: 12, height: 12, flexShrink: 0, borderRadius: '50%', backgroundColor: tableColor(hotspot.table_id) }} />
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <strong>{tableName(hotspot)}</strong>
                    {hotspot.label ? ` · ${hotspot.label}` : ''}
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {' '}
                      · {formatTime(hotspot.t_start)} – {formatTime(hotspot.t_end)}
                    </span>
                  </span>
                </button>
                {problem && !(problem.code === 'table_missing' && !submitted && !isSelected) && (
                  <p style={errorTextStyle}>{issueText(problem)}</p>
                )}
                <div style={rowStyle}>
                  <Button variant="secondary" style={tapButton} onClick={() => { onSelect(hotspot.key); onSeek(hotspot.t_start); }} icon={<MapPin size={16} aria-hidden="true" />}>
                    {t("O'tish")}
                  </Button>
                  <Button variant="ghost" style={tapButton} disabled={disabled} onClick={() => onRemove(hotspot.key)} aria-label={t("Belgini o'chirish")} icon={<Trash2 size={16} aria-hidden="true" />}>
                    {t("O'chirish")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CoverageLine coverage={coverage} />
    </div>
  );
};

/** "12 ta stoldan 9 tasiga belgi qo'yildi" + ulanmagan stollar */
export const CoverageLine: React.FC<{ coverage: Coverage }> = ({ coverage }) => {
  if (coverage.total === 0) return null;
  return (
    <div style={{ ...innerCardStyle, gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{t("Belgi qo'yilgan stollar: {linked} / {total}", { linked: coverage.linked, total: coverage.total })}</div>
      {coverage.unlinked.length > 0 ? (
        <div>
          <p style={{ ...hintStyle, margin: '0 0 6px 0' }}>{t("Belgisi yo'q stollar:")}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {coverage.unlinked.slice(0, 40).map((table) => (
              <span
                key={table.id}
                title={tableOptionLabel(table)}
                style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--accent-amber-border)', backgroundColor: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', fontSize: 13, fontWeight: 600 }}
              >
                {table.number}
              </span>
            ))}
            {coverage.unlinked.length > 40 && <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>…</span>}
          </div>
        </div>
      ) : (
        <p style={{ ...hintStyle, margin: 0 }}>{t("Hamma stollarga belgi qo'yilgan.")}</p>
      )}
      {coverage.orphans > 0 && <p style={{ ...hintStyle, margin: 0 }}>{t("Ro'yxatda yo'q stolga qo'yilgan belgilar: {n} (stol arxivlangan yoki boshqa zalniki bo'lishi mumkin).", { n: coverage.orphans })}</p>}
    </div>
  );
};

interface EditorProps {
  hotspot: DraftHotspot;
  tables: TableOption[];
  time: number;
  duration: number;
  disabled: boolean;
  relocating: boolean;
  issues: DraftIssue[];
  submitted: boolean;
  tableName: string;
  fallbackTableLabel: string;
  onUpdate: Props['onUpdate'];
  onRemove: Props['onRemove'];
  onSeek: Props['onSeek'];
  onToggleRelocate: () => void;
  onClose: () => void;
}

const RANGE_CODES = new Set(['invalid', 'negative', 'order', 'beyond']);

const HotspotEditor: React.FC<EditorProps> = ({ hotspot, tables, time, duration, disabled, relocating, issues, submitted, tableName, fallbackTableLabel, onUpdate, onRemove, onSeek, onToggleRelocate, onClose }) => {
  const labelId = useId();
  const mine = issues.filter((issue) => issue.kind === 'hotspot' && issue.key === hotspot.key);
  const tableIssue = mine.find((issue) => issue.code === 'table_missing');
  const rangeIssue = mine.find((issue) => RANGE_CODES.has(issue.code));
  const otherIssue = mine.find((issue) => issue.code === 'position_invalid' || issue.code === 'label_long');
  const range = { t_start: hotspot.t_start, t_end: hotspot.t_end };
  const patchRange = (next: { t_start: number; t_end: number }) => onUpdate(hotspot.key, next);
  const visibleNow = isVisibleAt(hotspot, time);

  return (
    <div style={{ ...innerCardStyle, borderColor: 'var(--brand)' }} aria-label={t('Tanlangan belgi: {name}', { name: tableName })} role="group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{t('Tanlangan belgi: {name}', { name: tableName })}</h3>
        <Button variant="ghost" style={tapButton} onClick={onClose} aria-label={t('Yopish')} icon={<X size={18} aria-hidden="true" />} />
      </div>

      {!visibleNow && (
        <Notice tone="info">
          <span>{t("Bu belgi hozirgi kadrda ko'rinmaydi.")} </span>
          <button type="button" onClick={() => onSeek(hotspot.t_start)} style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            {t("Belgiga o'tish")}
          </button>
        </Notice>
      )}

      <TableSelect
        label={t('Stol')}
        tables={tables}
        value={hotspot.table_id}
        fallbackLabel={fallbackTableLabel}
        disabled={disabled}
        onChange={(tableId) => onUpdate(hotspot.key, { table_id: tableId })}
        error={tableIssue && (submitted || hotspot.table_id !== null) ? issueText(tableIssue) : undefined}
        hint={hotspot.table_id === null ? t('Mehmon shu belgiga bosganda shu stol bron qilinadi.') : undefined}
      />

      <div>
        <label htmlFor={labelId} style={labelStyle}>
          {t('Yorliq (ixtiyoriy)')}
        </label>
        <input
          id={labelId}
          type="text"
          value={hotspot.label}
          maxLength={LABEL_MAX}
          disabled={disabled}
          placeholder={t('Masalan: Deraza yonida')}
          onChange={(event) => onUpdate(hotspot.key, { label: event.target.value })}
          style={inputStyle}
        />
      </div>

      <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }} disabled={disabled}>
        <legend style={{ ...labelStyle, padding: 0 }}>{t("Belgi ko'rinadigan vaqt")}</legend>
        <p style={{ ...hintStyle, margin: '0 0 8px 0' }}>{t("Videoning shu oralig'ida belgi kadrda turadi.")}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TimeField label={t('Boshlanishi')} value={hotspot.t_start} disabled={disabled} onCommit={(seconds) => patchRange(setBound(range, 'start', seconds, duration))} />
            <div style={rowStyle}>
              <Chip onClick={() => patchRange(nudgeBound(range, 'start', -0.5, duration))} aria-label={t('Boshlanishni 0,5 soniya erta qilish')}>−0.5</Chip>
              <Chip onClick={() => patchRange(nudgeBound(range, 'start', 0.5, duration))} aria-label={t('Boshlanishni 0,5 soniya kech qilish')}>+0.5</Chip>
            </div>
            <Chip onClick={() => patchRange(setBound(range, 'start', time, duration))}>{t('Boshlanish = hozirgi vaqt')}</Chip>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TimeField label={t('Tugashi')} value={hotspot.t_end} disabled={disabled} onCommit={(seconds) => patchRange(setBound(range, 'end', seconds, duration))} />
            <div style={rowStyle}>
              <Chip onClick={() => patchRange(nudgeBound(range, 'end', -0.5, duration))} aria-label={t('Tugashni 0,5 soniya erta qilish')}>−0.5</Chip>
              <Chip onClick={() => patchRange(nudgeBound(range, 'end', 0.5, duration))} aria-label={t('Tugashni 0,5 soniya kech qilish')}>+0.5</Chip>
            </div>
            <Chip onClick={() => patchRange(setBound(range, 'end', time, duration))}>{t('Tugash = hozirgi vaqt')}</Chip>
          </div>
        </div>
        <div style={{ ...rowStyle, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('Davomiyligi:')}</span>
          {LENGTH_CHIPS.map((seconds) => (
            <Chip key={seconds} active={Math.abs(hotspot.t_end - hotspot.t_start - seconds) < 0.05} onClick={() => patchRange(withLength(range, seconds, duration))}>
              {t('{n} s', { n: seconds })}
            </Chip>
          ))}
        </div>
        {rangeIssue && (
          <p role="alert" style={errorTextStyle}>
            {issueText(rangeIssue)}
          </p>
        )}
      </fieldset>

      <div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          {t('Joyi: kadrning {x}% / {y}%', { x: Math.round(hotspot.x * 100), y: Math.round(hotspot.y * 100) })}
        </div>
        <div style={rowStyle}>
          <Button variant={relocating ? 'primary' : 'secondary'} style={tapButton} disabled={disabled} onClick={onToggleRelocate} aria-pressed={relocating} icon={<Crosshair size={16} aria-hidden="true" />}>
            {relocating ? t('Kadrga bosing…') : t("Joyini o'zgartirish")}
          </Button>
        </div>
        <p style={hintStyle}>{t('Belgini video ustida sudrashingiz ham mumkin (klaviatura: strelkalar).')}</p>
        {otherIssue && (
          <p role="alert" style={errorTextStyle}>
            {issueText(otherIssue)}
          </p>
        )}
      </div>

      <div style={rowStyle}>
        <Button variant="secondary" style={tapButton} onClick={() => onSeek(hotspot.t_start)} icon={<MapPin size={16} aria-hidden="true" />}>
          {t("Belgiga o'tish")}
        </Button>
        <Button variant="danger" style={tapButton} disabled={disabled} onClick={() => onRemove(hotspot.key)} icon={<Trash2 size={16} aria-hidden="true" />}>
          {t("Belgini o'chirish")}
        </Button>
      </div>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: KeyedHotspotSuggestion;
  tables: TableOption[];
  disabled: boolean;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  onAccept: (key: string, tableId: number | null) => void;
  onReject: (key: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, tables, disabled, onSeek, onClose, onAccept, onReject }) => {
  const [choice, setChoice] = useState<{ key: string; tableId: number | null }>({ key: suggestion.key, tableId: null });
  const tableId = choice.key === suggestion.key ? choice.tableId : null;
  const percent = confidencePercent(suggestion.confidence);
  return (
    <div style={{ ...innerCardStyle, borderStyle: 'dashed', borderColor: 'var(--brand)' }} role="group" aria-label={t('AI taklifi')}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 15, color: 'var(--text-main)' }}>
          <strong>{t('Taklif')}</strong>: {suggestion.label || t('stol')}
          {percent !== null && <span style={{ color: 'var(--text-dim)' }}> ({t('ishonch {percent}%', { percent })})</span>}
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatTime(suggestion.t)}</div>
        </div>
        <Button variant="ghost" style={tapButton} onClick={onClose} aria-label={t('Yopish')} icon={<X size={18} aria-hidden="true" />} />
      </div>
      <p style={{ ...hintStyle, margin: 0 }}>{t("AI stollarni topadi, lekin raqamini siz ko'rsatasiz. Stolni tanlang va qabul qiling.")}</p>
      <TableSelect label={t('Qaysi stol?')} tables={tables} value={tableId} disabled={disabled} onChange={(next) => setChoice({ key: suggestion.key, tableId: next })} />
      <div style={rowStyle}>
        <Button style={tapButton} disabled={disabled || tableId === null} onClick={() => onAccept(suggestion.key, tableId)} icon={<Check size={16} aria-hidden="true" />}>
          {t('Qabul qilish')}
        </Button>
        <Button variant="secondary" style={tapButton} onClick={() => onSeek(suggestion.t)} icon={<MapPin size={16} aria-hidden="true" />}>
          {t("O'tish")}
        </Button>
        <Button variant="ghost" style={tapButton} onClick={() => onReject(suggestion.key)} icon={<X size={16} aria-hidden="true" />}>
          {t('Rad etish')}
        </Button>
      </div>
    </div>
  );
};
