import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, Modal, getLang, t } from '@admins/shared';
import { fetchReservations, fetchTableOptions } from './api';
import { isISODate, nowMinutes, weekdayOf } from './dates';
import { readFailure, reservationFieldOf } from './errors';
import type { ReservationField } from './errors';
import { ChoiceChips, GuestsStepper, TimeSelect } from './FormParts';
import { formErrorText, localizedName, weekdayFull } from './labels';
import {
  createPayload,
  emptyForm,
  exceedsCapacity,
  formFromReservation,
  hasErrors,
  isFormDirty,
  isPastTime,
  nearestFreeTime,
  patchPayload,
  takenTimes,
  validateForm,
} from './reservationForm';
import type { FormField, ReservationForm } from './reservationForm';
import { DEFAULT_DURATION_MINUTES, findConflicts } from './reservationsView';
import { NONE_EVENT_KEY } from './settingsModel';
import { errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, tapButton } from './styles';
import { timeRangeLabel } from './time';
import type { BookingConfig, CreateReservationPayload, Reservation, TableOption, UpdateReservationPayload } from './types';
import { ModalBody, Notice, SwitchRow, TextArea, TextField } from './ui';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  row: Reservation | null;
  /** Bugungi sana (Toshkent) */
  today: string;
  /** Yangi bronda boshlang'ich sana (ro'yxatda tanlangan kun) */
  defaultDate: string;
  /** Bron sozlamalari; ruxsat yo'q yoki yuklanmagan bo'lsa null (erkin vaqt, faqat "Yo'q" tadbir turi) */
  config: BookingConfig | null;
  onClose: () => void;
  onCreate: (payload: CreateReservationPayload) => Promise<void>;
  onEdit: (row: Reservation, patch: UpdateReservationPayload) => Promise<void>;
}

type FieldErrors = Partial<Record<ReservationField, string>>;

/** Forma maydoni -> xato maydoni */
const ERROR_FIELD: Record<keyof ReservationForm, ReservationField | null> = {
  table_id: 'table',
  date: 'date',
  time: 'time',
  guests: 'guests',
  name: 'name',
  phone: 'phone',
  event_type: 'event_type',
  notes: 'notes',
  confirmNow: null,
};

/** "Qo'lda bron qo'shish" va "Bronni tahrirlash" oynasi. */
export const ReservationFormModal: React.FC<Props> = (props) => {
  // Yopish so'rovi (x, fon, Esc) shu yerdan FormBody'ga boradi: saqlanmagan o'zgarish bo'lsa u tasdiq so'raydi
  const closeRequest = useRef<() => void>(() => undefined);
  return (
    <Modal isOpen={props.open} onClose={() => closeRequest.current()} title={props.mode === 'create' ? t("Qo'lda bron qo'shish") : t('Bronni tahrirlash')} maxWidth="560px">
      <FormBody
        key={props.row?.id ?? 'new'}
        {...props}
        registerClose={(request) => {
          closeRequest.current = request;
        }}
      />
    </Modal>
  );
};

const FormBody: React.FC<Props & { registerClose: (request: () => void) => void }> = ({ mode, row, today, defaultDate, config, onClose, onCreate, onEdit, registerClose }) => {
  const uid = useId();
  // Faqat ochilganda hisoblanadi: keyin foydalanuvchi o'zgartirgan holat saqlanadi
  const [initial] = useState<ReservationForm>(() =>
    mode === 'edit' && row ? formFromReservation(row) : emptyForm({ date: defaultDate < today ? today : defaultDate }),
  );
  const [form, setForm] = useState<ReservationForm>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const dirty = isFormDirty(initial, form);

  const requestClose = () => {
    if (submitting) return;
    if (!dirty) onClose();
    else setConfirmingClose(true);
  };
  useEffect(() => {
    registerClose(requestClose);
  });

  // ─── Stollar ───
  const [tables, setTables] = useState<TableOption[] | null>(null);
  const [tablesFailed, setTablesFailed] = useState(false);
  const [tablesAttempt, setTablesAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setTablesFailed(false);
    fetchTableOptions()
      .then((list) => alive && setTables(list))
      .catch(() => alive && setTablesFailed(true));
    return () => {
      alive = false;
    };
  }, [tablesAttempt]);

  // ─── Tanlangan kundagi bronlar (to'qnashuvni oldindan ko'rsatish uchun) ───
  const [dayRows, setDayRows] = useState<Reservation[]>([]);
  useEffect(() => {
    if (!isISODate(form.date)) {
      setDayRows([]);
      return;
    }
    let alive = true;
    fetchReservations({ from: form.date, to: form.date })
      .then((list) => alive && setDayRows(list))
      .catch(() => alive && setDayRows([]));
    return () => {
      alive = false;
    };
  }, [form.date]);

  const lang = getLang();
  const tableId = form.table_id ? Number(form.table_id) : NaN;
  const selectedTable = tables?.find((table) => table.id === tableId) ?? null;
  const duration = mode === 'edit' && row ? row.duration_minutes : config?.duration_minutes ?? DEFAULT_DURATION_MINUTES;
  const groups = useMemo(() => (config?.slots ?? []).map((group) => ({ key: group.key, label: localizedName(group, lang), times: group.times })), [config, lang]);
  const configTimes = useMemo(() => groups.flatMap((group) => group.times), [groups]);
  const taken = useMemo(
    () => (Number.isFinite(tableId) ? takenTimes(dayRows, { tableId, date: form.date, times: configTimes, duration, excludeId: row?.id }) : new Set<string>()),
    [dayRows, tableId, form.date, configTimes, duration, row?.id],
  );
  const conflicts = Number.isFinite(tableId) ? findConflicts(dayRows, { tableId, date: form.date, time: form.time, duration, excludeId: row?.id }) : [];
  const nearest = conflicts.length > 0 ? nearestFreeTime(configTimes, taken, form.time) : null;
  const capacityWarning = exceedsCapacity(form.guests, selectedTable?.capacity);
  const closedDay = isISODate(form.date) && Boolean(config?.closed_weekdays.includes(weekdayOf(form.date)));
  const eventOptions = useMemo(() => {
    const list = (config?.event_types ?? [{ key: NONE_EVENT_KEY, label: "Yo'q" }]).map((type) => ({ key: type.key, label: localizedName(type, lang) }));
    // Sozlamadan olib tashlangan tur bilan yaratilgan bronni tahrirlayotganda uning nomi yo'qolmasin
    if (row && row.event_type && !list.some((option) => option.key === row.event_type)) list.push({ key: row.event_type, label: row.event_label || row.event_type });
    return list;
  }, [config, lang, row]);

  // ─── Yangilash ───
  const update = (patch: Partial<ReservationForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setBanner(null);
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof ReservationForm)[]) {
        const field = ERROR_FIELD[key];
        if (field) delete next[field];
      }
      // Stol yoki vaqt o'zgarsa "band" xabari eskiradi
      if ('table_id' in patch || 'date' in patch) delete next.time;
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const errors = validateForm(form, { mode, today, original: row });
    if (hasErrors(errors)) {
      const texts: FieldErrors = {};
      for (const field of Object.keys(errors) as FormField[]) {
        const code = errors[field];
        if (code) texts[field] = formErrorText(code);
      }
      setFieldErrors(texts);
      setBanner(t("Belgilangan maydonlarni to'ldiring."));
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      if (mode === 'create') {
        await onCreate(createPayload(form));
      } else if (row) {
        const patch = patchPayload(row, form);
        if (Object.keys(patch).length > 0) await onEdit(row, patch);
      }
      onClose();
    } catch (err: unknown) {
      const failure = readFailure(err);
      if (failure.slotTaken) {
        setFieldErrors({ time: t("Bu stol shu vaqtda band. Boshqa vaqt yoki boshqa stol tanlang.") });
        setBanner(t("Bu stol shu vaqtda band. Boshqa vaqt yoki boshqa stol tanlang."));
      } else {
        const field = reservationFieldOf(failure.field);
        const message = failure.message ? t(failure.message) : failure.forbidden ? t("Bu amal uchun ruxsatingiz yo'q.") : t("Saqlab bo'lmadi. Qayta urinib ko'ring.");
        if (field === 'general') setBanner(message);
        else {
          setFieldErrors({ [field]: message });
          setBanner(message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tablesByHall = useMemo(() => {
    const groupsByHall = new Map<string, TableOption[]>();
    for (const table of tables ?? []) {
      const list = groupsByHall.get(table.hall) ?? [];
      list.push(table);
      groupsByHall.set(table.hall, list);
    }
    return [...groupsByHall.entries()];
  }, [tables]);
  const originalTableMissing = Boolean(row?.table && tables && !tables.some((table) => table.id === row.table?.id));
  const tableOptionLabel = (table: TableOption) =>
    table.capacity > 0 ? `${t('Stol #{number}', { number: table.number })} · ${t('{n} kishi', { n: table.capacity })}` : t('Stol #{number}', { number: table.number });

  const tableError = fieldErrors.table;
  const selectId = `${uid}-table`;
  const dateId = `${uid}-date`;

  return (
    <ModalBody>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {mode === 'edit' && row && (
          <p style={{ ...hintStyle, margin: 0 }}>{t('Kod: {code}', { code: row.public_code })}</p>
        )}

        {/* Stol */}
        <div>
          <label htmlFor={selectId} style={labelStyle}>
            {t('Stol')}
          </label>
          {tablesFailed ? (
            <Notice tone="error">
              <span>{t("Stollar ro'yxatini yuklab bo'lmadi.")}</span>{' '}
              <button type="button" onClick={() => setTablesAttempt((n) => n + 1)} style={{ minHeight: 44, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
                {t('Qayta urinish')}
              </button>
            </Notice>
          ) : (
            <select
              id={selectId}
              value={form.table_id}
              disabled={tables === null}
              onChange={(e) => update({ table_id: e.target.value })}
              aria-invalid={tableError ? true : undefined}
              aria-describedby={tableError ? `${selectId}-err` : undefined}
              style={{ ...inputStyle, ...(tableError ? inputErrorStyle : null) }}
            >
              <option value="">{tables === null ? t('Yuklanmoqda...') : t('Stolni tanlang')}</option>
              {originalTableMissing && row?.table && <option value={String(row.table.id)}>{t('Stol #{number}', { number: row.table.number })}</option>}
              {tablesByHall.map(([hall, list]) =>
                hall ? (
                  <optgroup key={hall} label={t(hall)}>
                    {list.map((table) => (
                      <option key={table.id} value={String(table.id)}>
                        {tableOptionLabel(table)}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  list.map((table) => (
                    <option key={table.id} value={String(table.id)}>
                      {tableOptionLabel(table)}
                    </option>
                  ))
                ),
              )}
            </select>
          )}
          {tableError && (
            <p id={`${selectId}-err`} role="alert" style={errorTextStyle}>
              {tableError}
            </p>
          )}
        </div>

        {/* Sana */}
        <div>
          <label htmlFor={dateId} style={labelStyle}>
            {t('Sana')}
          </label>
          <input
            id={dateId}
            type="date"
            value={form.date}
            min={mode === 'create' ? today : undefined}
            onChange={(e) => update({ date: e.target.value })}
            aria-invalid={fieldErrors.date ? true : undefined}
            aria-describedby={fieldErrors.date ? `${dateId}-err` : undefined}
            style={{ ...inputStyle, ...(fieldErrors.date ? inputErrorStyle : null) }}
          />
          {fieldErrors.date && (
            <p id={`${dateId}-err`} role="alert" style={errorTextStyle}>
              {fieldErrors.date}
            </p>
          )}
          {closedDay && <p style={{ ...hintStyle, color: 'var(--accent-amber)' }}>{t('Sozlamada {day} kuni yopiq deb belgilangan.', { day: weekdayFull(weekdayOf(form.date)) })}</p>}
        </div>

        {/* Vaqt */}
        <div>
          <TimeSelect
            value={form.time}
            onChange={(time) => update({ time })}
            groups={groups}
            taken={taken}
            isPast={(time) => isISODate(form.date) && isPastTime(form.date, time, today, nowMinutes())}
            error={fieldErrors.time}
          />
          {conflicts.length > 0 && !fieldErrors.time && (
            <div style={{ marginTop: '8px' }}>
              <Notice tone="warn">
                <span>
                  {t("Bu stol {range} oralig'ida band: {name} ({code}).", {
                    range: timeRangeLabel(conflicts[0].reservation_time, conflicts[0].duration_minutes),
                    name: conflicts[0].customer_name || t('Ismsiz mehmon'),
                    code: conflicts[0].public_code,
                  })}
                </span>
                {nearest && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => update({ time: nearest })}
                      style={{ minHeight: 44, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {t("Eng yaqin bo'sh vaqt: {time}", { time: nearest })}
                    </button>
                  </>
                )}
              </Notice>
            </div>
          )}
        </div>

        <GuestsStepper
          value={form.guests}
          onChange={(guests) => update({ guests })}
          error={fieldErrors.guests}
          hint={capacityWarning && selectedTable ? t("Stolning sig'imi {n} kishi: mehmonlar ko'p bo'lsa boshqa stol tanlang.", { n: selectedTable.capacity }) : undefined}
        />

        <TextField label={t('Mehmon ismi')} value={form.name} onChange={(e) => update({ name: e.target.value })} autoComplete="off" maxLength={120} error={fieldErrors.name} />
        <TextField label={t('Telefon raqami')} type="tel" inputMode="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} autoComplete="off" maxLength={30} placeholder="+998 90 123 45 67" error={fieldErrors.phone} />

        <ChoiceChips label={t('Tadbir turi')} value={form.event_type} options={eventOptions} onChange={(event_type) => update({ event_type })} />

        <TextArea label={t('Izoh')} value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} maxLength={500} error={fieldErrors.notes} />

        {mode === 'create' && <SwitchRow label={t('Darhol tasdiqlansin')} hint={t("O'chirilsa bron «Kutilmoqda» holatida qoladi.")} checked={form.confirmNow} onChange={(confirmNow) => update({ confirmNow })} />}

        {banner && <Notice tone="error">{banner}</Notice>}

        <div style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--bg-surface)', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {confirmingClose ? (
            <>
              <Notice tone="warn">{t("Kiritilgan ma'lumotlar saqlanmaydi. Oynani yopamizmi?")}</Notice>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button type="button" variant="secondary" onClick={() => setConfirmingClose(false)} style={tapButton}>
                  {t('Davom etish')}
                </Button>
                <Button type="button" variant="danger" onClick={onClose} style={tapButton}>
                  {t('Ha, yopish')}
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" loading={submitting} style={{ ...tapButton, flex: '1 1 160px' }}>
                {mode === 'create' ? t("Bron qo'shish") : t('Saqlash')}
              </Button>
              <Button type="button" variant="secondary" onClick={requestClose} disabled={submitting} style={tapButton}>
                {t('Bekor qilish')}
              </Button>
            </div>
          )}
        </div>
      </form>
    </ModalBody>
  );
};
