# Creative AI brand dossier foundation

This isolated module is mounted in the existing root Node app (`server.js`). No applicable AGENTS.md exists in this part of the project. It adds no research collector, generation model, approval requirement, or deployment.

## Run and view

Use Node 20.9+ with the project's existing dependencies:

```sh
npm start
```

Open `http://127.0.0.1:1824/dossiers/demo` (or the configured PORT). The root page also links to the demonstration. It is conspicuously labeled as a sample, including in the PDF. Its sole illustration is locally authored fictional artwork, not an official image or collected screenshot. No website/social/Meta research was performed. The sample collection timestamp describes the fixture, not live retrieval.

## Research-completed handoff

`contract.d.ts` describes the provisional dossier boundary, and `contract.js` enforces it at runtime. The user is still reviewing the broader researcher contract; that implementation remains out of scope.

Brand research refreshes (`lib/creative-ai/runtime/research-session.js`) save a dossier; individual generation jobs only validate their research with `contract.js` and do not save one (8 Nov 2026). A research producer calls `createDossierStore(root).researchCompleted(payload)` when collection and synthesis finish, or sends the same JSON to `POST /api/dossiers/research-completed`. This automatically renders and persists all three files and returns `{ id, viewUrl, pdfUrl, inventoryUrl }`. No manual save or approval step intervenes. Mount `viewUrl` in the research results panel of the future Creative AI workflow. The existing legacy research pipeline has not been automatically adapted: it does not establish the provenance needed by this boundary. Its generated summaries must not be silently labeled as collected evidence.

Persisted content (storage version 2, 8 Nov 2026) lives under `output/brand-dossiers/`: each version is a folder `<sha256>/` holding one compact `research.json`, in which every embedded picture is replaced by `image: {sha256, mime, bytes}`. The picture bytes are saved once as `images/<sha256>.png|jpg` and shared by every dossier, so a new job adds only its own new pictures. The HTML view, PDF and full JSON inventory are built on request; nothing is saved three times. Content-addressed immutable versions make exact retries idempotent. New pictures must decode (with the same decoder as the PDF export) before anything is published; the record publishes through a staging-directory rename. Changed payloads produce a new version. Version-1 folders (`research.json` with base64 pictures, `dossier.html`, `dossier.pdf`) are served exactly as saved. This is local disk persistence, not a cloud document store, and `output/brand-dossiers` is outside the CDN upload scope. See `docs/dossier-storage-20261108.md`.

GET/HEAD `/dossiers/:id`, `/dossiers/:id/pdf`, `/dossiers/:id/json` and `/dossiers/images/<sha256>.png|jpg` serve the view, downloads and shared pictures. The JSON download returns the research exactly as supplied, pictures embedded. The PDF is rebuilt for each download (about 10–20 seconds for a full brand dossier) and is not cached on disk. PDF is the supported presentation-style export; an editable PPTX export is not implemented. The full structured inventory is preserved in JSON. PDF appendix includes every source, and representative images retain their source reference and actual collection date. No external image URLs are fetched: the authorized collector must supply embedded PNG/JPEG bytes. Missing bytes remain explicitly unavailable.

## Evidence and layout

Source coverage and the appendix always reflect supplied source records. Sections appear only when findings or candidate references exist. Evidence requires accessible source references; inference is visibly marked, and sample findings require demo mode. All ad observations and ad images require a Meta source with a verified advertiser ID. Verification is a collector assertion, not an independent API check by this renderer.

Use separate `ads` findings for observed copy, offers, CTAs, visual patterns, concepts, and variations. Use `text` for supplied authentic excerpts. Attach representative ad assets through `assetIds`; retain optional collector metadata in `asset.metadata`. Do not add guessed dates, impressions, targeting, conversions or performance. The report visibly states that library observations do not prove performance. Add conflicts/missing evidence as source notes or `conflicts` findings; distinguish proposed continuity from exploration using `direction`.

PDF uses landscape presentation pages, contained imagery, wrapped citations and continuation pages. Browser text supports Unicode; the PDF's built-in Helvetica substitutes unsupported glyphs with `?`. A multilingual embedded font is a remaining integration before non-Latin production delivery. The module deliberately provides no image API assumptions, including about the model the user calls ChatGPT image 2.0.

## Limits and next integrations

- Approved researcher contract and producer event wiring, including official site/product collection, PDF/Drive ingestion, official asset selection, and accessible official social evidence.
- Verified Meta advertiser resolution, authorized collection access, and API coverage. No scraping or working Meta integration is claimed.
- Production identity/access controls, retention, quotas, cloud storage and background export jobs. Current routes follow the existing local-only server and must not be publicly exposed as-is.
- Richer narrative selection (currently stable input order, up to two representative cards per page), multilingual fonts, optional editable presentation export, and UI integration into future research results.
- No unrelated Creative AI screens, live agents, format specifications, or static generation integration are included.

## Validation

```sh
node --require ./tests/creative-ai/offline-bootstrap.cjs --test tests/creative-ai/dossier-storage.test.js
```

`dossier-storage.test.js` covers compact storage, shared pictures, per-job logo dates, on-request view/PDF/JSON, version-1 folders and undecodable pictures. The older `tests/brand-dossier/dossier.test.js` suite named below is no longer in the repository. Its original coverage was: unavailable evidence and adaptive sections, escaping, rejected orphan citations, spoofed Meta access, disabled remote-image fetching, automatic persistence, idempotence, readable PDF structure, embedded imagery and attribution, and failed-image rollback. Generated sample PDF is visually reviewed with Poppler; do the same for production research and lengthy source inventories.
