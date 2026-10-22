import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchUzbekQuery, toCanonical } from '../src/utils/uzbekSearch.ts';

const dish = (name: string, desc = '') => [name, desc, 'Taomlar'];

test("apostrof, apostrofsiz va kirill yozuvi bir xil natija beradi", () => {
  for (const query of ["o'g'ri", 'ogri', 'огри', 'ўғри', "o`g‘ri", 'OGRI']) {
    assert.equal(matchUzbekQuery(dish("O'g'ri lag'mon"), query), true, query);
  }
  assert.equal(matchUzbekQuery(dish('Go\'sht kabob'), 'гошт'), true);
  assert.equal(toCanonical("O'sh"), 'osh');
  assert.equal(toCanonical('Ош'), 'osh');
});

test("qisqa va maxsus so'rovlar hamma narsani topmaydi (regex xatosi)", () => {
  const osh = dish('Osh', 'Palov');
  for (const query of ['go', 'og', 'gg', '.', '.*', '[', '(', '\\', '+']) {
    assert.equal(matchUzbekQuery(osh, query), false, `"${query}" Osh'ni topmasligi kerak`);
  }
});

test("regex belgilari oddiy matn sifatida qaraladi va yiqilmaydi", () => {
  assert.equal(matchUzbekQuery(dish('Choy (ko\'k)'), '(ko'), true);
  assert.equal(matchUzbekQuery(dish('Somsa [issiq]'), '[issiq'), true);
  assert.doesNotThrow(() => matchUzbekQuery(dish('Osh'), '(((((['));
});

test("barcha so'zlar mos kelishi shart; bo'sh so'rov hammasini ko'rsatadi", () => {
  const target = dish("Go'sht kabob", 'ko\'mir ustida');
  assert.equal(matchUzbekQuery(target, 'gosht kabob'), true);
  assert.equal(matchUzbekQuery(target, 'gosht plov'), false);
  assert.equal(matchUzbekQuery(target, ''), true);
  assert.equal(matchUzbekQuery(target, '   '), true);
});

test("tavsif va kategoriya bo'yicha ham qidiriladi", () => {
  assert.equal(matchUzbekQuery(['Osh', 'Guruch va sabzi', 'Issiq taomlar'], 'sabzi'), true);
  assert.equal(matchUzbekQuery(['Osh', 'Guruch va sabzi', 'Issiq taomlar'], 'issiq'), true);
});
