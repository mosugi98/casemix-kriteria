const CODE = /^[A-Za-z]\d{2}(?:\.?\d{1,4})?$/;

export function normalizeCode(s) {
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const MAX_JOIN = 6; // longest run of comma pieces tried as one known name

// Split pasted text into distinct diagnosis items (newline, semicolon or comma separated).
// `isKnownName(text)` keeps a comma-containing ICD name or synonym whole, e.g. "Cholera, unspecified".
export function splitInput(text, isKnownName = () => false) {
  const out = [];
  const seen = new Set();
  const add = (raw) => {
    const item = raw.replace(/^\s*\d+[.)]\s+/, '').trim();
    if (!item) return;
    const tokens = item.split(/\s+/);
    if (tokens.length > 1 && tokens.every((t) => CODE.test(t))) { tokens.forEach(add); return; }
    const key = CODE.test(item) ? normalizeCode(item) : item.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) { seen.add(key); out.push(item); }
  };
  for (const line of String(text).split(/\r?\n|;/)) {
    const pieces = line.split(',');
    for (let i = 0; i < pieces.length; ) {
      let take = 1;
      for (let n = Math.min(MAX_JOIN, pieces.length - i); n > 1; n--) {
        if (isKnownName(pieces.slice(i, i + n).join(',').trim())) { take = n; break; }
      }
      add(pieces.slice(i, i + take).join(','));
      i += take;
    }
  }
  return out;
}
