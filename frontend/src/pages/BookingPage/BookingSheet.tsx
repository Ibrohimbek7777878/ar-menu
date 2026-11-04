// Bron oynasi: telefonda pastdan ochiladigan varaq, kompyuterda markaziy panel.
// Tartib (videodagidek): Sana, Vaqt, Mehmonlar, Ism-familiya, Telefon, Tadbir, Izoh; pastda doim ko'rinadigan "Bron qilish".
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { numberLocale, t } from '../../i18n';
import { tm } from '../../utils/brandText';
import { useLang } from '../../i18n/useLang';
import { setButtonState, shake, rippleRings } from '../../motion/fx';
import { fxEnabled } from '../../motion/env';
import { pickLabel, slotsOfTable, timeGroupsView } from './availability';
import { DateStrip, GuestStepper } from './Controls';
import { addMinutes, formatDay, type DayCell } from './dates';
import type { FlowAction, FlowState, FieldKey } from './flow';
import { fieldMessage, hallName, slotStateLabel, tableTitle } from './labels';
import { NOTES_MAX, caretAfterDigits, digitsBefore, formatNational, nationalDigits } from './phone';
import type { AvailabilityHook } from './useBooking';
import type { BookingConfig, BookingHall, BookingTable } from './types';

const EXIT_MS = 200;

interface BookingSheetProps {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
  config: BookingConfig;
  table: BookingTable;
  hall: BookingHall;
  days: readonly DayCell[];
  closedDates: ReadonlySet<string>;
  avail: AvailabilityHook;
  onSubmit: () => void;
  onClose: () => void;
}

function bannerText(kind: NonNullable<FlowState['banner']>): string {
  switch (kind) {
    case 'slot_taken': return t('Bu vaqt hozirgina band bo\'ldi — boshqasini tanlang');
    case 'rate_limited': return t("Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring");
    case 'disabled': return t('Bron hozircha yopiq');
    case 'network': return t("Aloqa uzildi. Internetni tekshirib, qayta urinib ko'ring — takroriy bron yaratilmaydi");
    default: return t("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring");
  }
}

export const BookingSheet: React.FC<BookingSheetProps> = ({ state, dispatch, config, table, hall, days, closedDates, avail, onSubmit, onClose }) => {
  const lang = useLang();
  const uid = useId();
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const { errors, submitting, banner } = state;
  const slots = avail.data ? slotsOfTable(avail.data.tables, table.id) : undefined;
  const dayClosed = avail.data?.closed === true;
  const groups = useMemo(() => timeGroupsView(config.slots, dayClosed ? {} : slots), [config.slots, slots, dayClosed]);
  const loadingSlots = !avail.data && avail.loading;
  const locale = numberLocale();

  const close = () => {
    if (submitting || closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, fxEnabled() ? EXIT_MS : 0);
  };

  // Ochilganda: fokus oynaga, orqa sahifa aylanmaydi, Esc yopadi; yopilganda joyiga qaytadi
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !sheetRef.current) return;
    const items = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'),
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Tugma holati: yuborilayotganda aylana; yuborish rad etilsa (tekshiruv/xato) silkinadi
  useEffect(() => {
    setButtonState(submitRef.current, submitting ? 'loading' : 'idle');
  }, [submitting]);

  const prevTick = useRef(state.focusTick);
  useEffect(() => {
    if (state.focusTick === prevTick.current) return;
    prevTick.current = state.focusTick;
    shake(submitRef.current);
    const order: FieldKey[] = ['time', 'guests', 'name', 'phone', 'notes'];
    const field = order.find((k) => k in errors);
    const target: HTMLElement | null | undefined =
      field === 'time' ? timeRef.current
        : field === 'guests' ? guestsRef.current?.querySelector('button')
          : field === 'name' ? nameRef.current
            : field === 'phone' ? phoneRef.current
              : field === 'notes' ? notesRef.current : null;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: fxEnabled() ? 'smooth' : 'auto' });
      target.focus({ preventScroll: true });
    }
  }, [state.focusTick, errors]);

  useEffect(() => {
    if (banner) shake(submitRef.current);
  }, [banner]);

  const onPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const before = digitsBefore(el.value, el.selectionStart ?? el.value.length);
    const national = nationalDigits(el.value);
    dispatch({ type: 'setPhone', national });
    const pos = caretAfterDigits(formatNational(national), Math.min(before, national.length));
    requestAnimationFrame(() => {
      const input = phoneRef.current;
      if (input && document.activeElement === input) input.setSelectionRange(pos, pos);
    });
  };

  const pickTime = (time: string, el: Element) => {
    dispatch({ type: 'setTime', time });
    rippleRings(el, 1);
    avail.ensureFresh(); // kesh eskirgan bo'lsa tanlangan vaqt hali bo'shligini tekshiradi
  };

  const timeEnd = state.time && config.duration_minutes > 0 ? addMinutes(state.time, config.duration_minutes) : '';
  const fieldId = (name: string) => `${uid}-${name}`;
  const err = (field: FieldKey) => errors[field];

  const errorLine = (field: FieldKey) =>
    err(field) ? (
      <p className="bk-error" id={fieldId(`${field}-err`)} role="alert">
        {fieldMessage(field, err(field)!)}
      </p>
    ) : null;

  const longDate = formatDay(state.date, locale).long;

  return createPortal(
    <div className={`bk-sheet-root ${closing ? 'is-closing' : ''}`}>
      <div className="bk-backdrop" onClick={close} />
      <div className="bk-sheet" role="dialog" aria-modal="true" aria-labelledby={fieldId('title')} ref={sheetRef} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="bk-grabber" aria-hidden="true" />
        <header className="bk-sheet-head">
          <div className="bk-sheet-titles">
            <h2 className="bk-sheet-title" id={fieldId('title')}>{tableTitle(table.number)}</h2>
            <p className="bk-sheet-sub">
              {hallName(hall.name)} · {t("Ko'pi bilan {n} kishi", { n: table.capacity })}
            </p>
          </div>
          <button type="button" className="bk-close" onClick={close} aria-label={t('Yopish')} disabled={submitting}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="bk-sheet-body">
          <section className="bk-field">
            <div className="bk-label" id={fieldId('date')}>{t('Sana')}</div>
            <DateStrip days={days} value={state.date} onChange={(ymd) => dispatch({ type: 'setDate', date: ymd })} extraClosed={closedDates} />
          </section>

          <section className="bk-field" ref={timeRef} tabIndex={-1} aria-labelledby={fieldId('time')} aria-describedby={err('time') ? fieldId('time-err') : undefined}>
            <div className="bk-label" id={fieldId('time')}>{t('Vaqt')}</div>
            {dayClosed && <p className="bk-note">{tm(t('Bu kuni restoran yopiq. Boshqa kunni tanlang.'))}</p>}
            {avail.error && !avail.data && (
              <div className="bk-note bk-note--warn" role="alert">
                <span>{avail.error === 'rate_limited' ? t("Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring") : t("Vaqtlarni yuklab bo'lmadi")}</span>
                <button type="button" className="bk-link" onClick={avail.refresh}>{t("Qayta urinish")}</button>
              </div>
            )}
            <div className="bk-slot-groups" aria-busy={loadingSlots || undefined}>
              {groups.map((g) => {
                const first = g.group.times[0];
                const last = g.group.times[g.group.times.length - 1];
                return (
                  <div className="bk-slot-group" key={g.key} role="radiogroup" aria-label={pickLabel(g.group, lang)}>
                    <div className="bk-slot-head">
                      <span className="bk-slot-name">{pickLabel(g.group, lang)}</span>
                      <span className="bk-slot-range tabular-nums">{first === last ? first : `${first} – ${last}`}</span>
                    </div>
                    <div className="bk-slot-grid">
                      {g.cells.map((c) => {
                        const selected = state.time === c.time && c.selectable;
                        const loading = c.state === 'unknown';
                        return (
                          <button
                            key={c.time}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-disabled={!c.selectable || undefined}
                            aria-label={c.selectable ? undefined : `${c.time}, ${loading ? t('Yuklanmoqda...') : slotStateLabel(c.state)}`}
                            className={`bk-slot tabular-nums ${selected ? 'is-on' : ''} ${c.selectable ? '' : loading ? 'is-loading' : 'is-off'}`}
                            onClick={(e) => {
                              if (c.selectable) pickTime(c.time, e.currentTarget);
                            }}
                          >
                            {c.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {timeEnd && <p className="bk-hint tabular-nums">{t("{from} – {to} oralig'ida stol sizniki bo'ladi", { from: state.time!, to: timeEnd })}</p>}
            {errorLine('time')}
          </section>

          <section className="bk-field" ref={guestsRef}>
            <div className="bk-label" id={fieldId('guests')}>{tm(t('Mehmonlar'))}</div>
            <GuestStepper value={state.guests} max={table.capacity} onChange={(n) => dispatch({ type: 'setGuests', guests: n, maxGuests: table.capacity })} labelId={fieldId('guests')} />
            {errorLine('guests')}
          </section>

          <section className="bk-field">
            <label className="bk-label" htmlFor={fieldId('name')}>{t('Ism-familiya')}</label>
            <input
              ref={nameRef}
              id={fieldId('name')}
              className={`bk-input ${err('name') ? 'is-bad' : ''}`}
              type="text"
              name="name"
              autoComplete="name"
              enterKeyHint="next"
              maxLength={120}
              placeholder={t('Masalan: Aziza Karimova')}
              value={state.name}
              aria-invalid={err('name') ? true : undefined}
              aria-describedby={err('name') ? fieldId('name-err') : undefined}
              onChange={(e) => dispatch({ type: 'setName', value: e.target.value })}
            />
            {errorLine('name')}
          </section>

          <section className="bk-field">
            <label className="bk-label" htmlFor={fieldId('phone')}>{t('Telefon')}</label>
            <div className={`bk-phone ${err('phone') ? 'is-bad' : ''}`}>
              <span className="bk-phone-prefix tabular-nums" aria-hidden="true">+998</span>
              <input
                ref={phoneRef}
                id={fieldId('phone')}
                className="bk-phone-input tabular-nums"
                type="tel"
                name="tel-national"
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="next"
                placeholder="90 123 45 67"
                value={formatNational(state.phone)}
                aria-label={t('Telefon raqami (+998 dan keyin 9 ta raqam)')}
                aria-invalid={err('phone') ? true : undefined}
                aria-describedby={err('phone') ? fieldId('phone-err') : undefined}
                onChange={onPhone}
              />
            </div>
            {errorLine('phone')}
          </section>

          {config.event_types.length > 0 && (
            <section className="bk-field">
              <div className="bk-label" id={fieldId('event')}>{t('Tadbir')}</div>
              <div className="bk-chips" role="radiogroup" aria-labelledby={fieldId('event')}>
                {config.event_types.map((ev) => {
                  const selected = state.eventType === ev.key;
                  return (
                    <button
                      key={ev.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`bk-chip ${selected ? 'is-on' : ''}`}
                      onClick={() => dispatch({ type: 'setEvent', key: ev.key })}
                    >
                      {pickLabel(ev, lang)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bk-field">
            <label className="bk-label" htmlFor={fieldId('notes')}>
              {t('Izoh')} <span className="bk-optional">({t('ixtiyoriy')})</span>
            </label>
            <textarea
              ref={notesRef}
              id={fieldId('notes')}
              className={`bk-input bk-textarea ${err('notes') ? 'is-bad' : ''}`}
              rows={3}
              maxLength={NOTES_MAX}
              placeholder={t("Tug'ilgan kun bezagi, bolalar o'rindig'i, tinch burchak...")}
              value={state.notes}
              aria-invalid={err('notes') ? true : undefined}
              aria-describedby={err('notes') ? fieldId('notes-err') : undefined}
              onChange={(e) => dispatch({ type: 'setNotes', value: e.target.value })}
            />
            {errorLine('notes')}
          </section>
        </div>

        <footer className="bk-sheet-foot">
          {banner && (
            <p className="bk-banner" role="alert">
              {bannerText(banner)}
            </p>
          )}
          <p className="bk-summary tabular-nums">
            <span>{longDate}</span>
            <span aria-hidden="true">·</span>
            <span className={state.time ? '' : 'is-missing'}>{state.time ?? t('vaqt tanlanmagan')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('{n} kishi', { n: state.guests })}</span>
          </p>
          <button type="button" className="bk-submit" ref={submitRef} onClick={onSubmit} disabled={submitting} aria-busy={submitting || undefined}>
            <span>{t('Bron qilish')}</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
