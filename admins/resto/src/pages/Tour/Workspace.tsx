import React from 'react';
import { Button, Skeleton, t } from '@admins/shared';
import { ArrowLeft } from 'lucide-react';
import { Editor } from './Editor';
import { ProcessingView } from './ProcessingView';
import { UploadView } from './UploadView';
import { failureText } from './labels';
import { hintStyle, pageStyle, pageTitleStyle, rowStyle, tapButton } from './styles';
import { viewFor } from './status';
import { Notice, StatusBadge } from './ui';
import { useTour } from './useTours';

interface Props {
  id: number;
  onBack: () => void;
}

/** Bitta sayr: holatiga qarab yuklash, kutish, xato yoki muharrir ko'rinishi. */
export const Workspace: React.FC<Props> = ({ id, onBack }) => {
  const { tour, loading, failure, reload, apply, pollErrors, gaveUp, resume } = useTour(id);

  if (!tour) {
    return (
      <div style={pageStyle} aria-busy={loading || undefined}>
        <Button variant="ghost" style={{ ...tapButton, paddingLeft: 0 }} onClick={onBack} icon={<ArrowLeft size={18} aria-hidden="true" />}>
          {t('Sayrlar')}
        </Button>
        {loading && !failure ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height="36px" width="240px" />
            <Skeleton height="320px" borderRadius="var(--radius-lg)" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <Notice tone="error">{failure ? failureText(failure, t("Sayrni yuklab bo'lmadi.")) : t("Sayrni yuklab bo'lmadi.")}</Notice>
            <Button variant="secondary" style={tapButton} onClick={() => void reload()}>
              {t('Qayta urinish')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const view = viewFor(tour.status);
  if (view === 'editor') {
    return <Editor tour={tour} apply={apply} stalled={gaveUp} onResume={resume} onBack={onBack} />;
  }

  return (
    <div style={pageStyle}>
      <header style={{ marginBottom: 12 }}>
        <Button variant="ghost" style={{ ...tapButton, paddingLeft: 0 }} onClick={onBack} icon={<ArrowLeft size={18} aria-hidden="true" />}>
          {t('Sayrlar')}
        </Button>
        <h1 style={{ ...pageTitleStyle, overflowWrap: 'anywhere' }}>{tour.title}</h1>
        <div style={rowStyle}>
          <StatusBadge status={tour.status} serverLabel={tour.status_label} />
          {view === 'upload' && <span style={{ ...hintStyle, margin: 0 }}>{t('Zalingizni sekin yurib videoga oling va shu yerga yuklang.')}</span>}
        </div>
      </header>

      {view === 'processing' && <ProcessingView stalled={gaveUp} connectionLost={pollErrors >= 3} onResume={resume} onBack={onBack} />}

      {view === 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Notice tone="error">
            <div style={{ fontWeight: 600 }}>{t("Videoni qayta ishlab bo'lmadi.")}</div>
            {tour.error && <div style={{ marginTop: 4 }}>{t(tour.error)}</div>}
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{t("Videoni qayta yuklang. Muammo davom etsa, boshqa formatda (MP4) oling.")}</div>
          </Notice>
          <UploadView tour={tour} apply={apply} retry />
        </div>
      )}

      {view === 'upload' && <UploadView tour={tour} apply={apply} />}
    </div>
  );
};
