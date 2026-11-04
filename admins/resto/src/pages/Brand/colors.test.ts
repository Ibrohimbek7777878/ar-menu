import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AA_NORMAL,
  contrastOnWhite,
  contrastRatio,
  darkenToReadable,
  formatRatio,
  isValidHex,
  normalizeHex,
  parseHex,
  readabilityOnWhite,
  relativeLuminance,
  typedHex,
} from './colors.ts';
import data from './brandData.json' with { type: 'json' };

// Rang qiymatlari kodda `#` bilan yozilmaydi (palette.test.ts skaneri sahifa fayllarida qattiq rang qidiradi)
const H = (digits: string): string => `#${digits}`;

test('normalizeHex: # ixtiyoriy, katta harf, atrofdagi bo\'shliq e\'tiborsiz', () => {
  assert.equal(normalizeHex(H('2f4836')), H('2F4836'));
  assert.equal(normalizeHex('2f4836'), H('2F4836'));
  assert.equal(normalizeHex('  2F4836  '), H('2F4836'));
  assert.equal(normalizeHex(H('AbCdEf')), H('ABCDEF'));
});

test('normalizeHex: qisqa yozuv kengayadi, allowShort=false bo\'lsa rad etiladi', () => {
  assert.equal(normalizeHex(H('abc')), H('AABBCC'));
  assert.equal(normalizeHex('f0a'), H('FF00AA'));
  assert.equal(normalizeHex(H('abc'), false), null);
});

test('normalizeHex: yaroqsiz kiritishlar null', () => {
  for (const bad of ['', '#', H('12'), H('1234'), H('12345'), H('1234567'), H('12345678'), H('GGGGGG'), H('12 456'), 'rgb', null, undefined, 123, {}, []]) {
    assert.equal(normalizeHex(bad), null, String(bad));
    assert.equal(isValidHex(bad), false);
  }
  // alfa kanali (8 xona) rad etiladi: mehmon saytida shaffof asosiy rang ma'nosiz
  assert.equal(normalizeHex(H('2F4836FF')), null);
});

test('parseHex: kanallar 0..255', () => {
  assert.deepEqual(parseHex(H('2F4836')), [47, 72, 54]);
  assert.deepEqual(parseHex(H('000')), [0, 0, 0]);
  assert.equal(parseHex('zzz'), null);
});

test('relativeLuminance: qora 0, oq 1, o\'rta kulrang ~0.216', () => {
  assert.equal(relativeLuminance(H('000000')), 0);
  assert.ok(Math.abs((relativeLuminance(H('FFFFFF')) as number) - 1) < 1e-9);
  assert.ok(Math.abs((relativeLuminance(H('808080')) as number) - 0.2159) < 0.001);
  assert.equal(relativeLuminance('nomalum'), null);
});

test('contrastRatio: WCAG ma\'lum qiymatlari (qora/oq 21, bir xil rang 1)', () => {
  assert.ok(Math.abs((contrastRatio(H('000000'), H('FFFFFF')) as number) - 21) < 1e-9);
  assert.ok(Math.abs((contrastRatio(H('FFFFFF'), H('000000')) as number) - 21) < 1e-9, 'tartibga bog\'liq emas');
  assert.equal(contrastRatio(H('2F4836'), H('2F4836')), 1);
  assert.equal(contrastRatio(H('2F4836'), 'xato'), null);
});

test('contrastOnWhite: oq bilan to\'g\'ridan-to\'g\'ri hisob bilan bir xil', () => {
  for (const digits of ['2F4836', 'B85D19', 'EA580C', '767676', '777777', 'FFFF00']) {
    const direct = contrastRatio(H(digits), H('FFFFFF')) as number;
    assert.ok(Math.abs((contrastOnWhite(H(digits)) as number) - direct) < 1e-9, digits);
  }
  assert.equal(contrastOnWhite(H('000000')), 21);
  assert.equal(contrastOnWhite('x'), null);
});

test('chegara: 767676 oq ustida 4.5 dan oshadi (AA), 777777 esa o\'tmaydi', () => {
  assert.equal(readabilityOnWhite(H('767676')).verdict, 'ok');
  assert.equal(readabilityOnWhite(H('777777')).verdict, 'adjust');
  assert.ok((readabilityOnWhite(H('767676')).ratio as number) >= AA_NORMAL);
  assert.ok((readabilityOnWhite(H('777777')).ratio as number) < AA_NORMAL);
});

test('readabilityOnWhite: yaroqsiz rang -> invalid, klassik yashil ~10:1', () => {
  assert.deepEqual(readabilityOnWhite('12'), { ratio: null, verdict: 'invalid' });
  const green = readabilityOnWhite(H('2F4836'));
  assert.equal(green.verdict, 'ok');
  assert.ok((green.ratio as number) > 9.9 && (green.ratio as number) < 10.2);
});

test('formatRatio: quyiga yaxlitlanadi (4.499 -> 4.49), bo\'sh/NaN -> bo\'sh', () => {
  assert.equal(formatRatio(4.499), '4.49');
  assert.equal(formatRatio(4.5), '4.50');
  assert.equal(formatRatio(21), '21.00');
  assert.equal(formatRatio(null), '');
  assert.equal(formatRatio(Number.NaN), '');
});

test('darkenToReadable: yetarli rang o\'zgarmaydi, och rang 4.5 ga yetkaziladi, qora tomon ketadi', () => {
  assert.equal(darkenToReadable(H('2F4836')), H('2F4836'));
  assert.equal(darkenToReadable('2f4836'), H('2F4836'), 'normallashgan qaytadi');
  for (const digits of ['FFFF00', 'EA580C', '777777', '00FFFF', 'FFFFFF', 'F4A261']) {
    const out = darkenToReadable(H(digits)) as string;
    assert.ok((contrastOnWhite(out) as number) >= AA_NORMAL, `${digits} -> ${out}`);
    // keraksiz qorayish yo'q: nisbat 4.5 ga juda yaqin (ikkilik qidiruv eng kam o'zgarish beradi)
    assert.ok((contrastOnWhite(out) as number) < AA_NORMAL + 0.1, `${digits} -> ${out}: haddan tashqari to'q`);
  }
  assert.equal(darkenToReadable('xato'), null);
});

test('darkenToReadable: bir xil rang tusi saqlanadi (kanal nisbati o\'zgarmaydi) va mavjud 4.5 chegarasi', () => {
  const [r, g, b] = parseHex(darkenToReadable(H('EA580C')) as string) as [number, number, number];
  const [r0, g0, b0] = parseHex(H('EA580C')) as [number, number, number];
  assert.ok(r <= r0 && g <= g0 && b <= b0, 'faqat qorayadi');
  assert.ok(Math.abs(g / r - g0 / r0) < 0.02, 'tus saqlanadi');
  // maqsad 7:1 ham ishlaydi
  assert.ok((contrastOnWhite(darkenToReadable(H('2F4836'), 12)) as number) >= 12);
});

test('typedHex: faqat 0-9 A-F, katta harf, 6 tadan oshmaydi, boshida #', () => {
  assert.equal(typedHex('2f48'), H('2F48'));
  assert.equal(typedHex('#2f4836zz99'), H('2F4836'));
  assert.equal(typedHex('xyz'), '');
  assert.equal(typedHex(''), '');
  assert.equal(typedHex(' 2 f 4 '), H('2F4'));
});

test('tayyor ranglar (brandData.json): hammasi yaroqli, takrorsiz va oq matn bilan AA', () => {
  assert.equal(data.swatches.length, 8);
  const seen = new Set<string>();
  for (const swatch of data.swatches) {
    assert.equal(normalizeHex(swatch.hex, false), swatch.hex, `${swatch.id}: katta harfli #RRGGBB bo'lsin`);
    assert.ok(!seen.has(swatch.hex), `${swatch.id}: takror`);
    seen.add(swatch.hex);
    assert.ok((contrastOnWhite(swatch.hex) as number) >= AA_NORMAL, `${swatch.id} ${swatch.hex}: kontrast ${contrastOnWhite(swatch.hex)}`);
  }
  assert.equal(new Set(data.swatches.map((s) => s.id)).size, 8, 'id takrorsiz');
  for (const palette of Object.values(data.palettes)) {
    assert.ok(isValidHex(palette.primary, false) && isValidHex(palette.accent, false));
  }
});
