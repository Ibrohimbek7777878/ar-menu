import React from 'react';
import { Button, t } from '@admins/shared';
import { Sparkles, X } from 'lucide-react';
import { hintStyle, rowStyle, sectionTitleStyle, tapButton } from './styles';
import { Notice, Spinner } from './ui';
import type { AiStatus } from './types';

interface Props {
  aiStatus: AiStatus;
  /** Server xabari (AI o'chiq yoki xato bo'lsa) */
  aiError: string;
  /** So'rov yuborishda kelgan xabar (sozlama o'chiq, ruxsat yo'q ...) */
  startMessage: string;
  starting: boolean;
  disabled: boolean;
  stopCount: number;
  hotspotCount: number;
  hasServerSuggestions: boolean;
  stalled: boolean;
  onStart: () => void;
  onRejectAll: () => void;
  onResume: () => void;
}

/** AI yordami: kadrlardan nuqta va stol belgilarini TAKLIF qiladi; qaror egasiniki. */
export const AiPanel: React.FC<Props> = ({ aiStatus, aiError, startMessage, starting, disabled, stopCount, hotspotCount, hasServerSuggestions, stalled, onStart, onRejectAll, onResume }) => {
  const running = aiStatus === 'running';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2 style={sectionTitleStyle}>{t('AI yordami')}</h2>
        <p style={hintStyle}>{t("AI video kadrlariga qarab nuqtalar va stol belgilarini taklif qiladi. Takliflar punktir ko'rinishda chiqadi — qabul qilsangiz o'zgarishlarga qo'shiladi, qaror sizniki.")}</p>
        <p style={hintStyle}>{t("AI stollarni topadi, lekin raqamini siz ko'rsatasiz.")}</p>
      </div>

      <div style={rowStyle}>
        <Button style={tapButton} loading={starting} disabled={running || disabled || starting} onClick={onStart} icon={<Sparkles size={18} aria-hidden="true" />}>
          {t('AI bilan taklif olish')}
        </Button>
      </div>

      {running && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)', fontSize: 15 }}>
          <Spinner />
          <span>{t("Kadrlar o'qilmoqda…")}</span>
        </div>
      )}

      {running && stalled && (
        <Notice tone="warn">
          <span>{t("AI uzoq javob bermayapti. Sahifani yangilab ko'ring yoki keyinroq qayta urinib ko'ring.")} </span>
          <button type="button" onClick={onResume} style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            {t('Kutishni davom ettirish')}
          </button>
        </Notice>
      )}

      {startMessage && <Notice tone="warn">{startMessage}</Notice>}

      {!running && aiStatus === 'failed' && (
        <Notice tone="warn">
          <div>{t("AI hozir taklif bera olmadi. Muharrir AI siz ham to'liq ishlaydi — nuqta va belgilarni qo'lda qo'ying.")}</div>
          {aiError && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{t(aiError)}</div>}
        </Notice>
      )}

      {!running && aiStatus === 'done' && stopCount + hotspotCount === 0 && !hasServerSuggestions && <Notice tone="info">{t("AI hech narsa taklif qilmadi. Qo'lda davom eting.")}</Notice>}

      {stopCount + hotspotCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Notice tone="info">{t("Takliflar: nuqtalar — {stops}, belgilar — {hotspots}. «Nuqtalar» va «Belgilar» bo'limlarida punktir bilan ko'rinadi.", { stops: stopCount, hotspots: hotspotCount })}</Notice>
          <div style={rowStyle}>
            <Button variant="secondary" style={tapButton} onClick={onRejectAll} icon={<X size={16} aria-hidden="true" />}>
              {t('Hammasini rad etish')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
