/** Tanlangan video davomiyligini brauzerda o'qish (yuklashdan oldin). Brauzer o'qiy olmasa (noma'lum kodek) null: server tekshiradi. */

const TIMEOUT_MS = 8000;

export function readVideoDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), TIMEOUT_MS);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}
