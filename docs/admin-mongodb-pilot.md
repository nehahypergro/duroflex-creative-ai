# MongoDB admin pilot — 28 October 2026

**Current status:** this pilot has now been merged and activated locally. See
[the activation record](admin-activation-20261028.md) for the current URL,
verification, account setup and deployment limits. The sections below retain
the original staging history; statements about not being activated describe
that earlier stage. The previously noted Sharp advisory is now patched.

The user selected MongoDB Atlas, with Atlas configuration deferred. This implementation is staged in `duroflex-admin-pilot-20261028`; the running Studio and generation batch have not been restarted or modified.

## What is implemented

- Individual administrator and team-member accounts, salted scrypt passwords, first-login password changes, account enable/disable/reset and administrator-controlled role reassignment, atomic last-administrator protection, hashed session tokens, explicit session expiry, atomic login throttling and account audit events.
- MongoDB collections: users, sessions, login_attempts, audit, account_control, requests. Username uniqueness and request filter indexes are enforced. Session/attempt TTL indexes clean up expired records, but expiry is also checked on every request because TTL cleanup is asynchronous.
- Filterable request list for both brands, saved briefs and references, saved image previews and supported file downloads, activity timeline, plain-language failure summaries and separate technical details.
- Estimated INR versus recorded actual INR, dated FX basis, source currency, unknown-charge counts and project/user/brand attribution. Historical jobs remain Legacy / system. Cost snapshot time is visible; refreshing requests does not refresh the production cost sheet.
- Staged Studio authentication middleware protects metadata and direct files, filters job lists and records the authenticated submitter plus the original form brief on new jobs. Browser local/session storage and IndexedDB caches are separated by user. Account changes in another tab reject stale-tab requests.
- Background scheduling clears the HTTP account context. Already admitted jobs do not depend on an active browser session. Disabling an account removes new browser access; it does not cancel running work.

The standalone preview is read-only for jobs and has no CreativeRuntime instance or provider integration. Account administration writes only to its own MongoDB database. The Studio middleware is implemented and fixture-tested, but **not activated on the running Studio**.

## Local preview and tests

Dependencies in `work/admin-deps` are isolated from the live project's dependencies. The local root node_modules link is read-only shared dependency resolution; do not run npm install through that link. A fresh checkout must use its own node_modules.

```
NODE_PATH="$PWD/work/admin-deps/node_modules" MONGOMS_DOWNLOAD_DIR="$PWD/work/mongodb-binaries" ADMIN_SOURCE_ROOT="/Users/neha/Documents/Codex/Neha-Projects/duroflex-creative-ai" node scripts/admin/preview.js
```

Open `http://127.0.0.1:1857/admin#setup=<private setup token>` for first-time setup. The token is saved in `work/admin-private/setup-token` (0600). The page removes it from the address bar; it is not sent as a query parameter. The first administrator chooses their own credentials. Later setup attempts are refused. Do not commit work/admin-private or database files.

```
NODE_PATH="$PWD/work/admin-deps/node_modules" MONGOMS_DOWNLOAD_DIR="$PWD/work/mongodb-binaries" node --require ./tests/creative-ai/offline-bootstrap.cjs --test tests/admin/*.test.js tests/group-workspace.test.js
```

25 checks passed against actual local MongoDB replica sets and headless Chrome. No paid provider calls were made. Fixtures cover both brands, account lifecycle, authorization, ownership, unknown costs, source-history preservation, worker isolation and browser flow. The queue-isolation regression originally failed with “Request not found”; clearing the HTTP account context at schedule/pump/execute makes the same check pass.

## Atlas activation later

1. Create a dedicated Atlas database and application database user, restrict network access to the deployed server, enable backups and use TLS. Store the URI only in a private environment configuration or secret manager, never browser code or Git.
2. Set `ADMIN_MONGODB_URI` and `ADMIN_MONGODB_DATABASE`. Run `node admin-server.js` for the monitoring-only console. `ADMIN_SOURCE_ROOT` selects the existing read-only Studio data source.
3. For integrated Studio, use `ADMIN_ENABLE_STUDIO=1` only on the intended deployment after the active batch finishes and deployment verification passes. This starts with automatic job resumption disabled. It must not be started as a second worker over the production directory while the old worker runs.
4. Configure HTTPS and the public allowed origin before team access. Current launchers deliberately bind only to localhost. The auth handler supports Secure cookies, but public hosting/proxy configuration is not complete or deployed.
5. Configure shared object storage and the production worker backend separately. MongoDB admin storage does not migrate the existing file-based generation jobs or the previous distributed-worker backend. This is not a complete multi-machine execution migration.

## Limits still explicit

- No production Atlas URI is configured and no production account has been provisioned.
- Timeline detail reads the existing verified activity journal on demand; list polling reads only changed job metadata. Missing/unreadable source records retain the indexed history and show a warning.
- Old downloads are shown as saved artifacts; this console does not rebuild deliverables or certify the latest selected editor revision. Non-file delivery routes still need Studio. It never upgrades historical review flags.
- Historical user attribution is unknown. Jobs created before activation stay Legacy / system, including jobs created directly by scripts outside an authenticated session.
- The dependency audit found a pre-existing high-severity advisory in sharp 0.34.x (patched in 0.35.5). The admin-only monitor does not decode uploaded images; the Studio dependency upgrade and image-decoder regression checks are required before client exposure. No production dependency was upgraded during this batch.

Role editing was verified on 28 October 2026: administrators can change an existing account between Administrator and Team member from People. Changes are audited and revoke sessions; the final active administrator cannot be demoted or disabled. The regression first failed because changes were unsupported, then passed after implementation.

## Client experience hardening — 28 October 2026

Implemented in this isolated pilot, not deployed over the live Studio or its workers.

- Waiting shows the recorded stage, last update and saved-image count. Connection loss asks the user to check status before starting another attempt. Inspecting recovery does not dispatch work; a new paid attempt requires its explicit labelled action, retains the original and uses the existing server token/deduplication contract.
- Partial, edited, unverified and incomplete sets cannot appear green merely because image creation finished. Unknown charges remain separate. No budgets, provider settings, job execution, historical quality verdicts or charge records were changed by this pass.
- Technical exceptions and storage errors are translated at the presentation boundary. Useful stale-tab, missing-input and size guidance stays visible. Original errors remain in the protected operational evidence.
- Brand and product context are shown on project, brief, review, progress, download and editor routes. Existing account/brand-scoped draft storage and failed-save guards remain; brand switching also waits for an in-flight submission and honours the editor's save/recovery decision.
- A default set uses the selected saved versions, current editor revisions and declared order. The client and server check completeness and selection again before delivery. A changed preview requires refreshing, rather than quietly downloading a different image. Exact image bytes are retained when the format is unchanged; explicit PNG/JPEG/WebP choices encode the requested format without resizing. JPEG uses a white transparency background. Format conversion is not a new visual approval.
- Image files use brand, product, placement name, dimensions, option and edit revision. Client ZIPs contain ordered images and a short readable review note, rather than internal evidence filenames. Immutable technical package reports still remain on the server. Legacy advanced packages retain their existing evidence format.
- Report an issue is available on saved projects and image views in authenticated Studio. It attaches server-verified brand/product, request/stage and exact selected image/version/revision/hash. The note stays in account-scoped browser storage when available. Retrying an uncertain submission uses the same report identity; it cannot create a second ticket or start generation. A new selected image requires reopening the report. Unsaved editor changes must be saved before attaching the image.
- Reported issues is a separate administrator section, with brand/status filters, requester, details, evidence and status history. Resolution requires a note. Concurrent administrator edits cannot overwrite each other silently. Ordinary members cannot list/update others' reports. Reporting does not change artwork approval, generation state, brand training or spending.
- The report dialog is checked at 1366×768 and 1280×720, document zoom 125% and 150%, and 390px phone width. Existing browser regressions also cover menus, editor panels, scrolling, dialogs, draft storage failures and ten varied navigation cycles per brand. These checks use local Chrome fixtures; real client browser/device acceptance remains a deployment check.

The new reporter is deliberately tied to a saved generation request. Brief-only drafts with no request yet do not produce an automatic project/image attachment. The admin-only preview can manage reports; the client reporter requires the staged integrated Studio activation.

Reproduced regressions: ambiguous connection copy suggested retrying; partial/edited artwork appeared green; a finished job with missing slots could appear checked; a download could silently use an edit newer than the displayed preview. Dedicated unit and browser tests now cover these boundaries. Browser checks also caught and corrected a masked stale-draft message and a hidden-filter styling problem. Test evidence is under `work/admin-evidence/hardening-*` and `download-preview-{before,after}.txt`.

Production activation still requires the planned safe deployment after batch coordination, account setup, Atlas/HTTPS configuration and the separately recorded dependency update. This work does not establish new live artwork quality or reconcile historical unknown charges. The authenticated image-download name now reads metadata from saved images through the existing decoder; the pre-existing decoder advisory must therefore also be addressed before exposing this pilot to clients.

Missing-image reporting also has a project-and-slot fallback for both brands. It explicitly records that the image file could not be attached, without inventing a hash or approval. Foreign slots and stale selected versions still fail safely. Reporting a missing image does not require repairing or regenerating it first. The failed-before check is preserved in `work/admin-evidence/missing-image-report-before.txt`.

Visual evidence was checked in the installed Chromium headless shell after the installed Chrome produced tiled screenshots. The underlying interaction checks also run in Chrome. Clean inspected captures are `work/admin-evidence/client-report-duroflex-verified.png`, `client-report-sleepyhead-verified.png` and `reported-issues-verified.png`. These use synthetic fixtures, not newly generated client artwork.

Run `npm run test:client-readiness` from this isolated pilot to repeat the combined admin, delivery, language, progress and Studio browser checks. The runner writes per-suite results and a verification JSON, blocks paid providers, and compares live source fingerprints before and after. It does not start a live generation worker.

Final export regression exposed stale per-project caching after workspace invalidation: Refresh preview could repaint the earlier revision. `StudioData.invalidateWorkspace` now also removes that brand’s per-project cache entries. The failing-before browser evidence is `work/admin-evidence/amazon-export-diagnostic.txt`; corrected WebP export and three related set/download cases pass in `download-final-regressions.txt`. The Amazon fixture now explicitly checks rejection of wrong-size edited artwork before downloading a corrected current-size revision; it no longer expects a 720×360 edit to satisfy a 1080×1080 placement.

Final validation: 80 core checks passed. The broad browser run passed 88 of 89 cases; its remaining Amazon export case exposed the cache problem described above. After fixing it, all 15 affected browser regressions passed, including that case, both brands’ downloads, stale-response handling, and ten varied navigation cycles per brand. The separate Chromium report/console visual checks also passed. Original failed logs remain unchanged. See `work/admin-evidence/client-readiness-final-verification.json` for the combined evidence and unchanged live-source fingerprints. Live Studio PID 74611 was preserved; only the standalone admin preview on port 1857 was refreshed.
