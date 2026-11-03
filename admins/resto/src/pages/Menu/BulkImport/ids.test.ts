import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeUuid } from './ids.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('makeUuid: brauzerning randomUUID si bor bo\'lsa shundan foydalanadi', () => {
  assert.equal(makeUuid({ randomUUID: () => 'fixed-id' }), 'fixed-id');
});

test('makeUuid: randomUUID yo\'q (http sahifa) bo\'lsa getRandomValues bilan to\'g\'ri UUID v4', () => {
  const cryptoLike = {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i += 1) array[i] = (i * 37 + 11) & 0xff;
      return array;
    },
  };
  const id = makeUuid(cryptoLike);
  assert.match(id, UUID_V4);
  assert.equal(makeUuid(cryptoLike), id, 'bir xil tasodifiy baytlardan bir xil natija');
});

test('makeUuid: hech narsa bo\'lmasa ham ishlaydi va takrorlanmaydi', () => {
  const ids = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    const id = makeUuid(undefined as never);
    assert.match(id, UUID_V4);
    ids.add(id);
  }
  assert.ok(ids.size > 190);
});

test('makeUuid: haqiqiy globalThis.crypto bilan', () => {
  assert.match(makeUuid(), UUID_V4);
});
