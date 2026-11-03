import React, { useState } from 'react';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { Button, Card, Modal } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { TAP, mutedTextStyle } from './styles';
import { fill } from './text';
import type { CommitResponse } from './types';
import type { UndoState } from './useBulkImport';

const t = restoUz.bulkImport.done;

interface DoneStepProps {
  result: CommitResponse;
  /** Tasdiqlashdan oldingi o'tkazib yuborilgan qatorlar (belgisi olingan va "o'tkazib yuborish" tanlanganlar). */
  skipped: number;
  undo: UndoState;
  onUndo: () => void;
  onGoToMenu: () => void;
  onAddMore: () => void;
}

export const DoneStep: React.FC<DoneStepProps> = ({ result, skipped, undo, onUndo, onGoToMenu, onAddMore }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const undone = undo.status === 'done';
  const working = undo.status === 'working';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={32} style={{ color: 'var(--accent-emerald)' }} />
          <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-main)' }}>{t.title}</h2>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '15px' }}>
          <li>{fill(t.created, { n: result.created })}</li>
          {result.updated > 0 && <li>{fill(t.updated, { n: result.updated })}</li>}
          {skipped + result.skipped > 0 && <li>{fill(t.skipped, { n: skipped + result.skipped })}</li>}
          {result.categories_created?.length > 0 && (
            <li>{fill(t.categories, { names: result.categories_created.join(', ') })}</li>
          )}
        </ul>

        {undone && (
          <p role="status" style={{ ...mutedTextStyle, color: 'var(--accent-emerald)', fontWeight: 600 }}>
            {fill(t.undone, { n: undo.archived })}
          </p>
        )}
        {undo.status === 'error' && (
          <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)', fontWeight: 600 }}>
            {t.undoFailed} {undo.message}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <Button type="button" variant="primary" size="lg" onClick={onGoToMenu} style={{ minHeight: TAP }}>
            {t.goToMenu}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onAddMore} style={{ minHeight: TAP }}>
            {t.addMore}
          </Button>
          {!undone && result.created > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              loading={working}
              onClick={() => setConfirmOpen(true)}
              icon={<Undo2 size={18} />}
              style={{ minHeight: TAP }}
            >
              {working ? t.undoWorking : t.undo}
            </Button>
          )}
        </div>
      </Card>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title={t.undoTitle} maxWidth="460px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ ...mutedTextStyle, color: 'var(--text-main)' }}>{t.undoText}</p>
          {result.updated > 0 && <p style={mutedTextStyle}>{fill(t.undoUpdatedNote, { n: result.updated })}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} style={{ minHeight: TAP }}>
              {t.undoCancel}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setConfirmOpen(false);
                onUndo();
              }}
              style={{ minHeight: TAP }}
            >
              {t.undoConfirm}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
