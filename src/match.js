import { normalizeCode } from './split.js';

const LEADING_CODE = /^([A-Za-z]\d{2}(?:\.?\d{1,4})?)(?![A-Za-z0-9])/;
const MIN_COVERAGE = 0.5; // share of the input's words that must appear in an ICD name
const MAX_CANDIDATES = 5;

const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

// Identify one pasted diagnosis: code, exact name, synonym, then close text.
export function matchItem(item, lib) {
  const input = item.trim();
  const found = (e) => ({ input, status: 'matched', code: e.code, name: e.name, candidates: [] });

  const lead = LEADING_CODE.exec(input);
  if (lead && lib.byCode.has(normalizeCode(lead[1]))) return found(lib.byCode.get(normalizeCode(lead[1])));

  const named = lib.byName.get(input.toLowerCase());
  if (named) return found(named);

  const synCode = lib.syn.get(input.toLowerCase());
  if (synCode && lib.byCode.has(synCode)) return found(lib.byCode.get(synCode));

  const inWords = new Set(words(input));
  if (inWords.size) {
    const scored = [];
    for (const e of lib.icd) {
      const nameWords = new Set(words(e.name));
      let hit = 0;
      for (const w of inWords) if (nameWords.has(w)) hit++;
      const coverage = hit / inWords.size;
      if (coverage >= MIN_COVERAGE) scored.push({ e, coverage });
    }
    scored.sort((a, b) => b.coverage - a.coverage || a.e.name.length - b.e.name.length);
    if (scored.length) {
      return { input, status: 'choose', candidates: scored.slice(0, MAX_CANDIDATES).map((s) => s.e) };
    }
  }
  return { input, status: 'none', candidates: [] };
}
