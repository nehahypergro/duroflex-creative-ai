# Duroflex Group Creative AI

A local studio that makes marketing artwork for Duroflex and Sleepyhead with OpenAI models. Each brand has its own documents, research, products, assets and preference memory. The generic product is separate. Project rules for coding agents are in `AGENTS.md`; dated change notes are in `docs/`.

## Run locally

1. **Requirements:** macOS, Node 20.9 or newer (runs on Node 24), npm. Document import also uses `python3` and `pdftoppm`; page capture uses Chrome.
2. **Install:** `npm install`.
3. **Settings:** copy `.env.example` to `.env` and add `OPENAI_API_KEY`. Keep the key on the server only. Optional settings are listed in `.env.example`.
4. **Data:** `output/` (brand libraries, products, jobs, research) and `work/` (local database, logs, credentials) are not in Git. A fresh clone has no brand data; copy these folders from the existing machine.
5. **Start:** `npm start`. This starts a private local MongoDB (port 28571, data in `work/admin-private/database`) for logins, then the Studio on `http://127.0.0.1:1842`.
6. **Sign in:** open `http://127.0.0.1:1842/admin`. On a brand-new database, create the first administrator at `http://127.0.0.1:1842/admin#setup=<token>`, using the token in `work/admin-private/setup-token`.
7. **Studio:** `http://127.0.0.1:1842/creative-ai/studio`. The older technical workspace is still at `/creative-ai`.

On the main Mac the Studio runs as the launchd service `com.neha.creative-ai.server`. If it stops it restarts by itself, and it never resumes paid work automatically. To restart it after a code change, stop the running `server.js` process and the service starts it again. Logs are in `work/studio-availability-20261020/logs/`. Starting `npm start` by hand while the service is running fails because port 1842 is taken.

The Studio accepts only local connections from this machine. Do not expose it through a tunnel or reverse proxy (see **Before external client use**).

**How a job works:** brief → free readiness check and cost estimate → generate (paid). The saved brand and product research feeds one plan (`gpt-6.1-sol`). Two image models draw that plan as a model comparison (`gpt-image-2` and `gpt-image-2.6-sunburst`). A visual review (`gpt-6-luna`) follows, with at most one automatic correction. Main code: `lib/creative-ai/runtime/` (engine, workflow, storage), `lib/creative-ai/lean/` (planner, reviewer, corrector), `lib/admin/` (sign-in and admin console), `public/` (browser UI).

**Tests:** `npm test` runs the offline suite in about 10 minutes. It blocks network calls and writes to `output/`. Some older tests still fail because they read deleted saved jobs or expect the earlier one-option flow; see `docs/engine-fixes-20261108.md`.

**Code style:** many files are written as very long single lines. Don't reformat files you aren't changing, because it buries real changes in the history. Write new and changed code in normal multi-line style.

## Brand toggle and named training

The studio opens in Duroflex. The always-visible Duroflex / Sleepyhead toggle switches the selected workspace and clears transient context from the previous brand; each brand keeps its own saved brief drafts. Only these two brands are supported.

In Training & preferences, explicitly choose the brand name and save a reusable creative preference without needing a generated image. The server resolves the name to that brand’s own memory, records named-training provenance and the knowledge revision, and rejects unknown or conflicting names. Image feedback names its owning brand and rejects a different named brand. Named training uses the existing versioning, retrieval, deactivation and critical-check boundaries.

## Feedback and reusable preferences

Open a saved image's review page. Save a feedback note on that exact version; optionally save a separate reusable preference for the brand, exact product URL, placement, or product and placement together. A stale or altered image hash is rejected. Saved notes appear on that version's feedback form.

The server records the image's SHA-256, version, brand ID, official product URL, placement and format, concept route, knowledge revision (null for unpinned historical jobs), review URL/status, correction count, and timestamp. Attribution is an unauthenticated local operator, not a verified client identity. Feedback never rewrites artwork, clears quality flags, or requests another correction.

Each brand's Preferences tab shows scope, provenance and active status, with links to the exact saved image and review. Disable an unwanted preference there. Creation and deactivation append a versioned history; disabling affects future jobs. New jobs pin a server-built memory snapshot and revision. Idempotent retries, corrections and resumed jobs retain that snapshot. Historical jobs without a snapshot do not gain new memory retroactively.

Active relevant preferences reach creative strategy, concept development, copy, art, carousel planning and image generation in a fresh brand-scoped context. Fact extraction, brand-rule extraction and artwork scoring receive no preference memory. Preferences are advisory creative choices: they cannot establish facts, override supplied brand rules, relax critical checks or reset revision budgets. A liked example may be marked evaluated only when its saved image review passed; likes never constitute approved learning examples. Failed or draft artwork remains flagged. No automatic example imagery is retrieved into generation. “Training” means reusable memory and recorded evaluated feedback, not model weight fine-tuning.

Memory uses atomic local JSON replacement and serialized per-brand writes under `output/creative-ai/memory`. Each saved preference retains its originating feedback ID and artifact provenance. This is single-process persistence; it is not a multi-worker database. Back up all of `output/`, including source documents, jobs, dossiers, review/activity ledgers and memory. The directory is excluded from Git.

## Runtime persistence and recovery

New jobs store shared raster references by SHA-256 within each brand. Corrections patch the selected unit, reviews require every applicable evidence entry, and resumptions replay saved provider responses with deduplicated receipts. See [runtime hardening](docs/runtime-hardening.md) for storage, backup and ambiguous-request recovery details.

## Sources and verification

`workspace.json` configures the two brands. `clone-manifest.json` records independently copied sources, checksums and 65 historical project IDs. Historical review flags are preserved. Duroflex's research was refreshed against its own three documents on 7 October 2026; its visual world guide is still a supplied draft, with partial visual coverage retained explicitly. Sleepyhead keeps its own research and brand book. Missing public ad-library evidence stays unavailable.

`work/feedback-verification.log` contains the current test run. Tests cover exact-version feedback, brand/product/placement retrieval, memory version history, concurrency, deactivation, job snapshot pinning, client-input rejection, agent boundaries, real-artifact HTTP round trips, and inherited review/correction limits. Test feedback uses isolated temporary stores and does not populate client memory.

## Before external client use

This is a working local pilot. A hosted team release still requires authenticated identities, brand/team membership and authorization on every API/file route, verified actor attribution, HTTPS hosting, a managed server-side secret with rotation, persistent transactional storage suitable for multiple workers, private artifact storage, backups and restore checks, retention/export controls, and operational monitoring. Agree on feedback ownership and who can edit reusable preferences. Configure these before client access; no publication or external messages are part of this work.

## Cost tracking

Open `/creative-ai/costs` or **Cost tracker** in the studio sidebar. The page reads durable provider receipts every five seconds while open. Amounts are shown in INR, converted from USD list prices (rate card checked 2026-10-07) at a dated RBI reference rate; they are estimates, not vendor invoices. Copied research receipts are deduplicated by provider response ID / image idempotency key. Inherited history is kept separate from work after the dedicated clone was created. Older session dates are proxies where a receipt has no timestamp.

The form adds unique-reference billing, development, test, training, configuration, infrastructure and other costs to `output/cost-tracking/manual.json`. Those entries are additional expenses; API invoice reconciliation is not automated, so do not add an invoice that duplicates the recorded API estimates. Development/Codex subscription billing and external video/audio are not metered automatically. Unknown amounts remain unknown.

The native Google Sheet has managed Summary, Ledger, Rates and Coverage tabs. It used to be refreshed hourly by a Codex heartbeat; that stopped after 2 Nov 2026, so syncing is now a manual step until a new schedule is set up. The dashboard shows the last successful Sheet sync. Add costs through the app rather than editing these managed tabs. `scripts/costs/sheet-sync.js` creates the structured connector request; after a successful Google update and total readback, invoke it with `mark` to save the sync timestamp. It stores no Google credentials. The dashboard continues reading local usage if Sheet sync is unavailable.

## Brand asset library

Each brand’s **Asset library** tab organizes sources into brand books, visual guidelines, positioning, consumer research, sample creatives, logos, product assets, fonts and other references. Existing documents retain their original IDs and files; their folders are logical views. New non-document originals and raster previews are stored under that brand’s `assets/<folder>/` directory.

The upload form accepts up to 20 files sequentially and requires an explicit Duroflex/Sleepyhead destination. PDF, PPTX, DOCX and UTF-8 TXT/MD/CSV are indexed as document evidence. PNG/JPEG/WebP/self-contained SVG become actual visual references. Fonts (TTF/OTF/WOFF/WOFF2), design sources (AI/PSD/EPS/FIG/INDD), video (MP4/MOV/WebM) and audio (MP3/WAV/M4A) retain originals with a **Stored original** status; their contents are not automatically parsed, fonts are not installed, and video/audio are not transcribed. Samples are references, drafts stay marked, and neither establishes product efficacy claims.

Uploading documents or images changes the knowledge revision and requires **Refresh brand research** before the next brief. Saved jobs retain their pinned research and preferences. Document context is bounded to approximately 160,000 text characters and 64 visual references; each research call inspects a representative subset (up to eight images per research call); the library retains all original files and available previews. This is source-backed brand knowledge, not model weight fine-tuning.
