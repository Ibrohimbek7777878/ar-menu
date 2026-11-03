/**
 * Profil oynasi qoidalari (kod darajasida): ko'rinadigan matnda texnik so'z yo'q, kalitlar literal, bosiladigan joy >= 44 px.
 * Qattiq rang yo'qligini `admins/shared/tests/palette.test.ts` tekshiradi (pages/Staff uning doirasida). Vizual tekshiruv alohida.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TAP } from './profileStyles.ts';

const DIR = import.meta.dirname;
const FILES = [
  'StaffProfile.tsx',
  'ProfilePersonal.tsx',
  'ProfileLogin.tsx',
  'ProfilePermissions.tsx',
  'PermissionParts.tsx',
  'profileUi.tsx',
  'profileStyles.ts',
  'profileMessages.ts',
];

const read = (name: string) => fs.readFileSync(path.join(DIR, name), 'utf8');

test('profil fayllarida ko\'rinadigan matn kalitlarida texnik so\'z yo\'q (capability, permission, token, ...)', () => {
  const CALL = /(?<![\w.$])t\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const JARGON = /\b(capabilit\w*|permission\w*|token\w*|payload|endpoint|api|json)\b/i;
  let seen = 0;
  for (const name of FILES) {
    for (const match of read(name).matchAll(CALL)) {
      seen += 1;
      assert.doesNotMatch(match[2], JARGON, `${name}: texnik so'z: "${match[2]}"`);
    }
  }
  assert.ok(seen > 40, `matn kalitlari kam topildi (${seen}): regex buzilgan bo'lishi mumkin`);
});

test('bosiladigan joy kamida 44 px', () => {
  assert.ok(TAP >= 44);
});

test('profil fayllarida t(`...`) (shablon satr) ishlatilmagan: kalit literal bo\'lishi shart', () => {
  for (const name of FILES) {
    assert.doesNotMatch(read(name), /(?<![\w.$])t\(\s*`/, `${name}: t(\`...\`)`);
  }
});
