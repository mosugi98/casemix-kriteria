import test from 'node:test';
import assert from 'node:assert/strict';
import { validateData } from '../scripts/validate-data.js';

const icd = 'kode,nama\nJ18.9,"Pneumonia, unspecified"\n';
const sin = 'istilah,kode\nradang paru,J18.9\n';

test('clean data has no problems', () => {
  assert.deepEqual(validateData({ icd, sinonim: sin, kriteria: 'kode,uraian,jenis\nJ189,Demam,wajib\n' }), []);
});

test('reports missing headers', () => {
  const p = validateData({ icd: 'code,name\nJ18.9,x\n', sinonim: sin, kriteria: 'kode,uraian,jenis\n' });
  assert.ok(p.some((m) => m.includes('icd10.csv') && m.includes('kode')));
});

test('reports criteria whose code is not in the ICD list', () => {
  const p = validateData({ icd, sinonim: sin, kriteria: 'kode,uraian,jenis\nZ99.9,Apa,wajib\n' });
  assert.ok(p.some((m) => m.includes('Z99.9')));
});

test('reports empty uraian', () => {
  const p = validateData({ icd, sinonim: sin, kriteria: 'kode,uraian,jenis\nJ18.9,,wajib\n' });
  assert.ok(p.some((m) => m.includes('uraian')));
});

test('reports synonym pointing to unknown code', () => {
  const p = validateData({ icd, sinonim: 'istilah,kode\nxx,Q99.9\n', kriteria: 'kode,uraian,jenis\n' });
  assert.ok(p.some((m) => m.includes('Q99.9')));
});
