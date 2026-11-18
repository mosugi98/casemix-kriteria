import { normalizeCode } from './split.js';

// Build lookup tables from parsed CSV rows.
export function buildLibrary({ icd = [], sinonim = [], kriteria = [] }) {
  const lib = { icd: [], byCode: new Map(), byName: new Map(), syn: new Map(), criteria: new Map() };
  for (const r of icd) {
    if (!r.kode) continue;
    const entry = { code: r.kode, name: r.nama || '' };
    lib.icd.push(entry);
    lib.byCode.set(normalizeCode(r.kode), entry);
    if (r.nama) lib.byName.set(r.nama.toLowerCase(), entry);
  }
  for (const r of sinonim) {
    if (r.istilah && r.kode) lib.syn.set(r.istilah.trim().toLowerCase(), normalizeCode(r.kode));
  }
  for (const r of kriteria) {
    if (!r.kode || !r.uraian) continue;
    const key = normalizeCode(r.kode);
    const jenis = r.jenis || 'wajib';
    if (!lib.criteria.has(key)) lib.criteria.set(key, []);
    lib.criteria.get(key).push({ uraian: r.uraian, jenis, wajib: jenis.trim().toLowerCase() === 'wajib' });
  }
  return lib;
}
