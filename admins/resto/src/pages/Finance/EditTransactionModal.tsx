/**
 * Qo'lda kiritilgan kirim/chiqimni tahrirlash oynasi: joriy qiymatlar, "nima o'zgaradi" (eski -> yangi), MAJBURIY sabab.
 * "Saqlash" faqat kamida bitta maydon o'zgarganda va sabab (5+ belgi) yozilganda yoqiladi.
 */
import React, { useMemo, useState } from 'react';
import { Button, Modal, t } from '@admins/shared';
import type { CategoryItem, FinanceTransaction, TransactionEditBody } from './api';
import {
  diffTxForm,
  isReasonOk,
  isRecordGone,
  moneyImpact,
  parseMoney,
  readEditFailure,
  txFieldOf,
  txFormFromRow,
  txPatchBody,
  validateTxForm,
  type EditFailure,
  type TxField,
  type TxFormValues,
} from './editModel';
import { ChangeSummary, Notice, ReasonField, SelectInput, TextAreaInput, TextInput, formatMoneyExact, tashkentToday } from './EditParts';
import { gridStyle, scrollBodyStyle, stickyActionsStyle, tapButton } from './editStyles';

export interface EditResult {
  success: boolean;
  /** Server xabari (tilga o'girilgan) yoki umumiy xato matni */
  error?: string;
  failure?: EditFailure;
}

interface Props {
  tx: FinanceTransaction;
  categories: CategoryItem[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (id: number, body: TransactionEditBody) => Promise<EditResult>;
}

const ERROR_TEXT: Record<string, (field: TxField) => string> = {
  required: (field) => (field === 'title' ? t('Tranzaksiya mazmunini kiriting') : t('Xatolik yuz berdi')),
  invalid: (field) => (field === 'amount' ? t("To'g'ri summa kiriting") : t("Sanani to'g'ri kiriting")),
  future: () => t("Sana kelajakda bo'lishi mumkin emas"),
};

export const EditTransactionModal: React.FC<Props> = ({ tx, categories, submitting, onClose, onSubmit }) => {
  const [form, setForm] = useState<TxFormValues>(() => txFormFromRow(tx));
  const [reason, setReason] = useState('');
  const [serverErrors, setServerErrors] = useState<Partial<Record<TxField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const today = useMemo(tashkentToday, []);

  const set = <K extends keyof TxFormValues>(key: K, value: TxFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setServerErrors({});
    setFormError(null);
  };

  const lines = useMemo(() => diffTxForm(tx, form, categories, t, formatMoneyExact), [tx, form, categories]);
  const impact = useMemo(() => moneyImpact(tx, form, t, formatMoneyExact), [tx, form]);
  const errors = validateTxForm(form, reason, today);
  const valid = Object.keys(errors).length === 0 && isReasonOk(reason);
  const canSave = valid && lines.length > 0 && !locked && !submitting;
  const message = (field: TxField): string | undefined => {
    const code = errors[field];
    if (field !== 'reason' && code && ERROR_TEXT[code]) return ERROR_TEXT[code](field);
    return serverErrors[field];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const result = await onSubmit(tx.id, txPatchBody(tx, form, reason));
    if (result.success) {
      onClose();
      return;
    }
    const failure = result.failure ?? readEditFailure(null);
    const text = result.error || t('Xatolik yuz berdi');
    if (isRecordGone(failure)) {
      setLocked(true);                                       // yozuv o'zgargan yoki qulflangan: qayta ochish kerak
      setFormError(text);
      return;
    }
    const field = txFieldOf(failure.field);
    if (field) setServerErrors({ [field]: text });
    else setFormError(text);
  };

  return (
    <Modal isOpen onClose={onClose} title={t('Operatsiyani tahrirlash')} maxWidth="560px">
      <form onSubmit={submit} noValidate style={scrollBodyStyle}>
        {formError && <Notice tone="error">{formError}</Notice>}

        <div style={gridStyle}>
          <TextInput
            label={t("Summa (so'm)")}
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            error={message('amount')}
            hint={parseMoney(form.amount) !== null ? formatMoneyExact(parseMoney(form.amount) as number) : undefined}
          />
          <SelectInput label={t("To'lov usuli")} value={form.method} onChange={(e) => set('method', e.target.value as TxFormValues['method'])}>
            <option value="cash">{t('Naqd pul')}</option>
            <option value="card">{t('Plastik / Karta')}</option>
            <option value="bank">{t('Bank hisobi')}</option>
          </SelectInput>
        </div>

        <TextInput label={t('Mazmuni / Sarlavha')} value={form.title} maxLength={255} onChange={(e) => set('title', e.target.value)} error={message('title')} />

        <div style={gridStyle}>
          <SelectInput label={t('Kategoriya')} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} error={message('category')}>
            <option value="">{t('Umumiy')}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {t(c.name)}
              </option>
            ))}
          </SelectInput>
          <TextInput label={t('Sana')} type="date" max={today} value={form.txDate} onChange={(e) => set('txDate', e.target.value)} error={message('txDate')} />
        </div>

        <TextAreaInput label={t('Izoh')} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} error={message('notes')} />

        <ChangeSummary lines={lines} impact={impact} />

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
