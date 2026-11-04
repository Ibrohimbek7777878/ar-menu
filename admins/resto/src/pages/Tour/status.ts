/** Sayr holati: tonlar va qaysi ko'rinish ochilishi. SOF mantiq (matnlar `labels.ts` da). */
import type { TourStatus } from './types.ts';

export type StatusTone = 'warn' | 'brand' | 'success' | 'neutral' | 'danger';

export function statusTone(status: TourStatus): StatusTone {
  switch (status) {
    case 'processing':
      return 'warn';
    case 'ready':
      return 'brand';
    case 'published':
      return 'success';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export type WorkspaceView = 'upload' | 'processing' | 'failed' | 'editor';

/** Holatga mos ko'rinish: qoralama — yuklash; qayta ishlanmoqda — kutish; xato — xato + qayta yuklash; tayyor/e'lon qilingan — muharrir */
export function viewFor(status: TourStatus): WorkspaceView {
  switch (status) {
    case 'processing':
      return 'processing';
    case 'failed':
      return 'failed';
    case 'ready':
    case 'published':
      return 'editor';
    default:
      return 'upload';
  }
}
