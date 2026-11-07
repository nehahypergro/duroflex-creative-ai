# Frontend resilience audit — 4 November 2026

## Results

| Finding | Assessment and change |
| --- | --- |
| F1 — half-written custom formats | Confirmed in the legacy brief. Restore now retains raw custom JSON and the other brief fields, shows an inline validation message, and opens the brief rather than throwing. Import remains conditional on valid JSON. |
| F2 — stalled status polling | Confirmed in legacy job/research and editor chat polling. Read failures schedule another read, guarded by navigation/session identity. Chat retries even if the first status GET after generation fails before a running row was received. Disposing the editor stops the loop. Paid submissions are not retried by these pollers. |
| F3 — duplicate cost refresh loops | Confirmed. One in-flight request and one timer own the legacy cost refresh cycle. Navigation prevents stale updates; errors retain a bounded retry delay. |
| F4 — duplicate font loads | Confirmed. Pending/loaded fonts are reused by brand-scoped family, URL, weight, style and hash. Failed loads are evicted and can retry. Canvas reloads await their required fonts, not the entire page font set. Distinct fonts remain cached for the page lifetime. |
| F5 — focus request fanout | Confirmed. The jobs index supplies a freshness marker combining job update time with artifact-directory modification time. Unchanged, successfully loaded projects reuse their details and edits. Changed projects and failed detail lookups still reload. Atomic artifact saves invalidate the marker even when job.json is unchanged. A folder disappearing during index construction is omitted without breaking the other rows. |
| F6 — JSON parser errors | Confirmed. Shared Studio, legacy API and chat helpers translate non-JSON responses into readable messages while retaining HTTP status. 413 identifies an oversized upload. JSON error codes/references remain available; structured export-review warning responses retain their existing acknowledgment flow. |
| F7 — inaccessible/overwritten backups | Confirmed for the Load latest backup; guarded the failed-restore case too. Existing before-load backups appear with download/discard actions. Another Load latest cannot overwrite that backup. Failed primary recovery drafts remain protected from autosave and successful remote-save cleanup. Tests verify byte-for-byte preservation and download. |
| F8 — local attachment retention | Partly confirmed. There is no permanent draft-delete operation in the current draft store; Trash preserves drafts and their attachments intentionally. Removing/replacing a local brief PDF previously leaked its blob. Cleanup now occurs after successful metadata save and only when no saved/current same-brand draft owns the key. Duplicate briefs and trashed drafts remain owners. Reference removal uses the same ownership check. No historical orphan sweep or real user-file deletion was performed. |
| F9 — brief PDF URL lifetime | Confirmed one-second revocation; a Safari/Firefox failure was not reproduced. Brief PDFs now use the common download helper with an attached link and 30-second revocation. A real Chromium download verifies intact bytes for both brands. This is hardening, not proof of all browser-specific behavior. |

## Verification

30 focused tests pass: 17 frontend/cache/index tests, 12 existing upload/progress/editor/browser tests, and one new both-brand attachment browser test. Browser suites cover both Duroflex and Sleepyhead. They use isolated fixtures and no paid image generation. Syntax and Git whitespace checks pass.

Before-fix evidence records failures for F1–F6 in the new focused test suite. The additional regressions cover chat's initial failed poll, structured 422 warnings, artifact freshness, deleted-folder races, backup downloads and failed restore preservation, and shared PDF ownership/removal.

Evidence: `work/frontend-resilience-20261104/` (`before.log`, `unit-after.log`, `browser-after.log`, `local-files-after.log`). Early attachment-test attempts failed because the test double omitted the document-status helper; the completed fixture passes without relaxing product assertions.

The Codex in-app browser was opened for a live check but redirected to the sign-in page. Authenticated live UI verification was therefore unavailable in that browser session. No credentials were changed or bypassed.

The local backend was gracefully restarted while no jobs were active, to load the freshness endpoint. Activation records contain the old/new process identities, HTTP checks and saved project metadata hashes. Existing artwork, drafts, billing records and generation outcomes were preserved. Refresh an already-open Studio tab to load the frontend changes.
