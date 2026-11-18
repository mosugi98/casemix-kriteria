# Casemix Kriteria Diagnosis — Design

Date: 2026-11-18 · Status: awaiting approval

## Intent and why
Casemix coders verify whether a diagnosis meets its clinical criteria before coding/claiming. Today they copy diagnoses out of SIMGOS (or other apps) and check criteria elsewhere. The app is an **assistant**: paste diagnoses, see each diagnosis's criteria checklist, tick fulfilled / not fulfilled. It replaces the "Kriteria Diagnosis" feature of the old Skrining AI app (`skrining AI Ollama.zip`) as a standalone tool.

## Goals
- Paste text containing one or more diagnoses (ICD-10 codes, names, or a mix); app identifies each and shows its criteria checklist.
- Coder ticks each criterion; app shows per-diagnosis status (all required criteria fulfilled / not).
- Criteria library can be imported from the old app's criteria export, and maintained later by admin/casemix.
- Reachable from anywhere via a public URL on GitHub Pages.
- No patient-identifying data entered, sent, or stored.

## Non-goals
- No patient records, no `no_rm`/names, no saved verifications, no audit trail, no accounts or login.
- No connection to SIMGOS (copy/paste only).
- No AI/Ollama in v1.
- No automatic decision on coding; the coder decides.

## Anti-goals (failure even if it "works")
- Any pasted text leaving the browser (no server calls, analytics, or third-party scripts that receive input).
- Patient data or the old app's database/keys ending up in the repo.
- A coder silently losing a diagnosis because it could not be matched.

## Constraints
- Hosting: GitHub Pages (static files only). Public repo and site; visibility is acceptable to the user.
- No build step; plain HTML/CSS/JS so admin can edit data files directly on github.com.
- UI language: Indonesian (my call: matches the old app and users).
- Must stay movable to a hospital-internal web server without changes (static files only).

## Approaches considered
- **A. Python (FastAPI + SQLite) server like the old app.** Easy reuse of old code, but GitHub cannot host it. Rejected after the public-hosting requirement.
- **B. React frontend + API backend.** Two codebases, overkill for a checklist tool. Rejected.
- **C. Excel/macro tool.** No roles, hard imports, poor sharing. Rejected.
- **D. Static client-side web app on GitHub Pages. (Chosen by user's requirements.)** Everything runs in the browser; data files live in the repo.

## Design
**Data files (in repo, `data/`):**
- `kriteria.csv` — one row per criterion: diagnosis code, description (`uraian`), type (`jenis`, e.g. `wajib`). Same shape as the old app's import so its export converts directly.
- `icd10.csv` — code and name; used for lookup and matching (from the old app's `icd10.csv`).
- `sinonim.csv` — term → code synonyms (from old `sinonim_dx.csv`).

**Matching (my call):** split input on new lines, semicolons and commas (comma added 2026-11-18 at the user's request; a comma-separated run that exactly equals an ICD name or synonym, such as "Cholera, unspecified", is kept whole); on single-line input, first pull out ICD-10 codes by pattern. For each item try: exact code → exact name → synonym → close text match. Items with no match, or several candidates, appear in the result list flagged "pick diagnosis" with a search box; they are never dropped. Diagnoses with no criteria show "no criteria in library".

**Screen (one page):** paste box + Identify button → list of diagnoses, each with its checklist, a count ("3 of 5 fulfilled"), and an overall badge. Required criteria all ticked = "Fulfilled"; otherwise lists what is missing (my call; non-required types are shown as supporting info and do not block). "Copy result as text" button for pasting back into SIMGOS. Clear button. A visible warning not to paste patient names or `no_rm`.

**Updating criteria:** admin/casemix edits `kriteria.csv` on github.com (commit = published). Optional in-browser import of a CSV for personal/temporary use, kept in that browser's local storage only and labelled as such.

**Privacy:** no cookies, no analytics, no external requests at runtime (fonts bundled). Ticks and pasted text exist only in page memory.

## Decisions left to the builder
- Exact CSV headers: read the old app's template (`/kriteria/impor/contoh.csv`) and keep compatible; define handling for any `jenis` values beyond `wajib`.
- Close-text matching method and thresholds; test with real diagnosis phrasing.
- Visual design, within a simple, readable, mobile-friendly layout.
- Whether to bundle the old `icd10.csv` as-is (confirm it is a public ICD-10 list, not hospital-specific).

## Handoff notes / risks
- **Never commit** anything from the old zip other than the criteria export, ICD-10 list and synonym list: not `skrining.db*`, `*.pem`, `admin_awal.txt`, license files, or backups (they hold patient data and keys).
- The user should download the criteria with the old app's "Unduh kriteria saat ini" so the database is never opened or copied.
- Public criteria: confirm nothing in the library is confidential to the hospital before publishing.
- Tests: small automated tests for the splitter/matcher and the status logic.
