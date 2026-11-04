import React from 'react';
import { Button, t } from '@admins/shared';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import { CoverageLine } from './HotspotsPanel';
import type { Coverage } from './editModel';
import { hintStyle, innerCardStyle, rowStyle, sectionTitleStyle, tapButton } from './styles';
import { GUEST_TOUR_PATH } from './urls';
import { Notice, StatusBadge } from './ui';
import type { Tour } from './types';

interface Props {
  tour: Tour;
  dirty: boolean;
  busy: boolean;
  coverage: Coverage;
  hotspotCount: number;
  onPublish: () => void;
  onUnpublish: () => void;
}

/** E'lon qilish: mehmonlar ko'radigan sayrni yoqish/o'chirish, havola va stollar qamrovi. */
export const PublishPanel: React.FC<Props> = ({ tour, dirty, busy, coverage, hotspotCount, onPublish, onUnpublish }) => {
  const published = tour.status === 'published';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={sectionTitleStyle}>{t("E'lon qilish")}</h2>
        <p style={hintStyle}>{t("E'lon qilingan sayrni mehmonlar saytda ko'radi va stol belgisidan bron qiladi.")}</p>
      </div>

      <div style={{ ...innerCardStyle, gap: 10 }}>
        <div style={{ ...rowStyle, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t('Hozirgi holat')}</span>
          <StatusBadge status={tour.status} serverLabel={tour.status_label} />
        </div>
        {published ? (
          <Button variant="secondary" style={tapButton} loading={busy} onClick={onUnpublish} icon={<EyeOff size={18} aria-hidden="true" />}>
            {t("E'londan olish")}
          </Button>
        ) : (
          <Button style={tapButton} loading={busy} onClick={onPublish} icon={<Eye size={18} aria-hidden="true" />}>
            {t("E'lon qilish")}
          </Button>
        )}
        {dirty && !published && <p style={{ ...hintStyle, margin: 0 }}>{t("Saqlanmagan o'zgarishlar bor: e'lon qilishdan oldin ular saqlanadi.")}</p>}
        <p style={{ ...hintStyle, margin: 0 }}>{t("Bitta zalda bitta sayr e'lon qilinadi: yangisini e'lon qilsangiz, shu zaldagi avvalgisi e'londan olinadi.")}</p>
      </div>

      {published ? (
        <a
          href={GUEST_TOUR_PATH}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, color: 'var(--brand)', fontWeight: 700, fontSize: 15 }}
        >
          <ExternalLink size={18} aria-hidden="true" />
          {t("Mehmonlar shunday ko'radi")}
        </a>
      ) : (
        <p style={{ ...hintStyle, margin: 0 }}>{t("«Mehmonlar shunday ko'radi» havolasi sayr e'lon qilingandan keyin chiqadi.")}</p>
      )}

      {hotspotCount === 0 && <Notice tone="warn">{t("Hali birorta belgi yo'q: mehmonlar faqat videoni ko'radi, bron qila olmaydi.")}</Notice>}

      <CoverageLine coverage={coverage} />
    </div>
  );
};
