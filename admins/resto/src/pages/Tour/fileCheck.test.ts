import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, checkVideoDuration, checkVideoFile, detectVideoType, formatBytes, progressPercent } from './fileCheck.ts';

const file = (name: string, type: string, size: number) => ({ name, type, size });
const MB = 1024 * 1024;

test('detectVideoType: brauzer turi ruxsat etilgan bo\'lsa shu', () => {
  assert.equal(detectVideoType(file('a.mp4', 'video/mp4', 1)), 'video/mp4');
  assert.equal(detectVideoType(file('a.mov', 'video/quicktime', 1)), 'video/quicktime');
  assert.equal(detectVideoType(file('a.webm', 'VIDEO/WEBM', 1)), 'video/webm');
});

test('detectVideoType: bo\'sh yoki umumiy tur — kengaytmadan', () => {
  assert.equal(detectVideoType(file('IMG_0001.MOV', '', 1)), 'video/quicktime');
  assert.equal(detectVideoType(file('clip.mp4', 'application/octet-stream', 1)), 'video/mp4');
  assert.equal(detectVideoType(file('clip.M4V', '', 1)), 'video/mp4');
  assert.equal(detectVideoType(file('clip', '', 1)), '');
  assert.equal(detectVideoType(file('clip.exe', '', 1)), '');
});

test('detectVideoType: boshqa aniq tur o\'zicha qoladi (kengaytma uni o\'zgartirmaydi)', () => {
  assert.equal(detectVideoType(file('fake.mp4', 'image/png', 1)), 'image/png');
  assert.equal(detectVideoType(file('a.mkv', 'video/x-matroska', 1)), 'video/x-matroska');
});

test('checkVideoFile: yaroqli fayllar', () => {
  assert.equal(checkVideoFile(file('a.mp4', 'video/mp4', 50 * MB)), null);
  assert.equal(checkVideoFile(file('a.mov', '', 10 * MB)), null);
  assert.equal(checkVideoFile(file('a.webm', 'video/webm', MAX_VIDEO_BYTES)), null); // aynan 300 MB ruxsat
});

test('checkVideoFile: bo\'sh, katta, noto\'g\'ri tur', () => {
  assert.equal(checkVideoFile(null), 'empty');
  assert.equal(checkVideoFile(undefined), 'empty');
  assert.equal(checkVideoFile(file('a.mp4', 'video/mp4', 0)), 'empty');
  assert.equal(checkVideoFile(file('a.mp4', 'video/mp4', MAX_VIDEO_BYTES + 1)), 'too_big');
  assert.equal(checkVideoFile(file('a.avi', 'video/x-msvideo', MB)), 'bad_type');
  assert.equal(checkVideoFile(file('a.png', 'image/png', MB)), 'bad_type');
  assert.equal(checkVideoFile(file('a.pdf', '', MB)), 'bad_type');
  // tur noto'g'ri bo'lsa hajmdan oldin shu aytiladi
  assert.equal(checkVideoFile(file('a.avi', 'video/x-msvideo', MAX_VIDEO_BYTES + 1)), 'bad_type');
});

test('checkVideoDuration: chegara 300 s, noma\'lum bo\'lsa ruxsat', () => {
  assert.equal(checkVideoDuration(44.6), null);
  assert.equal(checkVideoDuration(MAX_VIDEO_SECONDS), null);
  assert.equal(checkVideoDuration(MAX_VIDEO_SECONDS + 0.1), 'too_long');
  assert.equal(checkVideoDuration(3600), 'too_long');
  for (const unknown of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) assert.equal(checkVideoDuration(unknown), null, String(unknown));
});

test('formatBytes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-5), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * MB), '5.0 MB');
  assert.equal(formatBytes(300 * MB), '300.0 MB');
  assert.equal(formatBytes(1.5 * 1024 * MB), '1.50 GB');
  assert.equal(formatBytes(Number.NaN), '0 B');
});

test('progressPercent: 0..100, butun', () => {
  assert.equal(progressPercent(0, 100), 0);
  assert.equal(progressPercent(50, 100), 50);
  assert.equal(progressPercent(99.9, 100), 99);
  assert.equal(progressPercent(100, 100), 100);
  assert.equal(progressPercent(150, 100), 100);
  assert.equal(progressPercent(10, 0), 0);
  assert.equal(progressPercent(-5, 100), 0);
  assert.equal(progressPercent(Number.NaN, 100), 0);
});
