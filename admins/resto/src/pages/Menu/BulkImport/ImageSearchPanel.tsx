import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Search, X } from 'lucide-react';
import { Button } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { pickImage, searchImages } from './api';
import { extractFailure, failureKind } from './errors';
import { choiceFromPick, cleanQuery, creditLine, safeHttpUrl } from './images';
import { fill } from './text';
import { TAP, inputStyle, labelStyle, mutedTextStyle } from './styles';
import type { ImageChoice, ImageSearchResult } from './types';

const t = restoUz.bulkImport.images;

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'down' | 'limited';

interface ImageSearchPanelProps {
  /** Qidiruv so'zi sifatida taom nomi (bo'sh bo'lsa odam o'zi yozadi). */
  initialQuery: string;
  onPicked: (choice: ImageChoice) => void;
  onClose: () => void;
}

/**
 * Internetdan rasm topish: nom bo'yicha qidiradi, litsenziyali variantlarni muallifi bilan ko'rsatadi, tanlanganini
 * serverga yuklatadi (server rasmni o'zi oladi va vaqtincha saqlaydi). Modal emas, balki joyida ochiladi:
 * taom formasi (Modal) ichida ham ishlashi uchun.
 */
export const ImageSearchPanel: React.FC<ImageSearchPanelProps> = ({ initialQuery, onPicked, onClose }) => {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState(false);
  const [emptyQuery, setEmptyQuery] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const run = useCallback(async (text: string) => {
    const cleaned = cleanQuery(text);
    if (!cleaned) {
      setEmptyQuery(true);
      return;
    }
    setEmptyQuery(false);
    setPickError(false);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    try {
      const response = await searchImages(cleaned, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setResults(response.results);
      setStatus(response.results.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) return;
      const kind = failureKind(extractFailure(error));
      setResults([]);
      setStatus(kind === 'rate_limited' ? 'limited' : 'down');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (cleanQuery(initialQuery)) void run(initialQuery);
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
    // Panel ochilganda bir marta qidiriladi (keyingi qidiruvlar tugma bilan)
  }, []);

  const handlePick = async (result: ImageSearchResult) => {
    if (picking) return;
    setPicking(result.id);
    setPickError(false);
    try {
      const response = await pickImage(result);
      if (!mountedRef.current) return;
      onPicked(choiceFromPick(response, result, t));
    } catch {
      if (mountedRef.current) {
        setPickError(true);
        setPicking(null);
      }
    }
  };

  const loading = status === 'loading';

  return (
    <div
      role="region"
      aria-label={t.searchTitle}
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{t.searchTitle}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          title={t.close}
          style={{
            minWidth: TAP,
            minHeight: TAP,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div>
        <label style={labelStyle} htmlFor="bulk-image-query">
          {t.searchLabel}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            id="bulk-image-query"
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Taom formasi ichida Enter formani yuborib yubormasin
              if (e.key === 'Enter') {
                e.preventDefault();
                void run(query);
              }
            }}
            style={{ ...inputStyle, flex: '1 1 180px', width: 'auto' }}
          />
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={() => void run(query)}
            icon={<Search size={16} />}
            style={{ minHeight: TAP }}
          >
            {t.searchButton}
          </Button>
        </div>
        {emptyQuery && <p style={{ ...mutedTextStyle, color: 'var(--accent-rose)', marginTop: 6 }}>{t.emptyQuery}</p>}
      </div>

      {loading && <p style={mutedTextStyle}>{t.searching}</p>}
      {status === 'empty' && <p style={mutedTextStyle}>{t.empty}</p>}
      {status === 'down' && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
          {t.down}
        </p>
      )}
      {status === 'limited' && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
          {t.rateLimited}
        </p>
      )}
      {pickError && (
        <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
          {t.pickFailed}
        </p>
      )}

      {status === 'ready' && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
            maxHeight: '420px',
            overflowY: 'auto',
          }}
        >
          {results.map((result) => {
            const source = safeHttpUrl(result.source_url);
            const title = result.title?.trim() || t.untitled;
            const isPicking = picking === result.id;
            return (
              <li key={result.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <button
                  type="button"
                  disabled={picking !== null}
                  onClick={() => void handlePick(result)}
                  aria-label={fill(t.chooseAria, { title })}
                  style={{
                    padding: 0,
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--bg-elevated)',
                    cursor: picking ? 'wait' : 'pointer',
                    aspectRatio: '4 / 3',
                    minHeight: TAP,
                    position: 'relative',
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
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--scrim)',
                        color: 'var(--text-inverse)',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '4px',
                        textAlign: 'center',
                      }}
                    >
                      {t.picking}
                    </span>
                  )}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                  {creditLine(result.creator, result.license, t)}
                </span>
                {source && (
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t.sourceLinkAria}: ${title}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: TAP,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent-amber)',
                    }}
                  >
                    <ExternalLink size={13} />
                    {t.sourceLink}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p style={{ ...mutedTextStyle, fontSize: '12px' }}>{t.footnote}</p>
    </div>
  );
};
