import React from 'react';
import { Button, Modal } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { TAP, mutedTextStyle } from './styles';
import { fill } from './text';
import type { PlanSummary } from './types';

const t = restoUz.bulkImport.commit;

interface SummaryDialogProps {
  isOpen: boolean;
  plan: PlanSummary;
  working: boolean;
  /** Yozishda chiqqan umumiy xato (qator xatolari bo'lsa oyna yopiladi va ular jadvalda ko'rsatiladi). */
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** "Tasdiqlash" bosilganda: nima yozilishining jamlamasi. Faqat shundan keyin menyuga yoziladi. */
export const SummaryDialog: React.FC<SummaryDialogProps> = ({ isOpen, plan, working, errorMessage, onConfirm, onClose }) => (
  <Modal isOpen={isOpen} onClose={working ? () => undefined : onClose} title={t.summaryTitle} maxWidth="460px">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ ...mutedTextStyle, color: 'var(--text-main)', fontWeight: 600 }}>{t.summaryIntro}</p>
      <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '15px' }}>
        <li>{fill(t.summaryCreated, { n: plan.created })}</li>
        {plan.updated > 0 && <li>{fill(t.summaryUpdated, { n: plan.updated })}</li>}
        {plan.skipped > 0 && <li>{fill(t.summarySkipped, { n: plan.skipped })}</li>}
        {plan.newCategories.length > 0 && (
          <li>{fill(t.summaryCategories, { names: plan.newCategories.join(', ') })}</li>
        )}
      </ul>
      <p style={mutedTextStyle}>{t.summaryNote}</p>
      {errorMessage && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)', fontWeight: 600 }}>
          {errorMessage}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
        <Button type="button" variant="secondary" disabled={working} onClick={onClose} style={{ minHeight: TAP }}>
          {t.back}
        </Button>
        <Button type="button" variant="primary" loading={working} onClick={onConfirm} style={{ minHeight: TAP }}>
          {working ? t.working : t.confirm}
        </Button>
      </div>
    </div>
  </Modal>
);
