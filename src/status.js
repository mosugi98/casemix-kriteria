// Status of one diagnosis's checklist. `ticked` holds indexes into `criteria`.
export function diagnosisStatus(criteria, ticked) {
  const required = criteria.filter((c) => c.wajib);
  const missing = criteria.filter((c, i) => c.wajib && !ticked.has(i));
  const tickedTotal = criteria.filter((c, i) => ticked.has(i)).length;
  let state = 'fulfilled';
  if (!required.length) state = 'no-criteria';
  else if (missing.length) state = 'incomplete';
  return { total: criteria.length, tickedTotal, state, missing };
}

// Plain-text summary the coder can paste back into SIMGOS.
export function formatResult(entries) {
  return entries
    .map(({ label, status: s }) => {
      if (s.state === 'no-criteria') return `${label} — Belum ada kriteria`;
      const n = `(${s.tickedTotal}/${s.total})`;
      if (s.state === 'fulfilled') return `${label} — Terpenuhi ${n}`;
      return `${label} — Belum terpenuhi ${n}, kurang: ${s.missing.map((m) => m.uraian).join('; ')}`;
    })
    .join('\n');
}
