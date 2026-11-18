import { parseCsv } from './src/csv.js';
import { splitInput, normalizeCode } from './src/split.js';
import { buildLibrary } from './src/library.js';
import { matchItem, searchIcd } from './src/match.js';
import { diagnosisStatus, formatResult } from './src/status.js';

const STORE = 'kriteriaPribadi';
const MAX_ITEMS = 200;
const BADGE = { fulfilled: 'Terpenuhi', incomplete: 'Belum terpenuhi', 'no-criteria': 'Belum ada kriteria' };
const $ = (id) => document.getElementById(id);

let base = null; // { icd, sinonim, kriteria } rows from data/*.csv
let lib = null;
let entries = [];

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, props); // only textContent/className/type etc.; never innerHTML
  n.append(...kids);
  return n;
}

function readPersonal() {
  try { return localStorage.getItem(STORE); } catch { return null; }
}
function writePersonal(text) {
  try {
    if (text === null) localStorage.removeItem(STORE); else localStorage.setItem(STORE, text);
    return true;
  } catch { return false; }
}

function rebuild() {
  const personal = readPersonal();
  const kriteria = personal ? parseCsv(personal) : base.kriteria;
  lib = buildLibrary({ icd: base.icd, sinonim: base.sinonim, kriteria });
  $('libinfo').textContent = personal
    ? `Memakai kriteria pribadi (${kriteria.length} baris), tersimpan di browser ini saja.`
    : `Memakai kriteria bawaan (${kriteria.length} baris).`;
}

async function loadCsv(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return parseCsv(await r.text());
}

function label(e) {
  return e.code ? `${e.code} ${e.name}`.trim() : e.input;
}

function renderPicker(entry, card) {
  const box = el('div');
  box.append(el('p', { className: 'hint', textContent: entry.status === 'choose' ? 'Pilih diagnosis yang dimaksud:' : 'Tidak ditemukan. Cari diagnosis:' }));
  const pick = (c) => () => { entry.code = c.code; entry.name = c.name; entry.ticked = new Set(); renderCard(entry, card); };
  const list = el('div');
  const fill = (items) => {
    list.replaceChildren(...items.map((c) => el('button', { type: 'button', className: 'pick', textContent: `${c.code} ${c.name}`, onclick: pick(c) })));
  };
  fill(entry.candidates);
  const search = el('input', { type: 'search', placeholder: 'Ketik kode atau nama diagnosis', ariaLabel: 'Cari diagnosis' });
  search.addEventListener('input', () => fill(searchIcd(search.value, lib)));
  box.append(search, list);
  return box;
}

function renderCard(entry, card) {
  card.replaceChildren();
  card.append(el('h2', { textContent: entry.code ? label(entry) : `“${entry.input}”` }));
  if (!entry.code) { card.append(renderPicker(entry, card)); return; }
  if (entry.code && entry.input && label(entry) !== entry.input) card.append(el('p', { className: 'hint', textContent: `Teks asal: ${entry.input}` }));
  const criteria = lib.criteria.get(normalizeCode(entry.code)) || [];
  const status = diagnosisStatus(criteria, entry.ticked);
  card.firstChild.append(el('span', { className: `badge ${status.state}`, textContent: BADGE[status.state] }));
  if (!criteria.length) { card.append(el('p', { className: 'hint', textContent: 'Belum ada kriteria untuk diagnosis ini di daftar.' })); return; }
  card.append(el('p', { className: 'hint', textContent: `${status.tickedTotal} dari ${status.total} terpenuhi` }));
  criteria.forEach((c, i) => {
    const box = el('input', { type: 'checkbox', checked: entry.ticked.has(i) });
    box.addEventListener('change', () => {
      if (box.checked) entry.ticked.add(i); else entry.ticked.delete(i);
      renderCard(entry, card);
      const next = card.querySelectorAll('input[type=checkbox]')[i];
      if (next) next.focus();
    });
    card.append(el('label', { className: 'check' }, box, el('span', { textContent: c.uraian }), el('span', { className: 'tag', textContent: c.wajib ? '' : `(${c.jenis})` })));
  });
}

function identify() {
  const all = splitInput($('input').value);
  const items = all.slice(0, MAX_ITEMS);
  $('copied').textContent = '';
  if (!items.length) {
    entries = [];
    $('results').replaceChildren();
    $('copyRow').hidden = true;
    $('notice').textContent = 'Tempel diagnosis terlebih dahulu.';
    return;
  }
  $('notice').textContent = all.length > MAX_ITEMS ? `Hanya ${MAX_ITEMS} diagnosis pertama yang ditampilkan (dari ${all.length}).` : '';
  entries = items.map((s) => {
    const m = matchItem(s, lib);
    return { input: s, code: m.status === 'matched' ? m.code : null, name: m.name || '', status: m.status, candidates: m.candidates, ticked: new Set() };
  });
  const cards = entries.map((e) => { const c = el('article', { className: 'card' }); renderCard(e, c); return c; });
  $('results').replaceChildren(...cards);
  $('copyRow').hidden = false;
}

async function copyResult() {
  const lines = entries.map((e) => {
    const criteria = e.code ? lib.criteria.get(normalizeCode(e.code)) || [] : [];
    return { label: e.code ? label(e) : `${e.input} (belum dipilih)`, status: diagnosisStatus(criteria, e.ticked) };
  });
  const text = formatResult(lines);
  try {
    await navigator.clipboard.writeText(text);
    $('copied').textContent = 'Tersalin.';
  } catch {
    $('copied').textContent = 'Tidak bisa menyalin otomatis; salin teks ini secara manual:';
    $('results').append(el('pre', { textContent: text }));
  }
}

async function importFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length || !('kode' in rows[0]) || !('uraian' in rows[0])) {
    $('libinfo').textContent = 'Berkas tidak dikenali: baris pertama harus berisi kolom kode,uraian,jenis.';
    return;
  }
  if (!writePersonal(text)) { $('libinfo').textContent = 'Browser ini tidak mengizinkan penyimpanan; kriteria pribadi tidak dapat dipasang.'; return; }
  rebuild();
  if (entries.length) identify();
}

async function init() {
  try {
    const [icd, sinonim, kriteria] = await Promise.all(['data/icd10.csv', 'data/sinonim.csv', 'data/kriteria.csv'].map(loadCsv));
    base = { icd, sinonim, kriteria };
    rebuild();
  } catch (e) {
    $('notice').textContent = 'Daftar diagnosis gagal dimuat. Muat ulang halaman.';
    return;
  }
  $('go').addEventListener('click', identify);
  $('clear').addEventListener('click', () => { $('input').value = ''; entries = []; $('results').replaceChildren(); $('copyRow').hidden = true; $('notice').textContent = ''; });
  $('copy').addEventListener('click', copyResult);
  $('file').addEventListener('change', (ev) => ev.target.files[0] && importFile(ev.target.files[0]));
  $('reset').addEventListener('click', () => { writePersonal(null); rebuild(); if (entries.length) identify(); });
  document.body.dataset.ready = '1';
}

init();
