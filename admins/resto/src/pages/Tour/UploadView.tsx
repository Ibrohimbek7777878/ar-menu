import React, { useRef, useState } from 'react';
import { Button, t } from '@admins/shared';
import { Film, Upload, X } from 'lucide-react';
import { uploadTourVideo } from './api';
import { checkVideoDuration, checkVideoFile, detectVideoType, formatBytes, progressPercent } from './fileCheck';
import type { VideoProblem } from './fileCheck';
import { failureText, videoProblemText } from './labels';
import { ShootingGuide } from './ShootingGuide';
import { hintStyle, innerCardStyle, rowStyle, tapButton } from './styles';
import { formatDuration } from './time';
import type { Tour } from './types';
import { isUploadAborted } from './upload';
import { Notice, Spinner } from './ui';
import { readVideoDuration } from './videoMeta';
import { readFailure } from '../Bookings/errors';
import { useLeaveGuard } from '../Bookings/useLeaveGuard';

type Phase = 'idle' | 'checking' | 'ready' | 'uploading';

interface Props {
  tour: Tour;
  apply: (next: Tour) => void;
  /** Xatodan keyin qayta yuklash (tugma matni o'zgaradi) */
  retry?: boolean;
}

/** Video tanlash, oldindan tekshirish va yuklash (foiz bilan, bekor qilish mumkin). */
export const UploadView: React.FC<Props> = ({ tour, apply, retry = false }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pickToken = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [problem, setProblem] = useState<VideoProblem | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);

  useLeaveGuard(phase === 'uploading', t("Video hali yuklanmoqda. Sahifadan chiqsangiz, yuklash to'xtaydi. Chiqamizmi?"));

  const choose = async (picked: File | undefined) => {
    if (!picked) return;
    const token = (pickToken.current += 1);
    setError('');
    const early = checkVideoFile(picked);
    if (early) {
      setFile(null);
      setProblem(early);
      setPhase('idle');
      return;
    }
    setProblem(null);
    setFile(picked);
    setPhase('checking');
    const duration = await readVideoDuration(picked);
    if (token !== pickToken.current) return; // boshqa fayl tanlangan
    const tooLong = checkVideoDuration(duration);
    if (tooLong) {
      setFile(null);
      setProblem(tooLong);
      setPhase('idle');
      return;
    }
    setSeconds(duration);
    setPhase('ready');
  };

  const start = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('uploading');
    setLoaded(0);
    setTotal(file.size);
    setError('');
    try {
      // Telefon fayl turini bermasa kengaytmadan aniqlangan tur bilan yuboramiz (ma'lumot ko'chirilmaydi)
      const type = detectVideoType(file);
      const body = file.type === type ? file : new File([file], file.name, { type });
      const next = await uploadTourVideo(tour.id, body, {
        signal: controller.signal,
        onProgress: (done, all) => {
          setLoaded(done);
          setTotal(all);
        },
      });
      apply(next);
    } catch (err: unknown) {
      if (isUploadAborted(err)) {
        setPhase('ready');
        return;
      }
      setError(failureText(readFailure(err), t("Videoni yuklab bo'lmadi. Qayta urinib ko'ring.")));
      setPhase('ready');
    }
  };

  const percent = progressPercent(loaded, total);
  const busy = phase === 'checking' || phase === 'uploading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ShootingGuide />

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = ''; // o'sha faylni qayta tanlash mumkin bo'lsin
        }}
      />

      {problem && <Notice tone="error">{videoProblemText(problem)}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {file && phase !== 'idle' && (
        <div style={{ ...innerCardStyle, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Film size={20} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{file.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {formatBytes(file.size)}
                {seconds !== null ? ` · ${formatDuration(seconds)}` : ''}
              </div>
            </div>
          </div>

          {phase === 'checking' && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              <Spinner size={16} />
              {t('Video tekshirilmoqda…')}
            </div>
          )}

          {phase === 'uploading' && (
            <div>
              <div
                role="progressbar"
                aria-label={t('Yuklanmoqda')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                style={{ height: 10, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--border-strong)', overflow: 'hidden' }}
              >
                <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--action)', transition: 'width var(--transition-fast)' }} />
              </div>
              <p style={{ ...hintStyle, marginTop: 6 }}>
                {percent >= 100 ? t('Server qabul qilmoqda…') : t('Yuklanmoqda… {percent}% ({loaded} / {total})', { percent, loaded: formatBytes(loaded), total: formatBytes(total) })}
              </p>
            </div>
          )}

          <div style={rowStyle}>
            {phase === 'ready' && (
              <Button style={tapButton} onClick={() => void start()} icon={<Upload size={18} aria-hidden="true" />}>
                {t('Yuklashni boshlash')}
              </Button>
            )}
            {phase === 'uploading' && (
              <Button variant="secondary" style={tapButton} onClick={() => abortRef.current?.abort()} icon={<X size={18} aria-hidden="true" />}>
                {t('Yuklashni bekor qilish')}
              </Button>
            )}
            {phase === 'ready' && (
              <Button variant="secondary" style={tapButton} onClick={() => inputRef.current?.click()}>
                {t('Boshqa video tanlash')}
              </Button>
            )}
          </div>
        </div>
      )}

      {!busy && !(file && phase === 'ready') && (
        <div>
          <Button size="lg" style={{ ...tapButton, width: '100%', maxWidth: 420 }} onClick={() => inputRef.current?.click()} icon={<Upload size={20} aria-hidden="true" />}>
            {retry ? t('Videoni qayta yuklash') : t('Video yuklash')}
          </Button>
          <p style={hintStyle}>{t('Telefonda kamera yoki galereyadan tanlashingiz mumkin.')}</p>
        </div>
      )}
    </div>
  );
};
