// "Bron holatini tekshirish": GET .../booking/<kod>/ — natija shu tugma yonida ko'rsatiladi (sahifadan chiqmaydi).
import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { BookingApiError, bookingClient, isAbortError } from './client';
import { bookingStatusLabel } from './labels';
import type { BookingStatusInfo } from './types';

type CheckState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; info: BookingStatusInfo }
  | { kind: 'missing' }
  | { kind: 'error'; rate: boolean };

interface StatusCheckProps {
  code: string;
  /** Tugma ko'rinishi: asosiy (muvaffaqiyat ekrani) yoki ixcham (ro'yxat) */
  compact?: boolean;
}

export const StatusCheck: React.FC<StatusCheckProps> = ({ code, compact = false }) => {
  const [state, setState] = useState<CheckState>({ kind: 'idle' });
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  const check = async () => {
    ctl.current?.abort();
    const controller = new AbortController();
    ctl.current = controller;
    setState({ kind: 'loading' });
    try {
      const info = await bookingClient.loadStatus(code, controller.signal);
      if (!controller.signal.aborted) setState(info ? { kind: 'found', info } : { kind: 'missing' });
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      setState({ kind: 'error', rate: err instanceof BookingApiError && err.status === 429 });
    }
  };

  return (
    <div className={`bk-status ${compact ? 'is-compact' : ''}`}>
      <button type="button" className={compact ? 'bk-btn bk-btn--small' : 'bk-btn'} onClick={check} disabled={state.kind === 'loading'} aria-busy={state.kind === 'loading' || undefined}>
        {state.kind === 'loading' ? t('Tekshirilmoqda...') : t('Bron holatini tekshirish')}
      </button>
      <div className="bk-status-result" role="status" aria-live="polite">
        {state.kind === 'found' && (
          <p className={`bk-status-line bk-status-line--${state.info.status}`}>
            <span className="bk-status-dot" aria-hidden="true" />
            <strong>{bookingStatusLabel(state.info.status)}</strong>
          </p>
        )}
        {state.kind === 'missing' && <p className="bk-status-line is-warn">{t('Bron topilmadi')}</p>}
        {state.kind === 'error' && (
          <p className="bk-status-line is-warn">
            {state.rate ? t("Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring") : t("Holatni yuklab bo'lmadi. Aloqani tekshiring")}
          </p>
        )}
      </div>
    </div>
  );
};
