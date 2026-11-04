import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, t, useToast } from '@admins/shared';
import { Archive, ArrowLeft, Pencil, Save, Undo2 } from 'lucide-react';
import { useContainerWidth } from '../Menu/BulkImport/useContainerWidth';
import { readFailure } from '../Bookings/errors';
import { useLeaveGuard } from '../Bookings/useLeaveGuard';
import { AiPanel } from './AiPanel';
import { EditTourModal } from './EditTourModal';
import { HotspotsPanel } from './HotspotsPanel';
import { PublishPanel } from './PublishPanel';
import { StopsPanel } from './StopsPanel';
import { Timeline } from './Timeline';
import { Transport, VideoStage } from './VideoStage';
import { archiveTour, clearAiSuggestions, publishTour, startAiSuggest, unpublishTour, updateTour } from './api';
import {
  acceptHotspotSuggestion,
  acceptStopSuggestion,
  addHotspot,
  addStop,
  countSuggestions,
  coverage as computeCoverage,
  draftHotspotsFromTour,
  findSameHotspot,
  keyedSuggestions,
  removeHotspot,
  removeStop,
  tourTables,
  updateHotspot,
  updateStop,
} from './editModel';
import type { DraftIssue } from './editModel';
import { indexFromField } from './errorKind';
import { failureText, issueText } from './labels';
import { playableSource } from './tourModel';
import { hintStyle, pageStyle, pageTitleStyle, rowStyle, stickyBarStyle, tapButton, TAP } from './styles';
import { sortHotspots } from './editModel';
import type { DraftHotspot, Tour } from './types';
import { ConfirmDialog, Notice, StatusBadge } from './ui';
import { clearDraftStash, useEditorDraft } from './useEditorDraft';
import { useTableData } from './useTours';
import { useVideoClock } from './useVideoClock';
import type { Point } from './geometry';

type TabId = 'stops' | 'hotspots' | 'ai' | 'publish';

/** Ish maydoni shu kenglikdan oshsa video chapda (yopishib turadi), panellar o'ngda; aks holda video tepada */
const WIDE_FROM = 900;
const EMPTY_SET: ReadonlySet<string> = new Set();

interface Props {
  tour: Tour;
  apply: (next: Tour) => void;
  stalled: boolean;
  onResume: () => void;
  onBack: () => void;
}

/** Sayr muharriri: video + vaqt chizig'i + nuqtalar, belgilar, AI, e'lon. Hammasi bitta "Saqlash" paneli bilan saqlanadi. */
export const Editor: React.FC<Props> = ({ tour, apply, stalled, onResume, onBack }) => {
  const { showToast } = useToast();
  const [containerRef, width] = useContainerWidth<HTMLDivElement>();
  const wide = width >= WIDE_FROM;

  const tableData = useTableData();
  const tables = useMemo(() => tourTables(tableData.tables, tour.hall_id), [tableData.tables, tour.hall_id]);

  const clock = useVideoClock(tour.duration_s);
  const draft = useEditorDraft(tour, apply);
  const duration = clock.duration;

  const [tab, setTab] = useState<TabId>('stops');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState<string | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRejectAll, setConfirmRejectAll] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startMessage, setStartMessage] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ stops: null, hotspots: null, ai: null, publish: null });

  // Saqlanmagan o'zgarish bilan sahifadan chiqib ketishdan oldin tasdiq (yorliq yopish, yangilash, yon menyu)
  useLeaveGuard(draft.dirty, t("Sayrda saqlanmagan o'zgarishlar bor. Sahifadan chiqsangiz, ular yo'qoladi. Chiqamizmi?"), clearDraftStash);

  // ─── AI takliflari: qabul qilingan/rad etilganlari yashiriladi (serverdagi blok yangilanguncha) ───
  const suggestionSig = JSON.stringify(tour.ai_suggestions);
  const [dismissed, setDismissed] = useState<{ sig: string; keys: ReadonlySet<string> }>({ sig: '', keys: EMPTY_SET });
  const dismissedKeys = dismissed.sig === suggestionSig ? dismissed.keys : EMPTY_SET;
  const suggestions = useMemo(() => keyedSuggestions(tour.ai_suggestions, dismissedKeys), [tour.ai_suggestions, dismissedKeys]);
  const dismiss = (key: string) => setDismissed((previous) => ({ sig: suggestionSig, keys: new Set([...(previous.sig === suggestionSig ? previous.keys : EMPTY_SET), key]) }));
  const suggestionTotal = (tour.ai_suggestions?.stops.length ?? 0) + (tour.ai_suggestions?.hotspots.length ?? 0);
  const suggestionsLeft = countSuggestions(suggestions);

  // Hammasi ko'rib chiqilgan va o'zgarish saqlangan: serverdagi takliflar bloki tozalanadi (qayta ochilganda qaytib kelmasin)
  const clearedFor = useRef('');
  useEffect(() => {
    if (suggestionTotal === 0 || suggestionsLeft > 0 || draft.dirty || draft.saving || clearedFor.current === suggestionSig) return;
    clearedFor.current = suggestionSig;
    void clearAiSuggestions(tour.id).catch(() => undefined);
  }, [suggestionTotal, suggestionsLeft, draft.dirty, draft.saving, suggestionSig, tour.id]);

  const selected = draft.hotspots.find((h) => h.key === selectedKey) ?? null;
  const selectedSuggestion = suggestions.hotspots.find((s) => s.key === selectedSuggestionKey) ?? null;
  const coverage = useMemo(() => computeCoverage(tables, draft.hotspots), [tables, draft.hotspots]);

  const tableNumberOf = (hotspot: DraftHotspot): string => {
    if (hotspot.table_id === null) return '';
    const known = tableData.tables.find((table) => table.id === hotspot.table_id);
    if (known) return known.number;
    return tour.hotspots.find((h) => h.id === hotspot.id)?.table_number ?? '';
  };

  // ─── Tanlov ───
  const selectHotspot = (key: string | null) => {
    setSelectedKey(key);
    setSelectedSuggestionKey(null);
    setRelocating(false);
    if (key) setTab('hotspots');
  };
  const selectSuggestion = (key: string | null) => {
    setSelectedSuggestionKey(key);
    setSelectedKey(null);
    setRelocating(false);
    if (key) setTab('hotspots');
  };

  // ─── Belgilar ───
  const placeAt = (point: Point) => {
    if (draft.saving) return;
    clock.pause();
    const added = addHotspot(draft.hotspots, { x: point.x, y: point.y, now: clock.timeRef.current, duration });
    draft.editHotspots(() => added.list);
    selectHotspot(added.key);
  };
  const relocateTo = (point: Point) => {
    if (selectedKey) draft.editHotspots((list) => updateHotspot(list, selectedKey, { x: point.x, y: point.y }));
    setRelocating(false);
  };
  const moveHotspot = (key: string, point: Point) => draft.editHotspots((list) => updateHotspot(list, key, { x: point.x, y: point.y }));
  const patchHotspot = (key: string, patch: Partial<Omit<DraftHotspot, 'key' | 'id'>>) => draft.editHotspots((list) => updateHotspot(list, key, patch));
  const deleteHotspot = (key: string) => {
    draft.editHotspots((list) => removeHotspot(list, key));
    if (selectedKey === key) selectHotspot(null);
  };

  // ─── Nuqtalar ───
  const addStopHere = (title: string) => {
    const at = clock.timeRef.current;
    const finalTitle = title.trim() || t('Nuqta {n}', { n: draft.stops.length + 1 });
    draft.editStops((list) => addStop(list, finalTitle, at).list);
  };

  // ─── AI takliflarini qabul qilish / rad etish ───
  const acceptStop = (key: string) => {
    const suggestion = suggestions.stops.find((s) => s.key === key);
    if (!suggestion) return;
    draft.editStops((list) => acceptStopSuggestion(list, suggestion, duration, t('Nuqta')).list);
    dismiss(key);
  };
  const acceptHotspot = (key: string, tableId: number | null) => {
    const suggestion = suggestions.hotspots.find((s) => s.key === key);
    if (!suggestion) return;
    const result = acceptHotspotSuggestion(draft.hotspots, suggestion, tableId, duration);
    if (!result.ok) {
      showToast(t('Avval stolni tanlang: AI stol raqamini bilmaydi.'), 'error');
      return;
    }
    draft.editHotspots(() => result.list);
    dismiss(key);
    clock.seek(suggestion.t);
    selectHotspot(result.key);
  };
  const rejectSuggestion = (key: string) => {
    dismiss(key);
    if (selectedSuggestionKey === key) setSelectedSuggestionKey(null);
  };

  const startAi = async () => {
    setStarting(true);
    setStartMessage('');
    try {
      await startAiSuggest(tour.id);
      apply({ ...tour, ai_status: 'running', error: '' });
    } catch (err: unknown) {
      setStartMessage(failureText(readFailure(err), t("AI hozir mavjud emas. Qo'lda davom etishingiz mumkin: muharrir AI siz ham to'liq ishlaydi.")));
    } finally {
      setStarting(false);
    }
  };

  const rejectAll = async () => {
    setConfirmRejectAll(false);
    try {
      await clearAiSuggestions(tour.id);
      apply({ ...tour, ai_suggestions: null, ai_status: 'idle' });
      setSelectedSuggestionKey(null);
      showToast(t('Takliflar rad etildi'), 'info');
    } catch (err: unknown) {
      showToast(failureText(readFailure(err), t("Takliflarni rad etib bo'lmadi.")), 'error');
    }
  };

  // ─── Saqlash ───
  const showIssue = (issue: DraftIssue) => {
    if (issue.kind === 'stop') {
      setTab('stops');
      return;
    }
    const target = draft.hotspots.find((h) => h.key === issue.key);
    selectHotspot(issue.key);
    if (target) clock.seek(target.t_start);
  };

  const save = async (): Promise<boolean> => {
    setSubmitted(true);
    if (draft.issues.length > 0) {
      showToast(t('Avval xatolarni tuzating: {n} ta', { n: draft.issues.length }), 'error');
      showIssue(draft.issues[0]);
      return false;
    }
    const before = selected ? { ...selected } : null;
    const result = await draft.save();
    if (result.status === 'saved') {
      setSubmitted(false);
      if (before) {
        const same = findSameHotspot(draftHotspotsFromTour(result.tour.hotspots), before);
        setSelectedKey(same?.key ?? null);
      }
      showToast(t('Sayr saqlandi'), 'success');
      return true;
    }
    if (result.status === 'failed') {
      const base = result.stopsSaved ? t("Nuqtalar saqlandi, lekin belgilarni saqlab bo'lmadi.") : t("Saqlab bo'lmadi. Qayta urinib ko'ring.");
      showToast(failureText(result.failure, base), 'error');
      const index = indexFromField(result.failure.field, 'hotspots');
      if (index !== null) {
        const offending = sortHotspots(draft.hotspots)[index];
        if (offending) selectHotspot(offending.key);
      }
    }
    return false;
  };

  // ─── E'lon ───
  const runPublish = async () => {
    setConfirmPublish(false);
    setPublishing(true);
    try {
      if (draft.dirty && !(await save())) return;
      const next = await publishTour(tour.id);
      apply(next);
      showToast(t("Sayr e'lon qilindi"), 'success');
    } catch (err: unknown) {
      showToast(failureText(readFailure(err), t("E'lon qilib bo'lmadi. Qayta urinib ko'ring.")), 'error');
    } finally {
      setPublishing(false);
    }
  };
  const runUnpublish = async () => {
    setPublishing(true);
    try {
      apply(await unpublishTour(tour.id));
      showToast(t("Sayr e'londan olindi"), 'info');
    } catch (err: unknown) {
      showToast(failureText(readFailure(err), t("E'londan olib bo'lmadi. Qayta urinib ko'ring.")), 'error');
    } finally {
      setPublishing(false);
    }
  };

  // ─── Nom/zal, arxiv, orqaga ───
  const rename = async (title: string, hallId: number | null) => {
    setRenaming(true);
    setRenameError('');
    try {
      apply(await updateTour(tour.id, { title, hall_id: hallId }));
      setRenameOpen(false);
      showToast(t('Saqlandi'), 'success');
    } catch (err: unknown) {
      setRenameError(failureText(readFailure(err), t("Saqlab bo'lmadi. Qayta urinib ko'ring.")));
    } finally {
      setRenaming(false);
    }
  };

  const runArchive = async () => {
    setArchiving(true);
    try {
      await archiveTour(tour.id);
      clearDraftStash();
      showToast(t('Sayr arxivlandi'), 'info');
      onBack();
    } catch (err: unknown) {
      setConfirmArchive(false);
      showToast(failureText(readFailure(err), t("Arxivlab bo'lmadi. Qayta urinib ko'ring.")), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const goBack = () => {
    if (draft.dirty) setConfirmBack(true);
    else onBack();
  };

  // ─── Klaviatura: bo'sh joy = o'ynatish/to'xtatish, ←/→ = ±0.5 s ───
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const tag = target?.tagName ?? '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (event.key === ' ' || event.code === 'Space') {
      if (tag === 'BUTTON' || tag === 'A') return; // tugma o'zi bosiladi
      event.preventDefault();
      clock.toggle();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      clock.step(-0.5);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      clock.step(0.5);
    }
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'stops', label: t('Nuqtalar'), count: draft.stops.length },
    { id: 'hotspots', label: t('Belgilar'), count: draft.hotspots.length },
    { id: 'ai', label: t('AI'), count: suggestionsLeft || undefined },
    { id: 'publish', label: t("E'lon") },
  ];
  const onTabKeyDown = (event: React.KeyboardEvent, id: TabId) => {
    const index = tabs.findIndex((item) => item.id === id);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  };

  const src = playableSource(tour.variants);
  const stageColumn = (
    <div
      onKeyDown={onKeyDown}
      tabIndex={-1}
      aria-label={t("Video va vaqt chizig'i. Bo'sh joy — o'ynatish, strelkalar — 0,5 soniya.")}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        outline: 'none',
        ...(wide
          ? { position: 'sticky', top: 8, alignSelf: 'start' }
          : { position: 'sticky', top: 0, zIndex: 4, backgroundColor: 'var(--bg-primary)', padding: '0 0 8px', borderBottom: '1px solid var(--border-subtle)' }),
      }}
    >
      {src ? (
        <VideoStage
          src={src}
          poster={tour.variants.poster ?? ''}
          clock={clock}
          tourSize={{ width: tour.width, height: tour.height }}
          maxHeight={wide ? 'clamp(300px, calc(100dvh - 380px), 760px)' : '36dvh'}
          hotspots={draft.hotspots}
          suggestions={suggestions.hotspots}
          selectedKey={selectedKey}
          selectedSuggestionKey={selectedSuggestionKey}
          relocating={relocating}
          locked={draft.saving}
          tableNumberOf={tableNumberOf}
          onPlace={placeAt}
          onRelocate={relocateTo}
          onSelect={selectHotspot}
          onMove={moveHotspot}
          onSelectSuggestion={selectSuggestion}
        />
      ) : (
        <Notice tone="error">{t("Video fayli topilmadi. Videoni qayta yuklang.")}</Notice>
      )}
      <Transport clock={clock} disabled={!src} />
      <Timeline
        duration={duration}
        time={clock.time}
        onSeek={clock.seek}
        stops={draft.stops}
        hotspots={draft.hotspots}
        selectedHotspotKey={selectedKey}
        suggestedTimes={[...suggestions.stops.map((s) => s.t), ...suggestions.hotspots.map((s) => s.t)]}
      />
    </div>
  );

  const panelColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div role="tablist" aria-label={t("Sayr bo'limlari")} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(({ id, label, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`tour-tab-${id}`}
              aria-selected={active}
              aria-controls={`tour-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => onTabKeyDown(event, id)}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                minHeight: TAP,
                padding: '8px 6px',
                border: 'none',
                borderBottom: `3px solid ${active ? 'var(--brand)' : 'transparent'}`,
                background: 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-muted)',
                fontSize: 14,
                fontWeight: active ? 700 : 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {label}
              {count !== undefined && <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-dim)' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {submitted && draft.issues.length > 0 && (
        <Notice tone="error">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('Saqlashdan oldin tuzating:')}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {draft.issues.slice(0, 5).map((issue) => (
              <li key={`${issue.kind}-${issue.key}-${issue.code}`}>
                {issueText(issue)}{' '}
                <button type="button" onClick={() => showIssue(issue)} style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {t("Ko'rsatish")}
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <div role="tabpanel" id={`tour-panel-${tab}`} aria-labelledby={`tour-tab-${tab}`}>
        {tab === 'stops' && (
          <StopsPanel
            stops={draft.stops}
            suggestions={suggestions.stops}
            time={clock.time}
            disabled={draft.saving}
            issues={draft.issues}
            onAdd={addStopHere}
            onUpdate={(key, patch) => draft.editStops((list) => updateStop(list, key, patch))}
            onRemove={(key) => draft.editStops((list) => removeStop(list, key))}
            onSeek={clock.seek}
            onAccept={acceptStop}
            onReject={rejectSuggestion}
          />
        )}
        {tab === 'hotspots' && (
          <HotspotsPanel
            hotspots={draft.hotspots}
            tables={tables}
            tablesFailed={tableData.failure !== null}
            coverage={coverage}
            selected={selected}
            suggestions={suggestions.hotspots}
            selectedSuggestion={selectedSuggestion}
            time={clock.time}
            duration={duration}
            disabled={draft.saving}
            relocating={relocating}
            issues={draft.issues}
            submitted={submitted}
            tableNumberOf={tableNumberOf}
            onSelect={selectHotspot}
            onUpdate={patchHotspot}
            onRemove={deleteHotspot}
            onSeek={clock.seek}
            onToggleRelocate={() => setRelocating((value) => !value)}
            onAddCenter={() => placeAt({ x: 0.5, y: 0.5 })}
            onSelectSuggestion={selectSuggestion}
            onAcceptSuggestion={acceptHotspot}
            onRejectSuggestion={rejectSuggestion}
          />
        )}
        {tab === 'ai' && (
          <AiPanel
            aiStatus={tour.ai_status}
            aiError={tour.error}
            startMessage={startMessage}
            starting={starting}
            disabled={draft.saving}
            stopCount={suggestions.stops.length}
            hotspotCount={suggestions.hotspots.length}
            hasServerSuggestions={suggestionTotal > 0}
            stalled={stalled}
            onStart={() => void startAi()}
            onRejectAll={() => setConfirmRejectAll(true)}
            onResume={onResume}
          />
        )}
        {tab === 'publish' && (
          <PublishPanel
            tour={tour}
            dirty={draft.dirty}
            busy={publishing}
            coverage={coverage}
            hotspotCount={draft.hotspots.length}
            onPublish={() => (draft.dirty ? setConfirmPublish(true) : void runPublish())}
            onUnpublish={() => void runUnpublish()}
          />
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={pageStyle}>
      <header style={{ marginBottom: 12 }}>
        <Button variant="ghost" style={{ ...tapButton, paddingLeft: 0 }} onClick={goBack} icon={<ArrowLeft size={18} aria-hidden="true" />}>
          {t('Sayrlar')}
        </Button>
        <div style={{ ...rowStyle, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...pageTitleStyle, overflowWrap: 'anywhere' }}>{tour.title}</h1>
            <div style={rowStyle}>
              <StatusBadge status={tour.status} serverLabel={tour.status_label} />
              <span style={{ ...hintStyle, margin: 0 }}>{t("Videoni to'xtating, kadrga bosing — stol belgisi qo'yiladi.")}</span>
            </div>
          </div>
          <div style={rowStyle}>
            <Button variant="secondary" style={tapButton} onClick={() => { setRenameError(''); setRenameOpen(true); }} icon={<Pencil size={16} aria-hidden="true" />}>
              {t('Nom va zal')}
            </Button>
            <Button variant="ghost" style={tapButton} onClick={() => setConfirmArchive(true)} icon={<Archive size={16} aria-hidden="true" />}>
              {t('Arxivlash')}
            </Button>
          </div>
        </div>
      </header>

      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {stageColumn}
          {panelColumn}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stageColumn}
          {panelColumn}
        </div>
      )}

      {/* Umumiy saqlash paneli */}
      <div style={{ ...stickyBarStyle, marginTop: 16 }} role="region" aria-label={t('Saqlash')}>
        <div style={{ flex: '1 1 160px', minWidth: 0, fontSize: 14, color: draft.dirty ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: draft.dirty ? 700 : 500 }}>
          {draft.dirty ? t("Saqlanmagan o'zgarishlar: {n}", { n: draft.changeCount }) : t('Hammasi saqlangan')}
        </div>
        <Button variant="secondary" style={tapButton} disabled={!draft.dirty || draft.saving} onClick={() => setConfirmDiscard(true)} icon={<Undo2 size={16} aria-hidden="true" />}>
          {t('Bekor qilish')}
        </Button>
        <Button style={tapButton} loading={draft.saving} disabled={!draft.dirty} onClick={() => void save()} icon={<Save size={16} aria-hidden="true" />}>
          {t('Saqlash')}
        </Button>
      </div>

      {renameOpen && (
        <EditTourModal
          open
          mode="edit"
          initialTitle={tour.title}
          initialHallId={tour.hall_id}
          halls={tableData.halls}
          busy={renaming}
          error={renameError}
          onClose={() => setRenameOpen(false)}
          onSubmit={(title, hallId) => void rename(title, hallId)}
        />
      )}

      <ConfirmDialog
        open={confirmPublish}
        title={t("E'lon qilish")}
        message={t("Saqlanmagan o'zgarishlar bor. Avval ularni saqlab, keyin sayrni e'lon qilamizmi?")}
        confirmLabel={t("Saqlab, e'lon qilish")}
        onConfirm={() => void runPublish()}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog
        open={confirmDiscard}
        title={t('Bekor qilish')}
        message={t("Saqlanmagan o'zgarishlar yo'qoladi va oxirgi saqlangan holat qaytadi. Davom etamizmi?")}
        confirmLabel={t("O'zgarishlarni bekor qilish")}
        danger
        onConfirm={() => {
          setConfirmDiscard(false);
          draft.discard();
          setSubmitted(false);
          setSelectedKey(null);
          setRelocating(false);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
      <ConfirmDialog
        open={confirmBack}
        title={t("Sayrlar ro'yxatiga qaytish")}
        message={t("Sayrda saqlanmagan o'zgarishlar bor. Chiqsangiz, ular yo'qoladi. Chiqamizmi?")}
        confirmLabel={t('Sahifadan chiqish')}
        danger
        onConfirm={() => {
          setConfirmBack(false);
          clearDraftStash();
          onBack();
        }}
        onCancel={() => setConfirmBack(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title={t('Sayrni arxivlash')}
        message={t("Sayr ro'yxatdan yashiriladi va mehmonlarga ko'rinmaydi. Davom etamizmi?")}
        confirmLabel={t('Arxivlash')}
        danger
        busy={archiving}
        onConfirm={() => void runArchive()}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmRejectAll}
        title={t('Hammasini rad etish')}
        message={t("AI takliflarining hammasi o'chiriladi. Qabul qilingan nuqta va belgilar saqlanib qoladi. Davom etamizmi?")}
        confirmLabel={t('Rad etish')}
        danger
        onConfirm={() => void rejectAll()}
        onCancel={() => setConfirmRejectAll(false)}
      />
    </div>
  );
};
