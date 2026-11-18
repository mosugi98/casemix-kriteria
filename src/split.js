const CODE = /^[A-Za-z]\d{2}(?:\.?\d{1,4})?$/;

export function normalizeCode(s) {
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Split pasted text into distinct diagnosis items (newline / semicolon separated; commas are kept).
export function splitInput(text) {
  const out = [];
  const seen = new Set();
  const add = (item) => {
    const key = CODE.test(item) ? normalizeCode(item) : item.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) { seen.add(key); out.push(item); }
  };
  for (const raw of String(text).split(/\r?\n|;/)) {
    const item = raw.replace(/^\s*\d+[.)]\s+/, '').trim();
    if (!item) continue;
    const tokens = item.split(/\s+/);
    if (tokens.length > 1 && tokens.every((t) => CODE.test(t))) tokens.forEach(add);
    else add(item);
  }
  return out;
}
