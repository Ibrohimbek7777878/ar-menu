import React, { useMemo, useState } from 'react';
import { Button, Card, Skeleton, t, useToast } from '@admins/shared';
import { Save, Undo2, WandSparkles } from 'lucide-react';
import { EventTypesEditor } from './EventTypesEditor';
import { issueText, weekdayFull } from './labels';
import { AddRow } from './SettingsParts';
import { SlotGroupEditor } from './SlotGroupEditor';
import { LIMITS, addSlotGroup, canAddGroup, removeSlotGroup, toggleClosedWeekday } from './settingsModel';
import { errorTextStyle, hintStyle, sectionTitleStyle, stickyBarStyle, tapButton, toggleChipStyle } from './styles';
import type { BookingConfig } from './types';
import { ConfirmDialog, Notice, NumberField, SwitchRow } from './ui';
import type { useBookingSettings } from './useBookingSettings';

interface Props {
  settings: ReturnType<typeof useBookingSettings>;
}

const sectionGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '14px' };

/** "Bron sozlamalari" tabi: vaqt oraliqlari, tadbir turlari va qoidalar muharriri. Saqlash tugmasi o'zgarish bo'lsa faol. */
export const SettingsTab: React.FC<Props> = ({ settings }) => {
  const { draft, loading, loadFailure, saving, submitted, serverIssue, changes, dirty, issues } = settings;
  const { showToast } = useToast();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  // Yo'l -> xabar. Server xatosi doim ko'rinadi; mijoz tekshiruvi faqat "Saqlash" bosilgandan keyin
  const messages = useMemo(() => {
    const map = new Map<string, string>();
    if (submitted) for (const issue of issues) if (!map.has(issue.path)) map.set(issue.path, issueText(issue));
    if (serverIssue?.path) map.set(serverIssue.path, serverIssue.message ? t(serverIssue.message) : t("Bu maydonda xato bor"));
    return map;
  }, [issues, submitted, serverIssue]);
  const messageFor = (path: string) => messages.get(path);

  if (loading && !draft) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy="true">
        <Skeleton height="72px" borderRadius="var(--radius-lg)" />
        <Skeleton height="260px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (!draft) {
    return (
      <Notice tone="error">
        <span>{loadFailure?.forbidden ? t("Bron sozlamalarini ko'rishga ruxsatingiz yo'q.") : loadFailure?.message ? t(loadFailure.message) : t("Bron sozlamalarini yuklab bo'lmadi.")}</span>{' '}
        {!loadFailure?.forbidden && (
          <button
            type="button"
            onClick={() => void settings.reload()}
            style={{ minHeight: 44, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('Qayta urinish')}
          </button>
        )}
      </Notice>
    );
  }

  const commit = (next: BookingConfig) => settings.edit(() => next);

  const save = async () => {
    const result = await settings.save();
    if (result.status === 'saved') showToast(t('Bron sozlamalari saqlandi'), 'success');
    else if (result.status === 'invalid') showToast(t("Belgilangan maydonlarni tuzating, so'ng saqlang"), 'error');
    else showToast(result.failure.forbidden ? t("Sozlamalarni o'zgartirishga ruxsatingiz yo'q") : result.failure.message ? t(result.failure.message) : t("Saqlab bo'lmadi. Qayta urinib ko'ring."), 'error');
  };

  const removing = removeIndex !== null ? draft.slots[removeIndex] : null;
  const generalMessages = [messageFor('slots'), messageFor('closed_weekdays')].filter(Boolean) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <fieldset disabled={saving} style={{ margin: 0, padding: 0, border: 'none', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card>
          <SwitchRow
            label={t('Bron yoqilgan')}
            hint={t("O'chirilsa mehmonlar sayt orqali bron qila olmaydi. Mavjud bronlar saqlanadi.")}
            checked={draft.enabled}
            onChange={(enabled) => commit({ ...draft, enabled })}
          />
        </Card>

        {/* Vaqt oraliqlari */}
        <Card style={sectionGap}>
          <div>
            <h2 style={sectionTitleStyle}>{t('Vaqt oraliqlari')}</h2>
            <p style={hintStyle}>{t("Mehmon bron qilganda shu vaqtlardan birini tanlaydi. Masalan: «Tushlik» va «Kechki ovqat».")}</p>
          </div>
          {draft.slots.length === 0 && <p style={{ ...hintStyle, margin: 0 }}>{t("Hozircha vaqt guruhi yo'q. Pastdan qo'shing.")}</p>}
          {draft.slots.map((group, index) => (
            <SlotGroupEditor
              key={group.key}
              config={draft}
              index={index}
              messageFor={messageFor}
              commit={commit}
              onRequestRemove={(i) => (draft.slots[i].times.length === 0 ? commit(removeSlotGroup(draft, i)) : setRemoveIndex(i))}
            />
          ))}
          {generalMessages.map((text) => (
            <p key={text} role="alert" style={errorTextStyle}>
              {text}
            </p>
          ))}
          <AddRow
            label={t("Yangi vaqt guruhi qo'shish")}
            placeholder={t('Masalan: Nonushta')}
            buttonLabel={t("Qo'shish")}
            disabled={!canAddGroup(draft)}
            onAdd={(label) => commit(addSlotGroup(draft, label))}
            hint={!canAddGroup(draft) ? t('Guruhlar {max} tadan oshmasin.', { max: LIMITS.groups }) : undefined}
          />
        </Card>

        {/* Tadbir turlari */}
        <Card style={sectionGap}>
          <div>
            <h2 style={sectionTitleStyle}>{t('Tadbir turlari')}</h2>
            <p style={hintStyle}>{t("Mehmon bron qilayotganda tadbir turini tanlaydi (tug'ilgan kun, yubiley va h.k.).")}</p>
          </div>
          <EventTypesEditor config={draft} messageFor={messageFor} commit={commit} />
        </Card>

        {/* Qoidalar */}
        <Card style={sectionGap}>
          <h2 style={sectionTitleStyle}>{t('Bron qoidalari')}</h2>
          <NumberField
            label={t('Bitta bron stolni qancha band qiladi')}
            unit={t('daqiqa')}
            value={draft.duration_minutes}
            onChange={(duration_minutes) => commit({ ...draft, duration_minutes })}
            error={messageFor('duration_minutes')}
            hint={t("Shu vaqt ichida o'sha stolga boshqa bron qilib bo'lmaydi.")}
          />
          <NumberField
            label={t('Necha kun oldinga bron qilish mumkin')}
            unit={t('kun')}
            value={draft.max_days_ahead}
            onChange={(max_days_ahead) => commit({ ...draft, max_days_ahead })}
            error={messageFor('max_days_ahead')}
          />
          <NumberField
            label={t('Bronni kamida qancha oldin qilish kerak')}
            unit={t('daqiqa')}
            value={draft.min_notice_minutes}
            onChange={(min_notice_minutes) => commit({ ...draft, min_notice_minutes })}
            error={messageFor('min_notice_minutes')}
            hint={t("0 bo'lsa mehmon istalgan paytda bron qila oladi.")}
          />
          <SwitchRow
            label={t('Avtomatik tasdiqlash')}
            hint={t("Yoqilsa mehmonning bronlari darhol «Tasdiqlangan» bo'ladi. O'chiq bo'lsa siz tasdiqlaguningizcha «Kutilmoqda» turadi.")}
            checked={draft.auto_confirm}
            onChange={(auto_confirm) => commit({ ...draft, auto_confirm })}
          />
          <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
            <legend style={{ padding: 0, marginBottom: 4, fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{t('Dam olish kunlari')}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                const closed = draft.closed_weekdays.includes(weekday);
                return (
                  <button key={weekday} type="button" aria-pressed={closed} onClick={() => commit(toggleClosedWeekday(draft, weekday))} style={toggleChipStyle(closed)}>
                    {weekdayFull(weekday)}
                  </button>
                );
              })}
            </div>
            <p style={hintStyle}>{t("Belgilangan kunlarda mehmon bron qila olmaydi. Hech narsa belgilanmasa, bron har kuni ochiq.")}</p>
          </fieldset>
        </Card>
      </fieldset>

      {/* Saqlash paneli */}
      <div style={stickyBarStyle}>
        <div style={{ flex: '1 1 160px', minWidth: 0, fontSize: '14px', color: dirty ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: dirty ? 700 : 500 }} role="status">
          {dirty ? t("Saqlanmagan o'zgarishlar: {n} ta", { n: changes.length }) : t("O'zgarish yo'q")}
        </div>
        {serverIssue && !serverIssue.path && (
          <div style={{ flexBasis: '100%' }}>
            <Notice tone="error">{serverIssue.message ? t(serverIssue.message) : t("Saqlab bo'lmadi")}</Notice>
          </div>
        )}
        <Button variant="secondary" onClick={() => setPresetOpen(true)} disabled={saving} style={tapButton}>
          <WandSparkles size={18} aria-hidden="true" />
          {t('Tayyor andoza')}
        </Button>
        <Button variant="secondary" onClick={settings.discard} disabled={!dirty || saving} style={tapButton}>
          <Undo2 size={18} aria-hidden="true" />
          {t("O'zgarishlarni bekor qilish")}
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty} loading={saving} style={tapButton}>
          <Save size={18} aria-hidden="true" />
          {t('Saqlash')}
        </Button>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={t('Guruhni olib tashlaymizmi?')}
        message={removing ? t("«{name}» guruhi va undagi {n} ta vaqt olib tashlanadi. «Saqlash» bosilmaguncha o'zgarish serverga yetmaydi.", { name: removing.label || t('Nomsiz guruh'), n: removing.times.length }) : ''}
        confirmLabel={t('Ha, olib tashlash')}
        danger
        onConfirm={() => {
          if (removeIndex !== null) commit(removeSlotGroup(draft, removeIndex));
          setRemoveIndex(null);
        }}
        onCancel={() => setRemoveIndex(null)}
      />
      <ConfirmDialog
        open={presetOpen}
        title={t('Tayyor andozani qaytaramizmi?')}
        message={t("Vaqt oraliqlari (tushlik, kechki ovqat), tadbir turlari va qoidalar standart to'plamga almashtiriladi. «Saqlash» bosilmaguncha o'zgarish serverga yetmaydi, xohlasangiz «O'zgarishlarni bekor qilish» bilan qaytarasiz.")}
        confirmLabel={t('Ha, andozani qaytarish')}
        onConfirm={() => {
          settings.applyPreset();
          setPresetOpen(false);
        }}
        onCancel={() => setPresetOpen(false)}
      />
    </div>
  );
};
