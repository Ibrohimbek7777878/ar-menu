import React from 'react';
import { X } from 'lucide-react';
import { restoUz } from '../../../i18n/uz';
import { creditLine, safeHttpUrl } from '../BulkImport/images';
import { TAP, mutedTextStyle } from '../BulkImport/styles';
import { fill } from '../BulkImport/text';
import type { ImageSearchResult } from '../BulkImport/types';
import { Spinner } from './Motion';
import type { SuggestPhase } from './useAutoSearch';

const t = restoUz.dishForm.suggest;
const licenseTexts = restoUz.bulkImport.images;

interface SuggestionStripProps {
  phase: SuggestPhase;
  results: ImageSearchResult[];
  query: string;
  picking: string[];
  pickFailed: boolean;
  onPick: (result: ImageSearchResult) => void;
  onClose: () => void;
}

const THUMB_WIDTH = 148;

/**
 * Nom yozilgach internetdan topilgan rasm takliflari: kichik gorizontal ro'yxat (rasm + muallif · litsenziya).
 * Bir rasm yuklanayotganda (10-12 soniya) boshqalari bloklanmaydi: shu rasm ustida aylanuvchi belgi turadi.
 * Xatolar tinch: qizil emas, oddiy yumshoq yozuv.
 */
export const SuggestionStrip: React.FC<SuggestionStripProps> = ({ phase, results, query, picking, pickFailed, onPick, onClose }) => {
  if (phase === 'idle') return null;

  return (
    <section
      aria-label={fill(t.title, { name: query })}
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-elevated)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4, overflowWrap: 'anywhere' }}>
          {fill(t.title, { name: query })}
        </strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          title={t.close}
          style={{
            minWidth: TAP,
            minHeight: TAP,
            margin: '-10px -10px 0 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {phase === 'loading' && (
        <p role="status" style={{ ...mutedTextStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner size={14} /> {t.loading}
        </p>
      )}
      {phase === 'empty' && <p style={mutedTextStyle}>{fill(t.empty, { name: query })}</p>}
      {phase === 'down' && <p style={mutedTextStyle}>{t.down}</p>}
      {phase === 'limited' && <p style={mutedTextStyle}>{t.limited}</p>}

      {phase === 'ready' && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 0 6px',
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollSnapType: 'x proximity',
          }}
        >
          {results.map((result) => {
            const title = result.title?.trim() || t.untitled;
            const isPicking = picking.includes(result.id);
            return (
              <li
                key={result.id}
                style={{ flex: `0 0 ${THUMB_WIDTH}px`, display: 'flex', flexDirection: 'column', gap: '6px', scrollSnapAlign: 'start', minWidth: 0 }}
              >
                <button
                  type="button"
                  onClick={() => onPick(result)}
                  disabled={isPicking}
                  aria-label={fill(t.chooseAria, { title })}
                  style={{
                    position: 'relative',
                    width: THUMB_WIDTH,
                    aspectRatio: '4 / 3',
                    padding: 0,
                    overflow: 'hidden',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: isPicking ? 'wait' : 'pointer',
                  }}
                >
                  <img
                    src={safeHttpUrl(result.thumb)}
                    alt={title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {isPicking && (
                    <span
                      role="status"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '4px',
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
                      }}
                    >
                      <Spinner size={16} /> {t.picking}
                    </span>
                  )}
                </button>
                <span style={{ fontSize: '12px', lineHeight: 1.35, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                  {creditLine(result.creator, result.license, licenseTexts)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pickFailed && <p style={mutedTextStyle}>{t.pickFailed}</p>}
    </section>
  );
};
