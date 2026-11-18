import { normalizeCode } from './split.js';

// Words of 3+ letters/digits, lowercased; used for close-text matching.
export const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

// Build lookup tables from parsed CSV rows.
export function buildLibrary({ icd = [], sinonim = [], kriteria = [] }) {
  const lib = { icd: [], byCode: new Map(), byName: new Map(), syn: new Map(), criteria: new Map(), wordIndex: new Map() };
  for (const r of icd) {
    if (!r.kode) continue;
    const entry = { code: r.kode, name: r.nama || '' };
    lib.icd.push(entry);
    for (const w of new Set(words(entry.name))) {
      if (!lib.wordIndex.has(w)) lib.wordIndex.set(w, []);
      lib.wordIndex.get(w).push(entry);
    }
    lib.byCode.set(normalizeCode(r.kode), entry);
    if (r.nama) lib.byName.set(r.nama.toLowerCase(), entry);
  }
  for (const r of sinonim) {
    if (r.istilah && r.kode) lib.syn.set(r.istilah.trim().toLowerCase(), normalizeCode(r.kode));
  }
  for (const r of kriteria) {
    const uraian = r.uraian || r.kriteria; // old app's export calls the text column "kriteria"
    if (!r.kode || !uraian) continue;
    const key = normalizeCode(r.kode);
    const jenis = r.jenis || 'wajib';
    if (!lib.criteria.has(key)) lib.criteria.set(key, []);
    lib.criteria.get(key).push({ uraian, jenis, wajib: jenis.trim().toLowerCase() === 'wajib' });
  }
  return lib;
}
