# Compact brand dossier storage (8 November 2026)

## Symptom

`output/brand-dossiers` held 564 folders and about 180 GB on 8 Nov 2026, with the disk 87% full. Each folder was a complete copy of the brand dossier: `research.json` (122 MB), `dossier.html` (123 MB) and `dossier.pdf` (87 MB) for Duroflex; about 150–165 MB for Sleepyhead. 99.9% of each file was embedded pictures: for Duroflex, 73 images including 53 brand-library mood/reference images (114 MB). Each picture was stored as base64 text, in a PNG that is often 4× its original JPEG, three times per folder.

A new folder was written whenever the research payload differed:

- every job for a different product or variant (its SKU source and photos differ), carrying a full copy of every brand picture;
- every job that attached the approved logo, because `approved-identity.js` stamped the logo source with the time the job read it (`pin.pinnedAt` is never set).

425 of the 564 folders (137 GB) are not referenced by any job or research session. Building each folder also rendered an 87 MB PDF during the job's research stage (about 10–20 seconds).

## Change (shared engine, both brands)

- `lib/brand-dossier/index.js` storage version 2: each version folder keeps one compact `research.json` in which each picture is `image: {sha256, mime, bytes}`. Picture bytes are saved once under `images/<sha256>.png|jpg` and shared by all dossiers. New pictures must decode with the PDF decoder before anything is published.
- The HTML view (pictures served from `/dossiers/images/...`), the PDF and the full JSON inventory are built on request. The JSON download is byte-identical to the original research. The PDF is rebuilt for each download and is not cached.
- Version-1 folders are served exactly as saved. No existing folder was changed, moved or deleted.
- `approved-identity.js`: the approved-logo source `collectedAt` is the date the content-addressed logo file was saved to the brand library (birth time, else modification time), unless `pinnedAt` exists.
- `contract.js`: `validateResearch(input, {clone:false})` validates without copying 100+ MB of pictures.
- `render.js`: `renderPdf(d, {resolveImage})` accepts shared-image sources. Images are copied to a standalone `Uint8Array` before pdf-lib embedding, because small decoded Buffers share Node's pool and pdf-lib read the wrong bytes ("SOI not found in JPEG" for JPEGs under about 4 KB).
- `images/` is outside the CDN upload scope (`cdn-media.js scope()` covers only `output/creative-ai/{jobs,brands}`).

## Verification

- New regression test `tests/creative-ai/dossier-storage.test.js`. Before the change: 4 of 5 failed (approved-logo date differed between two jobs; small JPEG failed PDF render; no shared-image route); the undecodable-picture guard already passed. After: 5/5 pass.
- Focused suites touching dossiers and approved logos (approved-identity, brand-isolation, research-session, runtime, lean-main-flow, handoff-performance, brands, refinements, publishing-copy): 100/100 pass.
- Both-brand saved-research check (read-only; scratch store outside `output/`), using the dossiers written by the 8 Nov test jobs:

| Saved dossier | Old folder | Store grew by | JSON download identical |
|---|---|---|---|
| Duroflex Spine Contour Pillow | 332.7 MB | 91.7 MB (first: shared brand pictures) | yes |
| Duroflex Quboid | 332.7 MB | 4.1 MB | yes |
| Duroflex Octave | 327.7 MB | 2.8 MB | yes |
| Sleepyhead Napster Mini | 151.2 MB | 41.2 MB (first for the brand) | yes |
| Sleepyhead Sofa Kiki | 165.1 MB | 8.4 MB | yes |

Five jobs: 1.31 GB before, 148 MB after. Each compact record is about 0.1 MB, the view 0.2 MB. PDF rebuilds took 6–19 s.

- `npm run test:qa:both-brands` could not run: its saved fixtures `creative-8e57a041…` and `creative-0c9b259c…` no longer exist (ENOENT). This is an incomplete check, not a pass, and predates this change.

## Per-job dossier reports stopped (same day)

The user approved stopping per-job saves after confirming nothing in generation reads them.

- `engine.js` research stage no longer calls `dossierStore.researchCompleted` or sets `job.artifacts.dossier`. It runs `validateResearch(research.dossier, {clone:false})` instead. In the lean flow this was the only place the research contract (cited sources exist and are accessible, valid embedded pictures, Meta verification) was checked, so the check is kept.
- Brand research refreshes and saved-context reuse (`research-session.js`) still save one report each, linked from the old technical workspace's brand research panel. The old project view hides its dossier link when a job has none.
- Existing jobs keep their `artifacts.dossier` links and saved folders.
- Tests (`tests/creative-ai/lean-main-flow.test.js`, both brands): "a job checks its research without saving a dossier report" and "research that fails the dossier check stops the job before paid planning". Both failed before the change and pass after. The shared fixture's research was made a valid research record; previously the test replaced the save step, so the check never ran on it. All 33 tests in that file pass.

## Not done

- The 425 unreferenced version-1 folders (137 GB) and the stale `.pending-*` staging folder remain. Removing them is a deletion that needs explicit approval and a dry-run list first.
- Jobs still embed full pictures in their own in-memory research objects; only the dossier copy is compact. The memory issues in `artifact-fs.readFile` and `brand-isolation` are separate.
- The running Studio uses the new code only after a controlled restart.

## Clean-up done (8 Nov 2026, user approved permanent deletion)
- Removed 425 version-1 dossier folders (136.9 GB, made between 12 Oct and 4 Nov 2026) that no job or research session referenced, plus the stale `.pending-4vfG5P` staging folder.
- **How the list was made:** every `.json` file under `output/` (except the dossier folder itself) was scanned for `dossiers/<id>` links. The list was re-checked against files changed in the previous five hours just before deleting.
- **Record:** the list is in `work/dossier-cleanup-dry-run-20261108.json`.
- **Kept:** the 139 version-1 folders that jobs or research still reference are unchanged and still served as saved. `output/brand-dossiers` is now 40 GB; disk use went from 87% to 57% (188 GB free).
