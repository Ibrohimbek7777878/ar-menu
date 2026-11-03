import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import {
  choiceFromPhoto,
  choiceFromPick,
  cleanQuery,
  creditLine,
  licenseLabel,
  queryKey,
  safeHttpUrl,
  usableResults,
} from './images.ts';
import type { ImageSearchResult } from './types.ts';

const texts = restoUz.bulkImport.images;

const result = (over: Partial<ImageSearchResult> = {}): ImageSearchResult => ({
  id: 'openverse:1',
  thumb: 'https://example.org/t.jpg',
  full: 'https://example.org/f.jpg',
  title: 'Plov',
  creator: 'Boonlong1',
  license: 'by',
  source_url: 'https://example.org/page',
  ...over,
});

test('licenseLabel: ruxsat etilgan litsenziyalar odam ko\'radigan yorliqda', () => {
  assert.equal(licenseLabel('by', texts), 'CC BY');
  assert.equal(licenseLabel('BY-SA', texts), 'CC BY-SA');
  assert.equal(licenseLabel('cc0', texts), 'CC0');
  assert.equal(licenseLabel('pdm', texts), texts.publicDomain);
  assert.equal(licenseLabel('', texts), '');
});

test('creditLine: "Muallif · CC BY", muallif noma\'lum bo\'lsa shunday deyiladi', () => {
  assert.equal(creditLine('Boonlong1', 'by', texts), 'Boonlong1 · CC BY');
  assert.equal(creditLine('  ', 'cc0', texts), `${texts.unknownAuthor} · CC0`);
  assert.equal(creditLine(undefined, '', texts), texts.unknownAuthor);
});

test('safeHttpUrl: faqat http(s)', () => {
  assert.equal(safeHttpUrl('https://commons.wikimedia.org/wiki/File:X.jpg'), 'https://commons.wikimedia.org/wiki/File:X.jpg');
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('data:text/html,<script>'), '');
  assert.equal(safeHttpUrl('//evil.example'), '');
  assert.equal(safeHttpUrl(''), '');
  assert.equal(safeHttpUrl(null), '');
  assert.equal(safeHttpUrl(42), '');
});

test('cleanQuery va queryKey', () => {
  assert.equal(cleanQuery('  Palov   dum  '), 'Palov dum');
  assert.equal(cleanQuery(''), '');
  assert.equal(cleanQuery('x'.repeat(300)).length, 100);
  assert.equal(queryKey('  PALOV '), queryKey('palov'));
});

test('usableResults: ko\'rinmas kichik rasmli natijalar tashlanadi', () => {
  const list = usableResults([
    result(),
    result({ id: 'a', thumb: 'javascript:1' }),
    result({ id: 'b', thumb: '' }),
    null as never,
    result({ id: 'c' }),
  ]);
  assert.deepEqual(list.map((r) => r.id), ['openverse:1', 'c']);
  assert.deepEqual(usableResults(undefined), []);
});

test('choiceFromPhoto: o\'z rasmi — kreditsiz', () => {
  assert.deepEqual(choiceFromPhoto({ image_token: 'T', preview_url: '/media/tmp/T.jpg' }), {
    token: 'T',
    previewUrl: '/media/tmp/T.jpg',
    fromInternet: false,
    credit: '',
    sourceUrl: '',
  });
});

test('choiceFromPick: internetdan — server krediti, manba havolasi xavfsiz', () => {
  const choice = choiceFromPick({ image_token: 'T2', preview_url: '/p.jpg', credit: 'Boonlong1 · CC BY' }, result(), texts);
  assert.equal(choice.fromInternet, true);
  assert.equal(choice.credit, 'Boonlong1 · CC BY');
  assert.equal(choice.sourceUrl, 'https://example.org/page');

  // server kredit bermasa natijadan yig'iladi; xavfli manba havolasi tashlanadi
  const fallback = choiceFromPick({ image_token: 'T3', preview_url: '' }, result({ source_url: 'javascript:1' }), texts);
  assert.equal(fallback.credit, 'Boonlong1 · CC BY');
  assert.equal(fallback.sourceUrl, '');
});
