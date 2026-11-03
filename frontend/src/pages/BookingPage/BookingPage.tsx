// Stol bron qilish (/book/): 1) zal rejasi yoki ro'yxatdan stol tanlash, 2) bron oynasi, 3) muvaffaqiyat ekrani (kod).
// Mantiq `flow.ts` (reducer), `availability.ts`, `dates.ts`, `phone.ts` da (brauzersiz sinalgan); bu fayl faqat ulaydi va chizadi.
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BottomNav, HeaderNav } from '../../components/ui';
import { Icon } from '../../components/ui/Icon/Icon';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { useLang } from '../../i18n/useLang';
import { rippleRings } from '../../motion/fx';
import { hallFreeCount, hasUsablePlan, slotsOfTable, tableStates } from './availability';
import { BookingSheet } from './BookingSheet';
import { BookingSuccess } from './BookingSuccess';
import { bookingClient, newSubmissionId } from './client';
import { DateStrip, GuestStepper } from './Controls';
import { buildDateStrip, firstOpenDay, restaurantYmd } from './dates';
import { FloorPlan } from './FloorPlan';
import { buildPayload, initialFlow, reduceFlow } from './flow';
import { hallName, tableTitle } from './labels';
import { MyBookings } from './MyBookings';
import { addStored, readStored, saveStored, toStored } from './stored';
import { TableCards } from './TableCards';
import type { BookingConfig, BookingTable, StoredBooking } from './types';
import { useAvailability, useBookingConfig } from './useBooking';

const MAX_GUESTS_LIMIT = 30;

export const BookingFlow: React.FC<{ config: BookingConfig }> = ({ config }) => {
  const { navigate } = useNavigation();
  useLang(); // til almashganda hamma matn qayta chiziladi

  const today = useMemo(() => restaurantYmd(), []);
  const days = useMemo(() => buildDateStrip(today, config.max_days_ahead, config.closed_weekdays), [today, config.max_days_ahead, config.closed_weekdays]);
  const openDay = useMemo(() => firstOpenDay(days), [days]);
  const halls = useMemo(() => config.halls.filter((h) => h.tables.length > 0), [config.halls]);
  const maxGuests = useMemo(
    () => Math.min(MAX_GUESTS_LIMIT, Math.max(1, ...halls.flatMap((h) => h.tables.map((tb) => tb.capacity)))),
    [halls],
  );
  const defaultEvent = useMemo(
    () => config.event_types.find((e) => e.key === 'none')?.key ?? config.event_types[0]?.key ?? '',
    [config.event_types],
  );

  const [state, dispatch] = useReducer(reduceFlow, undefined, () =>
    initialFlow({ date: openDay ?? today, guests: Math.min(2, maxGuests), eventType: defaultEvent }),
  );
  const [hallId, setHallId] = useState<number | null>(halls[0]?.id ?? null);
  const [viewPref, setViewPref] = useState<'plan' | 'list'>('plan');
  const [mine, setMine] = useState<StoredBooking[]>(() => readStored(today));
  const [closedDates, setClosedDates] = useState<ReadonlySet<string>>(() => new Set());
  const openerRef = useRef<Element | null>(null);

  const avail = useAvailability(state.date, state.availGuests, openDay !== null && state.step !== 'done');
  const dayClosed = avail.data?.closed === true;

  // Server kunni yopiq desa (hafta kunlari tartibi taxminan to'g'ri kelmasa ham) lentada shu kun yopiq ko'rinadi
  useEffect(() => {
    if (avail.data?.closed) setClosedDates((prev) => (prev.has(avail.data!.date) ? prev : new Set(prev).add(avail.data!.date)));
  }, [avail.data]);

  const states = useMemo(() => tableStates(halls, avail.data?.tables, dayClosed), [halls, avail.data, dayClosed]);
  const hall = halls.find((h) => h.id === hallId) ?? halls[0] ?? null;
  const planOk = hall ? hasUsablePlan(hall) : false;
  const view = planOk && viewPref === 'plan' ? 'plan' : 'list';

  const selectedTable: BookingTable | null = useMemo(() => {
    if (state.tableId === null) return null;
    for (const h of halls) {
      const found = h.tables.find((tb) => tb.id === state.tableId);
      if (found) return found;
    }
    return null;
  }, [halls, state.tableId]);
  const selectedHall = selectedTable ? halls.find((h) => h.tables.some((tb) => tb.id === selectedTable.id)) ?? null : null;

  // Tanlangan stol uchun availability yangilansa, tanlangan vaqt hali bo'shmi tekshiriladi
  useEffect(() => {
    if (state.step !== 'form' || state.tableId === null) return;
    const slots = avail.data ? slotsOfTable(avail.data.tables, state.tableId) : undefined;
    dispatch({
      type: 'reconcile',
      freeTimes: slots ? new Set(Object.entries(slots).filter(([, s]) => s === 'free').map(([time]) => time)) : null,
    });
  }, [avail.data, state.step, state.tableId]);

  // Yuborish: reducer `submitting` ni yoqqach shu yerda bitta so'rov ketadi (ikki marta bosish reducer'da to'xtatilgan)
  const { refresh } = avail;
  useEffect(() => {
    if (!state.submitting) return;
    const attempt = state.attempt;
    const payload = attempt ? buildPayload(state, attempt.id) : null;
    if (!payload) {
      dispatch({ type: 'submitFail', failure: { kind: 'server' } });
      return;
    }
    let alive = true;
    bookingClient.submit(payload).then((outcome) => {
      if (outcome.ok) {
        // Server stol/zal nomini yubormagan bo'lsa tanlangan stol ma'lumoti ishlatiladi
        const booking = {
          ...outcome.booking,
          tableNumber: outcome.booking.tableNumber || selectedTable?.number || '',
          hall: outcome.booking.hall || selectedHall?.name || '',
        };
        // Sahifa yopilgan bo'lsa ham kod eslab qolinadi: bron serverda yaratilgan
        const next = addStored(readStored(today), toStored(booking, Date.now()), today);
        saveStored(next);
        if (alive) {
          setMine(next);
          dispatch({ type: 'submitOk', result: booking });
        }
        return;
      }
      if (!alive) return;
      dispatch({ type: 'submitFail', failure: outcome });
      if (outcome.kind === 'slot_taken') refresh(); // band bo'lgan vaqt ro'yxatdan darrov o'chadi
      if (outcome.kind === 'disabled') bookingClient.clearCaches(); // restoran bronni o'chirgan: keyingi kirishda sozlama qaytadan so'raladi
    });
    return () => {
      alive = false;
    };
    // faqat `submitting` o'zgarganda: boshqa maydonlar o'zgarishi yangi so'rov yubormasligi kerak
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.submitting]);

  const open = (tb: BookingTable) => {
    openerRef.current = document.activeElement;
    dispatch({ type: 'selectTable', id: tb.id, capacity: tb.capacity });
  };
  const pick = (tb: BookingTable, el: Element) => {
    rippleRings(el, 1);
    open(tb);
  };

  const closeSheet = () => {
    dispatch({ type: 'closeForm' });
    const opener = openerRef.current;
    window.setTimeout(() => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    }, 0);
  };

  if (state.step === 'done' && state.result) {
    return (
      <BookingSuccess
        result={state.result}
        onMenu={() => navigate('/menu/')}
        onAgain={() => {
          dispatch({ type: 'reset', eventType: defaultEvent });
          refresh(); // yangi bron stolni band qildi: holatlar qaytadan so'raladi
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  const freeTotal = [...states.values()].filter((s) => s.state === 'free').length;
  const loadingStates = !avail.data;

  return (
    <>
      <section className="bk-hero bk-enter">
        <span className="bk-eyebrow">{t('Stol bron qilish')}</span>
        <h1 className="bk-title">{t('Stolni tanlang')}</h1>
        <p className="bk-lead">{t("Sana va mehmonlar sonini belgilang — bo'sh stollar ko'rinadi. Stolni bossangiz bron oynasi ochiladi.")}</p>
      </section>

      <MyBookings items={mine} />

      {openDay === null ? (
        <div className="bk-card-block bk-empty" role="status">
          <Icon name="calendar" size={28} />
          <p>{t("Hozircha bron uchun ochiq kun yo'q")}</p>
        </div>
      ) : halls.length === 0 ? (
        <div className="bk-card-block bk-empty" role="status">
          <Icon name="table" size={28} />
          <p>{t("Hozircha bron qilinadigan stollar yo'q")}</p>
          <button type="button" className="bk-btn" onClick={() => navigate('/menu/')}>{t("Menyuga o'tish")}</button>
        </div>
      ) : (
        <>
          <section className="bk-card-block bk-enter" aria-label={t('Sana va mehmonlar soni')}>
            <div className="bk-field">
              <div className="bk-label">{t('Sana')}</div>
              <DateStrip days={days} value={state.date} onChange={(ymd) => dispatch({ type: 'setDate', date: ymd })} extraClosed={closedDates} />
            </div>
            <div className="bk-field">
              <div className="bk-label" id="bk-guests-label">{t('Mehmonlar')}</div>
              <GuestStepper value={state.guests} max={maxGuests} onChange={(n) => dispatch({ type: 'setGuests', guests: n, maxGuests })} labelId="bk-guests-label" />
            </div>
          </section>

          <section className="bk-card-block bk-enter" aria-label={t('Stol tanlash')}>
            <div className="bk-toolbar">
              {halls.length > 1 && (
                <div className="bk-halls" role="group" aria-label={t('Zal')}>
                  {halls.map((h) => {
                    const on = hall?.id === h.id;
                    const free = avail.data ? hallFreeCount(h, states) : null;
                    return (
                      <button key={h.id} type="button" className={`bk-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setHallId(h.id)}>
                        {hallName(h.name)}
                        {free !== null && <span className="bk-chip-count tabular-nums">{free}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {planOk && (
                <div className="bk-seg" role="radiogroup" aria-label={t("Ko'rsatish usuli")}>
                  <button type="button" role="radio" aria-checked={view === 'plan'} className={`bk-seg-opt ${view === 'plan' ? 'is-on' : ''}`} onClick={() => setViewPref('plan')}>
                    {t('Reja')}
                  </button>
                  <button type="button" role="radio" aria-checked={view === 'list'} className={`bk-seg-opt ${view === 'list' ? 'is-on' : ''}`} onClick={() => setViewPref('list')}>
                    {t("Ro'yxat")}
                  </button>
                </div>
              )}
            </div>

            <div className="bk-status-row" role="status" aria-live="polite">
              {avail.error && !avail.data ? (
                <span className="bk-note bk-note--warn">
                  {avail.error === 'rate_limited' ? t("Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring") : t("Stollar holatini yuklab bo'lmadi")}
                  <button type="button" className="bk-link" onClick={avail.refresh}>{t('Qayta urinish')}</button>
                </span>
              ) : dayClosed ? (
                <span className="bk-note">{t('Bu kuni restoran yopiq. Boshqa kunni tanlang.')}</span>
              ) : loadingStates ? (
                <span className="bk-note">{t('Yuklanmoqda...')}</span>
              ) : (
                <span className="bk-note tabular-nums">
                  {freeTotal > 0 ? t("Bu kuni {n} ta stol bo'sh", { n: freeTotal }) : t("Bu kuni {n} kishiga bo'sh stol yo'q", { n: state.guests })}
                </span>
              )}
            </div>

            <div className={`bk-picker ${avail.loading ? 'is-loading' : ''}`} aria-busy={avail.loading || undefined}>
              {hall && view === 'plan' && <FloorPlan hall={hall} states={states} selectedId={state.tableId} onPick={pick} />}
              {hall && view === 'list' && <TableCards hall={hall} states={states} selectedId={state.tableId} onPick={pick} />}
            </div>

            <ul className="bk-legend" aria-hidden="true">
              <li><i className="bk-dot bk-dot--free" />{t("Bo'sh")}</li>
              <li><i className="bk-dot bk-dot--on" />{t('Tanlangan')}</li>
              <li><i className="bk-dot bk-dot--off" />{t('Band yoki mos emas')}</li>
            </ul>
          </section>

          {selectedTable && selectedHall && state.step === 'pick' && states.get(selectedTable.id)?.state === 'free' && (
            <div className="bk-continue bk-enter">
              <div className="bk-continue-text">
                <strong>{tableTitle(selectedTable.number)}</strong>
                <span>{hallName(selectedHall.name)} · {t("Ko'pi bilan {n} kishi", { n: selectedTable.capacity })}</span>
              </div>
              <button type="button" className="bk-btn bk-btn--primary" onClick={() => open(selectedTable)}>
                <span>{t('Davom etish')}</span>
                <Icon name="arrow" size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </>
      )}

      {state.step === 'form' && selectedTable && selectedHall && (
        <BookingSheet
          state={state}
          dispatch={dispatch}
          config={config}
          table={selectedTable}
          hall={selectedHall}
          days={days}
          closedDates={closedDates}
          avail={avail}
          onSubmit={() => dispatch({ type: 'submit', newId: newSubmissionId() })}
          onClose={closeSheet}
        />
      )}
    </>
  );
};

export const BookingPage: React.FC = () => {
  const { navigate, cartCount } = useNavigation();
  const { state, reload } = useBookingConfig();
  useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const shopName = state.status === 'ready' && state.config.shopName ? state.config.shopName : 'Guliston';

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = (
      <div className="bk-skeleton" aria-busy="true" aria-label={t('Yuklanmoqda...')}>
        <span className="bk-skel bk-skel--title" />
        <span className="bk-skel bk-skel--row" />
        <span className="bk-skel bk-skel--block" />
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div className="bk-card-block bk-empty" role="alert">
        <Icon name="clock" size={28} />
        <p>{t("Bron sahifasini yuklab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.")}</p>
        <div className="bk-actions">
          <button type="button" className="bk-btn bk-btn--primary" onClick={reload}>{t('Qayta urinish')}</button>
          <button type="button" className="bk-btn" onClick={() => navigate('/menu/')}>{t("Menyuga o'tish")}</button>
        </div>
      </div>
    );
  } else if (!state.config.enabled) {
    body = (
      <div className="bk-card-block bk-empty bk-closed" role="status">
        <Icon name="calendar" size={28} />
        <h1 className="bk-title bk-title--small">{t('Bron hozircha yopiq')}</h1>
        <p>{t("Hozir onlayn bron qabul qilinmayapti. Menyuni ko'rib, stol ustidagi QR kod orqali buyurtma bera olasiz.")}</p>
        <button type="button" className="bk-btn bk-btn--primary" onClick={() => navigate('/menu/')}>
          <span>{t("Menyuga o'tish")}</span>
          <Icon name="arrow" size={18} strokeWidth={2.5} />
        </button>
      </div>
    );
  } else {
    body = <BookingFlow config={state.config} />;
  }

  return (
    <div className="bk-root">
      <HeaderNav brandName={shopName} cartCount={cartCount} onCartClick={() => navigate('/cart')} />
      <main className="bk-main">{body}</main>
      <BottomNav
        activeTab="home"
        cartCount={cartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
