# Casemix Kriteria Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, client-side web app where a casemix coder pastes diagnoses, sees each diagnosis's criteria checklist, and ticks fulfilled/not.

**Architecture:** Plain HTML/CSS/ES-module JavaScript, no build step, hosted on GitHub Pages. Pure logic lives in small modules under `src/` (testable with Node's built-in test runner); `app.js` only wires the DOM. Data (ICD-10, synonyms, criteria) are CSV files in `data/` fetched at load.

**Tech Stack:** HTML, CSS, vanilla ES modules. Tests: Node 20+ `node --test` (dev only, zero dependencies).

**Spec:** `docs/superpowers/specs/2026-11-18-casemix-kriteria-design.md`

## Global Constraints

- Static files only; no build step; no runtime dependency; no external network requests (fonts bundled or system fonts).
- UI language: Indonesian.
- No cookies, analytics, or storage of pasted text/ticks. Only the optional personal criteria import may use `localStorage`, labelled as "tersimpan di browser ini saja".
- Never commit from the old zip: `skrining.db*`, `*.pem`, `admin_awal.txt`, `lisensi*`, backups. Only the criteria export, `icd10.csv`, `sinonim_dx.csv`.
- Input is split on new lines and semicolons only (never commas).
- A diagnosis is "Fulfilled" only when every `wajib` criterion is ticked; other types are informational.
- Unmatched diagnoses are never dropped.
- Render all user text with `textContent` (never `innerHTML`).

## Review Focus

- Empty or whitespace-only paste: show a hint, no crash.
- CSV files with BOM, CRLF line endings, and quoted fields containing commas.
- Same diagnosis pasted twice: shown once.
- Code variants: lowercase `j18.9`, no dot `J189`, trailing text `J18.9 - Pneumonia`.
- A diagnosis with no criteria: shows "Belum ada kriteria", never "Fulfilled".
- Pasted `<script>` or HTML: displayed as plain text.
- Very large paste (thousands of lines): stays responsive (cap display at 200 items with a notice).

## File Structure

- `index.html`, `style.css`, `app.js` — page and DOM wiring.
- `src/csv.js` — CSV parsing. `src/split.js` — input splitting. `src/library.js` — builds lookup tables. `src/match.js` — diagnosis matching. `src/status.js` — checklist status and copy-text.
- `data/icd10.csv`, `data/sinonim.csv`, `data/kriteria.csv` — library.
- `tests/*.test.js`, `scripts/validate-data.js`, `README.md`, `.gitignore`.

---

### Task 1: Repo scaffold and CSV parser

**Files:**
- Create: `.gitignore`, `README.md`, `package.json` (`"type":"module"`, script `"test":"node --test tests/"`), `src/csv.js`, `tests/csv.test.js`

**Interfaces:**
- Produces: `parseCsv(text: string): Array<Record<string,string>>` — first row is the header; keys trimmed and lowercased; strips a leading BOM; handles CRLF and quoted fields with commas/quotes/newlines; skips blank rows.

- [ ] **Step 1:** In `D:\Claude\Casemix-Kriteria` run `git init`. Ask the user which commit email to use (it becomes public), then set it with `git config user.email/user.name` for this repo. `.gitignore` must list `*.db`, `*.db.*`, `*.pem`, `admin_awal.txt`, `lisensi*`, `*.zip`, `node_modules/`.
- [ ] **Step 2: Write failing tests** in `tests/csv.test.js`: `parseCsv('\uFEFFkode,Uraian\r\nJ18.9,"Demam, batuk"\r\n')` deep-equals `[{kode:'J18.9',uraian:'Demam, batuk'}]`; a quoted `""` yields a literal quote; blank lines are skipped; header-only input returns `[]`.
- [ ] **Step 3:** Run `npm test` — expect FAIL (module missing).
- [ ] **Step 4:** Implement `parseCsv` in `src/csv.js` (small state machine over characters).
- [ ] **Step 5:** Run `npm test` — expect PASS.
- [ ] **Step 6:** Commit `chore: scaffold repo and csv parser` (end message with the `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` line).

### Task 2: Input splitter

**Files:** Create `src/split.js`, `tests/split.test.js`

**Interfaces:**
- Produces: `normalizeCode(s: string): string` — uppercase, strip everything except letters/digits (`'j18.9'`→`'J189'`).
- Produces: `splitInput(text: string): string[]` — trimmed, non-empty, de-duplicated (by `normalizeCode`-insensitive lowercase text), order kept.

- [ ] **Step 1: Write failing tests**: `splitInput('Pneumonia\nDiabetes mellitus, type 2;  J18.9')` → `['Pneumonia','Diabetes mellitus, type 2','J18.9']` (comma kept); `splitInput('  \n ')` → `[]`; duplicates `'J18.9\nj18.9'` → one item; leading numbering `'1. Pneumonia\n2) Sepsis'` → `['Pneumonia','Sepsis']`; a single line `'J18.9 E11.9 I10'` → `['J18.9','E11.9','I10']` (single-line input with several code-like tokens is split into those codes); `normalizeCode('j18.9')==='J189'`.
- [ ] **Step 2:** Run — expect FAIL. **Step 3:** Implement. **Step 4:** Run — expect PASS. **Step 5:** Commit `feat: input splitter`.

### Task 3: Library and matcher

**Files:** Create `src/library.js`, `src/match.js`, `tests/match.test.js`

**Interfaces:**
- Consumes: `normalizeCode`, `parseCsv` rows (`icd`: `{kode,nama}`, `sinonim`: `{istilah,kode}`, `kriteria`: `{kode,uraian,jenis}`).
- Produces: `buildLibrary({icd, sinonim, kriteria}): Library` with `Library = { icd: Array<{code,name}>, byCode: Map<string,{code,name}> (key normalizeCode), byName: Map<string,{code,name}> (key lowercased name), syn: Map<string,string> (lowercased term → normalized code), criteria: Map<string, Criterion[]> (key normalized code) }` and `Criterion = { uraian: string, jenis: string, wajib: boolean }` where `wajib = jenis.trim().toLowerCase()==='wajib'`.
- Produces: `matchItem(item: string, lib: Library): { input: string, status: 'matched'|'choose'|'none', code?: string, name?: string, candidates: Array<{code,name}> }`. Order: code (also when the code appears at the start of the text, e.g. `J18.9 - Pneumonia`) → exact name → synonym → close text (token overlap ≥ 0.6, max 5 candidates, status `'choose'`) → `'none'` with empty candidates.

- [ ] **Step 1: Write failing tests** with a 4-row fixture library: `matchItem('j189',lib)` and `'J18.9 - Pneumonia'` both → matched, code `J18.9`; exact name case-insensitive → matched; synonym `'radang paru'` → matched; `'pneumonia berat'` → status `choose` with `J18.9` among candidates; `'asdfgh'` → `none`; criteria for a code come back via `lib.criteria.get('J189')` with `wajib` true for `jenis:'wajib'` and false for `'pendukung'`.
- [ ] **Step 2–4:** Run FAIL, implement, run PASS. **Step 5:** Commit `feat: library builder and matcher`.

### Task 4: Checklist status and copy text

**Files:** Create `src/status.js`, `tests/status.test.js`

**Interfaces:**
- Produces: `diagnosisStatus(criteria: Criterion[], ticked: Set<number>): { total: number, tickedTotal: number, state: 'fulfilled'|'incomplete'|'no-criteria', missing: Criterion[] }` — `ticked` holds indexes into `criteria`; `missing` lists unticked `wajib` criteria; `no-criteria` when the list is empty or has no `wajib` item.
- Produces: `formatResult(entries: Array<{label: string, status: ReturnType<typeof diagnosisStatus>}>): string` — one line per diagnosis: `J18.9 Pneumonia — Terpenuhi (3/5)` / `Belum terpenuhi (2/5), kurang: ...` / `Belum ada kriteria`.

- [ ] **Step 1: Write failing tests**: all wajib ticked → `fulfilled` even if a `pendukung` is unticked; one wajib unticked → `incomplete` with that criterion in `missing`; empty list → `no-criteria`; only non-wajib criteria → `no-criteria`; `formatResult` output contains the exact Indonesian phrases above.
- [ ] **Step 2–4:** Run FAIL, implement, run PASS. **Step 5:** Commit `feat: checklist status and result text`.

### Task 5: Library data and validation

**Files:** Create `data/icd10.csv`, `data/sinonim.csv`, `data/kriteria.csv`, `scripts/validate-data.js`

**Interfaces:** Consumes `parseCsv`; `validate-data.js` exits non-zero and prints the problem when a file is missing required headers (`kode,nama` / `istilah,kode` / `kode,uraian,jenis`), has an empty `kode`/`uraian`, or a criteria `kode` not in `icd10.csv`.

- [ ] **Step 1:** Extract only `skrining/icd10.csv` and `skrining/sinonim_dx.csv` from the old zip into `data/` (rename the second to `sinonim.csv`). Do not extract anything else. Confirm `icd10.csv` is a public ICD-10 list, not hospital-specific.
- [ ] **Step 2:** Ask the user to download **Kriteria Diagnosis → Unduh kriteria saat ini** from the old app and place it at `data/kriteria.csv`. Map its headers to `kode,uraian,jenis` if they differ (edit header row only), and note any `jenis` values besides `wajib` in `README.md`.
- [ ] **Step 3:** Write `scripts/validate-data.js`; run `node scripts/validate-data.js` — expect `OK` and counts. Fix data problems it reports.
- [ ] **Step 4:** Ask the user to confirm no criterion is hospital-confidential (the repo is public). Commit `feat: add library data`.

### Task 6: Page and wiring

**Files:** Create `index.html`, `style.css`, `app.js`

**Interfaces:** Consumes `parseCsv`, `splitInput`, `buildLibrary`, `matchItem`, `diagnosisStatus`, `formatResult`.

- [ ] **Step 1:** `index.html`: Indonesian page with a visible warning "Jangan menempel nama pasien atau nomor RM", a textarea, **Identifikasi** and **Bersihkan** buttons, a results region, **Salin hasil** button, and a section "Impor kriteria pribadi (tersimpan di browser ini saja)". `<script type="module" src="app.js">`. No external URLs.
- [ ] **Step 2:** `app.js`: fetch the three CSVs relative to the page, build the library (a personal import from `localStorage`, if present, replaces `kriteria`); on Identifikasi, split → match each item → render with `textContent`. `matched`: checklist with checkboxes, live "x dari y terpenuhi" and a badge (Terpenuhi / Belum terpenuhi / Belum ada kriteria). `choose`: candidate buttons plus a search box over `lib.icd`. `none`: "Tidak ditemukan — cari diagnosis" with the same search box. Cap rendering at 200 items with a notice. Wrap all `localStorage` access in try/catch.
- [ ] **Step 3:** `style.css`: readable, mobile-friendly, light and dark colors via CSS variables; system font stack.
- [ ] **Step 4:** Serve with `python -m http.server` and verify in a browser (use the run skill): paste `J18.9\nDiabetes\nasdfgh` and confirm three result types appear, ticks update the count, pasted `<b>x</b>` shows literally, and the DevTools Network tab shows only same-origin requests.
- [ ] **Step 5:** Commit `feat: web page`.

### Task 7: Publish

**Files:** Modify `README.md` (how to update `data/kriteria.csv` on github.com, how to run tests, how to host on an internal server).

- [ ] **Step 1:** `grep -rE "https?://" index.html app.js src style.css` — expect no matches other than same-origin or comments.
- [ ] **Step 2:** Run `npm test` and `node scripts/validate-data.js` — expect all pass.
- [ ] **Step 3:** After the user confirms the repo name, run `gh repo create casemix-kriteria --public --source=. --push`, then enable Pages (Settings → Pages → branch `main`/`master`, root) or `gh api -X POST repos/mosugi98/casemix-kriteria/pages -f "source[branch]=<branch>" -f "source[path]=/"`.
- [ ] **Step 4:** Open the published URL and repeat Task 6 Step 4's check. Give the user the link.
