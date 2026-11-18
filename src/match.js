import { normalizeCode } from './split.js';
import { words } from './library.js';

const LEADING_CODE = /^([A-Za-z]\d{2}(?:\.?\d{1,4})?)(?![A-Za-z0-9])/;
const MIN_COVERAGE = 0.5; // share of the input's words that must appear in an ICD name
const MAX_CANDIDATES = 5;

// Manual search box: ICD entries whose code or name contains the query.
export function searchIcd(query, lib, limit = 10) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qCode = normalizeCode(q);
  const out = [];
  for (const e of lib.icd) {
    const byCodePart = /\d/.test(qCode) && normalizeCode(e.code).includes(qCode);
    if (byCodePart || e.name.toLowerCase().includes(q)) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return out;
}

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
    const hits = new Map(); // entry -> how many input words its name contains
    for (const w of inWords) for (const e of lib.wordIndex.get(w) || []) hits.set(e, (hits.get(e) || 0) + 1);
    const scored = [];
    for (const [e, hit] of hits) {
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
