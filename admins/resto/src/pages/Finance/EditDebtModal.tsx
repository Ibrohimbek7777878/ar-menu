/**
 * Qarz / nasiyani tahrirlash oynasi: shaxs, telefon, summa, muddat, izoh (va to'lov yo'q bo'lsa yo'nalish).
 * Umumiy summa to'langan summadan kichik bo'lmaydi. Majburiy sabab va "nima o'zgaradi" xuddi kassa operatsiyasidagidek.
 */
import React, { useMemo, useState } from 'react';
import { Button, Modal, t } from '@admins/shared';
import type { DebtEditBody, DebtItem } from './api';
import {
  debtFieldOf,
  debtFormFromRow,
  debtPatchBody,
  debtStatusAfterAmount,
  debtTypeLocked,
  diffDebtForm,
  isReasonOk,
  isRecordGone,
  parseMoney,
  readEditFailure,
  validateDebtForm,
  type DebtField,
  type DebtFormValues,
} from './editModel';
import type { EditResult } from './EditTransactionModal';
import { ChangeSummary, Notice, ReasonField, TextAreaInput, TextInput, formatMoneyExact } from './EditParts';
import { chipStyle, gridStyle, hintStyle, labelStyle, scrollBodyStyle, stickyActionsStyle, tapButton } from './editStyles';

interface Props {
  debt: DebtItem;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (id: number, body: DebtEditBody) => Promise<EditResult>;
}

export const EditDebtModal: React.FC<Props> = ({ debt, submitting, onClose, onSubmit }) => {
  const [form, setForm] = useState<DebtFormValues>(() => debtFormFromRow(debt));
  const [reason, setReason] = useState('');
  const [serverErrors, setServerErrors] = useState<Partial<Record<DebtField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const typeLocked = debtTypeLocked(debt);

  const set = <K extends keyof DebtFormValues>(key: K, value: DebtFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setServerErrors({});
    setFormError(null);
  };

  const lines = useMemo(() => diffDebtForm(debt, form, t, formatMoneyExact), [debt, form]);
  const warning = useMemo(() => debtStatusAfterAmount(debt, form, t), [debt, form]);
  const errors = validateDebtForm(debt, form, reason);
  const valid = Object.keys(errors).length === 0 && isReasonOk(reason);
  const canSave = valid && lines.length > 0 && !locked && !submitting;

  const message = (field: DebtField): string | undefined => {
    const code = errors[field];
    if (code === 'below_paid') return t("Umumiy summa to'langan summadan ({sum}) kichik bo'lmasin", { sum: formatMoneyExact(debt.paid_amount) });
    if (code === 'invalid') return field === 'amount' ? t("To'g'ri qarz summasini kiriting") : t("Sanani to'g'ri kiriting");
    if (code === 'required') return t('Shaxs yoki tashkilot ismini kiriting');
    return serverErrors[field];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const result = await onSubmit(debt.id, debtPatchBody(debt, form, reason));
    if (result.success) {
      onClose();
      return;
    }
    const failure = result.failure ?? readEditFailure(null);
    const text = result.error || t('Xatolik yuz berdi');
    if (isRecordGone(failure)) {
      setLocked(true);
      setFormError(text);
      return;
    }
    const field = debtFieldOf(failure.field);
    if (field) setServerErrors({ [field]: text });
    else setFormError(text);
  };

  const parsedAmount = parseMoney(form.amount);

  return (
    <Modal isOpen onClose={onClose} title={t('Qarzni tahrirlash')} maxWidth="560px">
      <form onSubmit={submit} noValidate style={scrollBodyStyle}>
        {formError && <Notice tone="error">{formError}</Notice>}

        <div>
          <span style={labelStyle}>{t("Qarz yo'nalishi")}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label={t("Qarz yo'nalishi")}>
            {(['customer', 'supplier'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={typeLocked}
                aria-pressed={form.debtType === kind}
                onClick={() => set('debtType', kind)}
                style={{ ...chipStyle(form.debtType === kind), opacity: typeLocked && form.debtType !== kind ? 0.5 : 1, cursor: typeLocked ? 'not-allowed' : 'pointer' }}
              >
                {kind === 'customer' ? t('Mijoz Nasiyasi (Bizga beradi)') : t('Bizning qarzimiz (Yetkazib beruvchiga)')}
              </button>
            ))}
          </div>
          {typeLocked && <p style={hintStyle}>{t("To'lov qabul qilingan qarzning yo'nalishini o'zgartirib bo'lmaydi.")}</p>}
        </div>

        <div style={gridStyle}>
          <TextInput label={t('Shaxs / Tashkilot nomi')} value={form.personName} maxLength={150} onChange={(e) => set('personName', e.target.value)} error={message('personName')} />
          <TextInput label={t('Telefon raqami (Ixtiyoriy)')} type="tel" inputMode="tel" maxLength={50} value={form.phone} onChange={(e) => set('phone', e.target.value)} error={message('phone')} />
        </div>

        <div style={gridStyle}>
          <TextInput
            label={t("Qarz summasi (so'm)")}
            value={form.amount}
            inputMode="decimal"
            autoComplete="off"
            onChange={(e) => set('amount', e.target.value)}
            error={message('amount')}
            hint={
              debt.paid_amount > 0
                ? t("To'langan: {sum}. Umumiy summa bundan kam bo'lmaydi.", { sum: formatMoneyExact(debt.paid_amount) })
                : parsedAmount !== null
                  ? formatMoneyExact(parsedAmount)
                  : undefined
            }
          />
          <TextInput label={t('Qaytarish muddati')} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} error={message('dueDate')} hint={form.dueDate ? undefined : t('Muddat belgilanmagan')} />
        </div>

        <TextAreaInput label={t('Izoh / Tafsilot')} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} error={message('notes')} />

        <ChangeSummary lines={lines} warning={warning} />

        <ReasonField value={reason} onChange={(v) => { setReason(v); setServerErrors({}); }} serverError={serverErrors.reason} />

        <div style={stickyActionsStyle}>
          <Button type="button" variant="ghost" onClick={onClose} style={tapButton}>
            {t('Bekor qilish')}
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSave} style={tapButton}>
            {t('Saqlash')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
