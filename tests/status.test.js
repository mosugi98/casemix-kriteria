import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosisStatus, formatResult } from '../src/status.js';

const W1 = { uraian: 'Demam', jenis: 'wajib', wajib: true };
const W2 = { uraian: 'Infiltrat', jenis: 'wajib', wajib: true };
const P = { uraian: 'Batuk', jenis: 'pendukung', wajib: false };

test('fulfilled when all wajib ticked even if supporting is not', () => {
  const s = diagnosisStatus([W1, W2, P], new Set([0, 1]));
  assert.equal(s.state, 'fulfilled');
  assert.equal(s.tickedTotal, 2);
  assert.equal(s.total, 3);
  assert.deepEqual(s.missing, []);
});

test('incomplete lists the missing wajib criterion', () => {
  const s = diagnosisStatus([W1, W2, P], new Set([0, 2]));
  assert.equal(s.state, 'incomplete');
  assert.deepEqual(s.missing, [W2]);
});

test('empty criteria means no-criteria, never fulfilled', () => {
  assert.equal(diagnosisStatus([], new Set()).state, 'no-criteria');
});

test('only supporting criteria means no-criteria', () => {
  assert.equal(diagnosisStatus([P], new Set([0])).state, 'no-criteria');
});

test('formatResult wording', () => {
  const text = formatResult([
    { label: 'J18.9 Pneumonia', status: diagnosisStatus([W1, W2, P], new Set([0, 1])) },
    { label: 'E11.9 DM', status: diagnosisStatus([W1, W2], new Set([0])) },
    { label: 'I10 HT', status: diagnosisStatus([], new Set()) },
  ]);
  assert.equal(
    text,
    ['J18.9 Pneumonia — Terpenuhi (2/3)', 'E11.9 DM — Belum terpenuhi (1/2), kurang: Infiltrat', 'I10 HT — Belum ada kriteria'].join('\n'),
  );
});
