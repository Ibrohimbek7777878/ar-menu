import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { DoneStep } from './DoneStep';
import { InputStep } from './InputStep';
import { ReviewStep } from './ReviewStep';
import { SummaryDialog } from './SummaryDialog';
import { TAP, mutedTextStyle } from './styles';
import { useBulkImport } from './useBulkImport';
import type { Step } from './useBulkImport';

const t = restoUz.bulkImport;

const STEP_ORDER: Step[] = ['input', 'review', 'done'];

interface BulkImportScreenProps {
  /** Menyu ro'yxatiga qaytish (ro'yxat qayta yuklanadi: yangi taomlar va bo'limlar ko'rinadi). */
  onClose: () => void;
}

/** "Ommaviy qo'shish": 1) fayl/rasm/matn tashlash -> 2) tekshirish jadvali -> 3) tasdiqlash va natija. */
export const BulkImportScreen: React.FC<BulkImportScreenProps> = ({ onClose }) => {
  const bulk = useBulkImport();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Bosqich almashganda sahifa tepasiga qaytamiz (50 qatorlik ro'yxatdan keyin natija ko'rinmay qolmasin)
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [bulk.step]);

  const confirmDiscard = (): boolean => bulk.rows.length === 0 || window.confirm(t.discardConfirm);

  const handleBack = () => {
    // Tasdiqlanmagan qatorlar bor bo'lsa (tekshirish yoki "yana qo'shish" bosqichida) yo'qolishidan oldin so'raymiz
    if (bulk.step !== 'done' && !confirmDiscard()) return;
    onClose();
  };

  const handleStartOver = () => {
    if (!confirmDiscard()) return;
    bulk.reset();
  };

  const handleConfirm = async () => {
    const outcome = await bulk.commit();
    // Qator xatolari jadvalda qizil ko'rinadi; oyna yopiladi. Boshqa xatoda oyna ochiq qoladi va xabar ko'rsatiladi.
    if (outcome === 'done' || outcome === 'rows' || outcome === 'blocked') setSummaryOpen(false);
  };

  const stepIndex = STEP_ORDER.indexOf(bulk.step);

  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 1200, margin: '0 auto' }}>
      <div ref={topRef} style={{ scrollMarginTop: '16px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        <Button type="button" variant="secondary" onClick={handleBack} icon={<ArrowLeft size={16} />} style={{ minHeight: TAP }}>
          {t.backToMenu}
        </Button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>{t.title}</h1>
        </div>
      </div>
      <p style={{ ...mutedTextStyle, maxWidth: 760 }}>{t.subtitle}</p>

      <ol
        aria-label={t.title}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}
      >
        {STEP_ORDER.map((step, index) => {
          const active = index === stepIndex;
          const passed = index < stepIndex;
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--border-subtle)',
                backgroundColor: active ? 'var(--action)' : passed ? 'var(--accent-emerald-bg)' : 'var(--bg-surface)',
                color: active ? '#ffffff' : passed ? 'var(--accent-emerald)' : 'var(--text-muted)',
              }}
            >
              {index + 1}. {t.steps[step]}
            </li>
          );
        })}
      </ol>

      {bulk.step === 'input' && (
        <InputStep
          busy={bulk.parsing}
          progress={bulk.progress}
          problems={bulk.problems}
          existingCount={bulk.rows.length}
          onFiles={bulk.addFiles}
          onText={bulk.addText}
          onStop={bulk.stopParsing}
          onBackToReview={bulk.backToReview}
        />
      )}

      {bulk.step === 'review' && (
        <>
          <ReviewStep
            bulk={bulk}
            onAddMore={bulk.openInput}
            onStartOver={handleStartOver}
            onCommit={() => {
              bulk.clearCommitMessage();
              setSummaryOpen(true);
            }}
          />
          <SummaryDialog
            isOpen={summaryOpen}
            plan={bulk.plan}
            working={bulk.committing}
            errorMessage={bulk.commitMessage}
            onConfirm={() => void handleConfirm()}
            onClose={() => setSummaryOpen(false)}
          />
        </>
      )}

      {bulk.step === 'done' && bulk.result && (
        <DoneStep
          result={bulk.result}
          skipped={bulk.plan.skipped}
          undo={bulk.undo}
          onUndo={() => void bulk.undoLast()}
          onGoToMenu={onClose}
          onAddMore={bulk.reset}
        />
      )}
    </div>
  );
};

export default BulkImportScreen;
