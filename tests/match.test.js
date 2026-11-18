import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLibrary } from '../src/library.js';
import { matchItem } from '../src/match.js';

const lib = buildLibrary({
  icd: [
    { kode: 'J18.9', nama: 'Pneumonia, unspecified' },
    { kode: 'E11.9', nama: 'Type 2 diabetes mellitus without complications' },
    { kode: 'I10', nama: 'Essential (primary) hypertension' },
    { kode: 'A41.9', nama: 'Sepsis, unspecified' },
  ],
  sinonim: [{ istilah: 'radang paru', kode: 'J18.9' }],
  kriteria: [
    { kode: 'J18.9', uraian: 'Demam', jenis: 'wajib' },
    { kode: 'J18.9', uraian: 'Batuk', jenis: 'Pendukung' },
    { kode: '', uraian: 'tanpa kode', jenis: 'wajib' },
  ],
});

test('code matches regardless of case and dot', () => {
  for (const s of ['j189', 'J18.9', 'J18.9 - Pneumonia']) {
    const m = matchItem(s, lib);
    assert.equal(m.status, 'matched', s);
    assert.equal(m.code, 'J18.9', s);
  }
});

test('exact name matches case-insensitively', () => {
  const m = matchItem('SEPSIS, unspecified', lib);
  assert.equal(m.status, 'matched');
  assert.equal(m.code, 'A41.9');
});

test('synonym matches', () => {
  const m = matchItem('Radang Paru', lib);
  assert.equal(m.status, 'matched');
  assert.equal(m.code, 'J18.9');
});

test('close text gives choose with candidates', () => {
  const m = matchItem('pneumonia berat', lib);
  assert.equal(m.status, 'choose');
  assert.ok(m.candidates.some((c) => c.code === 'J18.9'));
});

test('unknown text gives none and keeps the input', () => {
  const m = matchItem('asdfgh', lib);
  assert.equal(m.status, 'none');
  assert.equal(m.input, 'asdfgh');
  assert.deepEqual(m.candidates, []);
});

test('criteria are keyed by normalized code, with wajib flag; empty-code rows skipped', () => {
  const c = lib.criteria.get('J189');
  assert.equal(c.length, 2);
  assert.equal(c[0].wajib, true);
  assert.equal(c[1].wajib, false);
  assert.equal(lib.criteria.has(''), false);
});

import { searchIcd } from '../src/match.js';

test('searchIcd finds by code fragment or name word, case-insensitive, and is limited', () => {
  assert.deepEqual(searchIcd('j18', lib).map((e) => e.code), ['J18.9']);
  assert.deepEqual(searchIcd('SEPSIS', lib).map((e) => e.code), ['A41.9']);
  assert.equal(searchIcd('unspecified', lib, 1).length, 1);
  assert.deepEqual(searchIcd('  ', lib), []);
});

test('200 unmatched items against an 18k-entry library finish quickly', () => {
  const icd = Array.from({ length: 18000 }, (_, i) => ({ kode: `X${String(i).padStart(5, '0')}`, nama: `Condition number ${i} of the body with fever and cough` }));
  const big = buildLibrary({ icd, sinonim: [], kriteria: [] });
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) matchItem(`penyakit tidak jelas nomor ${i} dengan keluhan demam`, big);
  assert.ok(performance.now() - t0 < 1500, `took ${Math.round(performance.now() - t0)} ms`);
});
