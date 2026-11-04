"""
ffprobe / ffmpeg bilan ishlash: yuklangan videoni HAQIQIY tekshirish va yengil variantlarni yasash.

Xavfsizlik:
  - fayl turiga (kengaytma, Content-Type) ISHONILMAYDI: avval fayl imzosi (magic bytes) o'qiladi, so'ng ffprobe demuxer'i
    shu imzoga MAJBURLANADI (`-f mov` / `-f matroska`): avtomatik aniqlash HLS/concat kabi "o'qiydigan" formatlarga
    (SSRF / mahalliy fayl o'qish) yo'l ochmaydi. Qo'shimcha: `-protocol_whitelist file`.
  - subprocess ro'yxat bilan (shell YO'Q), muddat (timeout), `nice`, `-threads 2`, stdin yopiq, minimal muhit.
  - ffmpeg stderr'i foydalanuvchiga HECH QACHON ko'rsatilmaydi (faqat qisqartirilib logga); foydalanuvchiga umumiy matn.
"""
import json
import logging
import math
import os
import shutil
import subprocess
from dataclasses import dataclass

from tours import limits
from tours.errors import TourError

logger = logging.getLogger(__name__)

ALLOWED_CODECS = frozenset({'h264', 'hevc', 'vp9', 'av1'})
MAX_STREAMS = 16

# variant -> (kenglik, crf, GOP): scrub 720/26/6, play 720/28/48, low 480/30/12
SCRUB_WIDTH, PLAY_WIDTH, LOW_WIDTH = 720, 720, 480
POSTER_WIDTH = 720
VARIANT_FILES = {'scrub': 'scrub.mp4', 'play': 'play.mp4', 'low': 'low.mp4', 'poster': 'poster.jpg'}


class MediaFailure(Exception):
    """Ishlov berish (ffmpeg) muvaffaqiyatsiz. `message` - foydalanuvchiga ko'rsatiladigan umumiy matn; `detail` - faqat log uchun."""

    def __init__(self, message, detail=''):
        super().__init__(message)
        self.message = message
        self.detail = detail


@dataclass
class ProbeResult:
    demuxer: str            # 'mov' | 'matroska'
    ext: str                # 'mp4' | 'mov' | 'webm'
    codec: str
    stream_index: int
    duration: float
    width: int              # ko'rinadigan (aylantirishdan keyin)
    height: int
    fps: float
    has_audio: bool


def sniff_container(path):
    """(demuxer, kengaytma) yoki None. Faqat birinchi baytlar: mp4/mov = `ftyp`, webm = EBML sarlavhasi."""
    try:
        with open(path, 'rb') as handle:
            head = handle.read(64)
    except OSError:
        return None
    if len(head) >= 12 and head[4:8] == b'ftyp':
        return 'mov', ('mov' if head[8:12] == b'qt  ' else 'mp4')
    if head[:4] == b'\x1a\x45\xdf\xa3':
        return 'matroska', 'webm'
    return None


def _env():
    return {'PATH': os.environ.get('PATH', '/usr/local/bin:/usr/bin:/bin'), 'LC_ALL': 'C'}


def _nice():
    binary = shutil.which('nice')
    return [binary, '-n', '10'] if binary else []


def ffmpeg_available():
    return bool(shutil.which('ffmpeg') and shutil.which('ffprobe'))


def run(args, timeout, *, capture_stdout=False):
    """Ro'yxat bilan subprocess (shell yo'q). Xato bo'lsa `MediaFailure`; stderr'ning oxirgi qismi faqat `detail` da."""
    try:
        done = subprocess.run(  # noqa: S603
            args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE if capture_stdout else subprocess.DEVNULL,
            stderr=subprocess.PIPE, timeout=timeout, shell=False, check=False, env=_env())
    except subprocess.TimeoutExpired:
        raise MediaFailure("Videoni qayta ishlash vaqti tugadi", 'timeout') from None
    except FileNotFoundError:
        raise MediaFailure("Serverda video dasturi (ffmpeg) o'rnatilmagan", 'ffmpeg_missing') from None
    except (OSError, subprocess.SubprocessError) as exc:
        raise MediaFailure("Videoni qayta ishlab bo'lmadi", type(exc).__name__) from None
    if done.returncode != 0:
        tail = (done.stderr or b'').decode('utf-8', 'replace').strip().splitlines()[-5:]
        raise MediaFailure("Videoni qayta ishlab bo'lmadi", ' | '.join(tail)[:600])
    return done.stdout if capture_stdout else b''


def _float(value, default=0.0):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def _fps(stream):
    for key in ('avg_frame_rate', 'r_frame_rate'):
        text = str(stream.get(key) or '')
        if '/' in text:
            num, _, den = text.partition('/')
            den_v = _float(den)
            value = _float(num) / den_v if den_v else 0.0
        else:
            value = _float(text)
        if 0 < value < 1000:
            return value
    return 0.0


def _rotation(stream):
    rotation = 0
    for side in stream.get('side_data_list') or []:
        if isinstance(side, dict) and 'rotation' in side:
            rotation = int(_float(side.get('rotation')))
    if not rotation:
        rotation = int(_float((stream.get('tags') or {}).get('rotate')))
    return rotation


def probe_video(path):
    """Yuklangan faylni ffprobe bilan tekshiradi. Yaroqsiz bo'lsa `TourError` (o'zbekcha xabar, 400/413)."""
    sniffed = sniff_container(path)
    if sniffed is None:
        raise TourError("Bu haqiqiy video fayl emas (MP4, MOV yoki WebM bo'lishi kerak)", 'invalid_video')
    demuxer, ext = sniffed
    args = ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams',
            '-protocol_whitelist', 'file', '-f', demuxer, '-i', path]
    try:
        raw = run(args, limits.probe_timeout_s(), capture_stdout=True)
        info = json.loads(raw.decode('utf-8', 'replace') or '{}')
    except MediaFailure as exc:
        logger.warning('tours: ffprobe xato (%s)', exc.detail)
        if exc.detail == 'ffmpeg_missing':
            raise TourError("Serverda video dasturi (ffmpeg) o'rnatilmagan", 'ffmpeg_missing', 503) from None
        raise TourError("Videoni o'qib bo'lmadi: fayl buzilgan yoki noto'g'ri formatda", 'invalid_video') from None
    except ValueError:
        raise TourError("Videoni o'qib bo'lmadi: fayl buzilgan yoki noto'g'ri formatda", 'invalid_video') from None

    streams = info.get('streams') if isinstance(info.get('streams'), list) else []
    if not streams or len(streams) > MAX_STREAMS:
        raise TourError("Videoni o'qib bo'lmadi: fayl buzilgan yoki noto'g'ri formatda", 'invalid_video')
    video = next((s for s in streams if isinstance(s, dict) and s.get('codec_type') == 'video'
                  and not (s.get('disposition') or {}).get('attached_pic')), None)
    if video is None:
        raise TourError("Faylda video oqimi topilmadi", 'invalid_video')
    codec = str(video.get('codec_name') or '').lower()
    if codec not in ALLOWED_CODECS:
        raise TourError(f"Video kodeki qo'llab-quvvatlanmaydi ({codec or 'nomalum'}). Ruxsat etilgan: H.264, HEVC, VP9, AV1",
                        'unsupported_codec')

    width, height = int(_float(video.get('width'))), int(_float(video.get('height')))
    if abs(_rotation(video)) % 180 == 90:
        width, height = height, width
    if width < limits.min_dimension() or height < limits.min_dimension():
        raise TourError("Video o'lchami juda kichik", 'invalid_video')
    top = limits.max_dimension()
    if width > top or height > top:
        raise TourError(f"Video o'lchami {top}×{top} pikseldan (4K) oshmasligi kerak (sizniki: {width}×{height})", 'too_big_resolution')

    fmt = info.get('format') if isinstance(info.get('format'), dict) else {}
    duration = _float(fmt.get('duration')) or _float(video.get('duration'))
    if duration <= 0:
        raise TourError("Video davomiyligi aniqlanmadi: fayl buzilgan bo'lishi mumkin", 'invalid_video')
    if duration < limits.min_duration_s():
        raise TourError("Video juda qisqa", 'too_short')
    if duration > limits.max_duration_s():
        raise TourError(f"Video {int(limits.max_duration_s())} soniyadan uzun bo'lmasligi kerak (sizniki: {duration:.0f} s)", 'too_long')
    has_audio = any(isinstance(s, dict) and s.get('codec_type') == 'audio' for s in streams)
    return ProbeResult(demuxer=demuxer, ext=ext, codec=codec, stream_index=int(video.get('index') or 0), duration=round(duration, 3),
                       width=width, height=height, fps=_fps(video), has_audio=has_audio)


# ── Variantlarni yasash ──────────────────────────────────────────────────────────────────────────────────────

def _scale_filter(target_width, fps):
    """Faqat kichraytiradi (kattalashtirmaydi), juft o'lcham; ffmpeg avtomatik aylantirishdan (displaymatrix) KEYIN ishlaydi."""
    chain = []
    if fps and fps > 30.5:
        chain.append('fps=30')
    chain.append(f"scale=w='trunc(min({int(target_width)},iw)/2)*2':h=-2:flags=bicubic")
    return ','.join(chain)


def _head(probe, src):
    return [*_nice(), 'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
            '-protocol_whitelist', 'file', '-f', probe.demuxer, '-i', src]


def _video_args(probe, width, crf, gop):
    return ['-map', f'0:{probe.stream_index}', '-vf', _scale_filter(width, probe.fps),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(crf), '-g', str(gop), '-keyint_min', str(gop),
            '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-threads', '2']


def build_commands(probe, src, out_dir):
    """{variant: argv}. `scrub` - har 6-kadr kalit (siljitish uchun), audio yo'q; `play` - 720 px, GOP 48, audio yo'q (maxfiylik);
    `low` - 480 px (ma'lumot tejash), audio yo'q, GOP 12 (sekin tarmoqda mehmon faqat `low` bilan sudraydi); `poster` - o'rta kadr."""
    mp4 = ['-movflags', '+faststart', '-f', 'mp4']
    cmds = {
        'scrub': [*_head(probe, src), *_video_args(probe, SCRUB_WIDTH, 26, 6), '-an', *mp4, os.path.join(out_dir, VARIANT_FILES['scrub'])],
        # Tovush hech qaysi variantda saqlanmaydi: zalda mehmonlarning suhbati yozilib qolgan bo'lishi mumkin (maxfiylik)
        'play': [*_head(probe, src), *_video_args(probe, PLAY_WIDTH, 28, 48), '-an', *mp4, os.path.join(out_dir, VARIANT_FILES['play'])],
        'low': [*_head(probe, src), *_video_args(probe, LOW_WIDTH, 30, 12), '-an', *mp4, os.path.join(out_dir, VARIANT_FILES['low'])],
    }
    seek = round(min(max(probe.duration / 2, 0.0), max(probe.duration - 0.1, 0.0)), 3) if probe.duration > 1.0 else 0.5
    seek = min(seek, max(probe.duration - 0.05, 0.0))
    cmds['poster'] = [*_nice(), 'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                      '-protocol_whitelist', 'file', '-ss', str(seek), '-f', probe.demuxer, '-i', src,
                      '-map', f'0:{probe.stream_index}', '-frames:v', '1', '-vf', _scale_filter(POSTER_WIDTH, 0),
                      '-q:v', '4', '-threads', '2', os.path.join(out_dir, VARIANT_FILES['poster'])]
    return cmds


def make_variants(probe, src, out_dir):
    """Hamma variantni yasaydi. Muvaffaqiyatda {variant: fayl nomi}; xatoda `MediaFailure` (yarim fayllar chaqiruvchi tomonidan tozalanadi)."""
    os.makedirs(out_dir, exist_ok=True)
    timeout = limits.encode_timeout_s(probe.duration)
    produced = {}
    for name, argv in build_commands(probe, src, out_dir).items():
        run(argv, timeout)
        path = os.path.join(out_dir, VARIANT_FILES[name])
        if not os.path.isfile(path) or os.path.getsize(path) <= 0:
            raise MediaFailure("Videoni qayta ishlab bo'lmadi", f'{name}: natija fayli yo\'q')
        produced[name] = VARIANT_FILES[name]
    return produced


def extract_frame(src_mp4, seconds, dest_jpg, width=640):
    """Bitta kadrni JPEG qiladi (AI uchun). `src_mp4` - o'zimiz yasagan variant."""
    argv = [*_nice(), 'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-protocol_whitelist', 'file',
            '-ss', f'{max(seconds, 0):.3f}', '-f', 'mov', '-i', src_mp4, '-frames:v', '1',
            '-vf', f"scale=w='min({int(width)},iw)':h=-2", '-q:v', '5', '-threads', '1', dest_jpg]
    run(argv, 60)
    if not os.path.isfile(dest_jpg) or os.path.getsize(dest_jpg) <= 0:
        raise MediaFailure("Kadrni olib bo'lmadi", 'empty frame')
