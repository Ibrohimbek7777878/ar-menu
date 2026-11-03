import React, { useRef, useState } from 'react';
import { Camera, ClipboardPaste, FileUp, Info } from 'lucide-react';
import { Button, Card } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { FILE_ACCEPT, MAX_TEXT_CHARS } from './files';
import { TAP, labelStyle, mutedTextStyle, textareaStyle } from './styles';
import { fill } from './text';
import type { Problem, Progress } from './useBulkImport';

const t = restoUz.bulkImport;

interface InputStepProps {
  busy: boolean;
  progress: Progress | null;
  problems: Problem[];
  /** Tekshirish ekranida allaqachon topilgan qatorlar soni (0 = yo'q). */
  existingCount: number;
  onFiles: (files: File[]) => void;
  onText: (text: string) => void;
  onStop: () => void;
  onBackToReview: () => void;
}

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export const InputStep: React.FC<InputStepProps> = ({
  busy,
  progress,
  problems,
  existingCount,
  onFiles,
  onText,
  onStop,
  onBackToReview,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const [emptyHint, setEmptyHint] = useState(false);

  const takeFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setEmptyHint(false);
    onFiles(Array.from(list));
  };

  const submitText = () => {
    if (!text.trim()) {
      setEmptyHint(true);
      return;
    }
    setEmptyHint(false);
    onText(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {existingCount > 0 && (
        <div>
          <Button type="button" variant="secondary" onClick={onBackToReview} style={{ minHeight: TAP }}>
            {fill(t.input.backToReview, { n: existingCount })}
          </Button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) takeFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--action)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: dragging ? 'var(--accent-amber-bg)' : 'var(--bg-surface)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <FileUp size={36} style={{ color: 'var(--text-dim)' }} />
        <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>
          {dragging ? t.input.dropActive : t.input.dropTitle}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            icon={<FileUp size={18} />}
            style={{ minHeight: TAP }}
          >
            {t.input.chooseFiles}
          </Button>
          {isTouchDevice() && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              icon={<Camera size={18} />}
              style={{ minHeight: TAP }}
            >
              {t.input.takePhoto}
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
          {t.input.formats.map((format) => (
            <span
              key={format}
              style={{
                padding: '2px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-surface-hover)',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {format}
            </span>
          ))}
        </div>
        <p style={{ ...mutedTextStyle, maxWidth: 520 }}>{t.input.dropHint}</p>

        {/* Galereya va fayllar (rasm bir nechta tanlanishi mumkin) */}
        <input
          ref={fileRef}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {/* Telefon kamerasi bilan suratga olish */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
          <ClipboardPaste size={18} />
          <label htmlFor="bulk-paste-text">{t.input.pasteTitle}</label>
        </div>
        <textarea
          id="bulk-paste-text"
          rows={8}
          value={text}
          maxLength={MAX_TEXT_CHARS}
          disabled={busy}
          placeholder={t.input.pastePlaceholder}
          aria-label={t.input.pasteLabel}
          onChange={(e) => {
            setText(e.target.value);
            if (emptyHint) setEmptyHint(false);
          }}
          style={{ ...textareaStyle, minHeight: 160 }}
        />
        <p style={mutedTextStyle}>{t.input.pasteHint}</p>
        {emptyHint && (
          <p role="alert" style={{ ...mutedTextStyle, color: 'var(--accent-rose)' }}>
            {t.input.nothingChosen}
          </p>
        )}
        <div>
          <Button type="button" variant="primary" loading={busy} onClick={submitText} style={{ minHeight: TAP }}>
            {t.input.readButton}
          </Button>
        </div>
      </Card>

      {busy && progress && (
        <Card role="status" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text-main)' }}>{t.input.reading}</strong>
            <Button type="button" variant="secondary" onClick={onStop} style={{ minHeight: TAP }}>
              {t.input.stop}
            </Button>
          </div>
          <span style={{ ...mutedTextStyle, overflowWrap: 'anywhere' }}>
            {fill(t.input.readingFile, { current: progress.current, total: progress.total, name: progress.name })}
          </span>
          <div
            style={{ height: 8, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-surface-hover)', overflow: 'hidden' }}
            aria-hidden="true"
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%`,
                backgroundColor: 'var(--action)',
                transition: 'width var(--transition-normal)',
              }}
            />
          </div>
        </Card>
      )}

      {!busy && problems.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            fontSize: '14px',
          }}
        >
          <strong>{t.input.problemsTitle}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
            {problems.map((problem, index) => (
              <li key={index} style={{ overflowWrap: 'anywhere' }}>
                {problem.name ? fill(t.fileProblems.withName, { name: problem.name, message: problem.message }) : problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <details open>
          <summary
            style={{
              cursor: 'pointer',
              minHeight: TAP,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            <Info size={18} />
            {t.input.helpTitle}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
            <p style={mutedTextStyle}>{t.input.helpSupported}</p>
            <p style={mutedTextStyle}>{t.input.helpNotSupported}</p>
            <span style={labelStyle}>{t.input.helpTipsTitle}</span>
            <ul style={{ ...mutedTextStyle, margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {t.input.helpTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </details>
        <p style={{ ...mutedTextStyle, fontSize: '12px' }}>{t.input.aiNote}</p>
      </Card>
    </div>
  );
};
