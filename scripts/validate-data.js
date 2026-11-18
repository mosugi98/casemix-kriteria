import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseCsv } from '../src/csv.js';
import { normalizeCode } from '../src/split.js';

const REQUIRED = {
  'icd10.csv': ['kode', 'nama'],
  'sinonim.csv': ['istilah', 'kode'],
  'kriteria.csv': ['kode', 'uraian', 'jenis'],
};

const headerOf = (text) => text.replace(/^﻿/, '').split(/\r?\n/)[0].split(',').map((h) => h.trim().toLowerCase());

// Returns a list of human-readable problems; empty list means the data is fine.
export function validateData({ icd, sinonim, kriteria }) {
  const problems = [];
  const texts = { 'icd10.csv': icd, 'sinonim.csv': sinonim, 'kriteria.csv': kriteria };
  for (const [file, cols] of Object.entries(REQUIRED)) {
    const head = headerOf(texts[file]);
    for (const c of cols) if (!head.includes(c)) problems.push(`${file}: kolom "${c}" tidak ada`);
  }
  if (problems.length) return problems;

  const codes = new Set(parseCsv(icd).map((r) => normalizeCode(r.kode)));
  parseCsv(sinonim).forEach((r, i) => {
    if (!codes.has(normalizeCode(r.kode))) problems.push(`sinonim.csv baris ${i + 2}: kode ${r.kode} tidak ada di icd10.csv`);
  });
  parseCsv(kriteria).forEach((r, i) => {
    if (!r.kode) problems.push(`kriteria.csv baris ${i + 2}: kode kosong`);
    else if (!codes.has(normalizeCode(r.kode))) problems.push(`kriteria.csv baris ${i + 2}: kode ${r.kode} tidak ada di icd10.csv`);
    if (!r.uraian) problems.push(`kriteria.csv baris ${i + 2}: uraian kosong`);
  });
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const read = (f) => readFileSync(join(dir, f), 'utf8');
  const data = { icd: read('icd10.csv'), sinonim: read('sinonim.csv'), kriteria: read('kriteria.csv') };
  const problems = validateData(data);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  const n = (t) => parseCsv(t).length;
  console.log(`OK: ${n(data.icd)} ICD-10, ${n(data.sinonim)} sinonim, ${n(data.kriteria)} kriteria`);
  if (!n(data.kriteria)) console.warn('Peringatan: kriteria.csv masih kosong.');
}
