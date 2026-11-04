/**
 * Moliya yozuvining o'zgarish tarixi: har versiya (kim, qachon, sabab, o'zgargan maydonlar eski -> yangi), eng pastda "Asl qiymat".
 * Tarix o'zgartirilmaydi va o'chirilmaydi: oynada faqat o'qish.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal, formatHumanDateTime, t } from '@admins/shared';
import { fetchDebtHistory, fetchTransactionHistory, type HistoryResponse } from './api';
import { isLegacyReason, originalLines, revisionLines, type HistoryKind } from './editModel';
import { ChangeRow, formatMoneyExact } from './EditParts';
import { hintStyle, noticeStyle, panelStyle, scrollBodyStyle, tapButton } from './editStyles';
import { roleLabel } from '../../i18n/uz';

interface Props {
  kind: HistoryKind;
  id: number;
  /** Yozuv nomi (sarlavha ostida) */
  subject: string;
  onClose: () => void;
}

/** Tarix ro'yxati va "Asl qiymat" (yuklangan ma'lumotdan; yuklashsiz sinash uchun alohida) */
export const HistoryBody: React.FC<{ kind: HistoryKind; data: HistoryResponse }> = ({ kind, data }) => (
  <>
    {data.results.length === 0 ? (
      <p style={hintStyle}>{t('Bu yozuv hali tahrirlanmagan.')}</p>
    ) : (
      data.results.map((rev) => (
        <article key={rev.id} aria-label={t('{n}-tahrir', { n: rev.revision_no })} style={panelStyle}>
          <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4px 12px' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{t('{n}-tahrir', { n: rev.revision_no })}</strong>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {rev.changed_by.name ? `${rev.changed_by.name} (${roleLabel(rev.changed_by.role)})` : roleLabel(rev.changed_by.role)} · {formatHumanDateTime(rev.changed_at, { alwaysTime: true })}
            </span>
          </header>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{t('Sabab: {reason}', { reason: isLegacyReason(rev.reason) ? t("Eski panel orqali o'zgartirildi (sabab so'ralmagan)") : rev.reason })}</p>
          {revisionLines(kind, rev, t, formatMoneyExact).map((line) => (
            <ChangeRow key={line.field} line={line} />
          ))}
        </article>
      ))
    )}

    <section aria-label={t('Asl qiymat')} style={{ ...panelStyle, borderStyle: 'dashed' }}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{t('Asl qiymat')}</h4>
      <p style={{ ...hintStyle, margin: 0 }}>
        {data.results.length === 0 ? t("Hali o'zgartirilmagan: bular joriy qiymatlar.") : t('Birinchi tahrirdan oldin shunday edi.')}
      </p>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', gap: '6px 12px', fontSize: '14px' }}>
        {originalLines(kind, data.original, t, formatMoneyExact).map((row) => (
          <React.Fragment key={row.field}>
            <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</dt>
            <dd style={{ margin: 0, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{row.value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>

    <p style={hintStyle}>{t("Tarix o'zgartirilmaydi va o'chirilmaydi.")}</p>
  </>
);

export const HistoryModal: React.FC<Props> = ({ kind, id, subject, onClose }) => {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await (kind === 'transaction' ? fetchTransactionHistory(id) : fetchDebtHistory(id)));
    } catch (err) {
      const text = err instanceof Error && err.message ? t(err.message) : '';
      setError(text || t('Xatolik yuz berdi'));
    } finally {
      setLoading(false);
    }
  }, [kind, id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Modal isOpen onClose={onClose} title={t("O'zgarishlar tarixi")} maxWidth="600px">
      <div style={scrollBodyStyle}>
        {subject && <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{subject}</p>}

        {loading && <p style={hintStyle}>{t('Yuklanmoqda...')}</p>}

        {error && (
          <div role="alert" style={noticeStyle('error')}>
            <span style={{ flex: 1 }}>{error}</span>
            <Button type="button" variant="secondary" onClick={() => void load()} style={tapButton}>
              {t('Qayta yuklash')}
            </Button>
          </div>
        )}

        {data && !loading && <HistoryBody kind={kind} data={data} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="primary" onClick={onClose} style={tapButton}>
            {t('Yopish')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
