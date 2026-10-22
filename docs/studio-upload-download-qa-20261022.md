# Static Studio upload and download QA — 22 October 2026

Applies to the shared Duroflex and Sleepyhead interface. No generation policy, historical artwork, review verdict or provider pricing was changed. No paid AI calls were made.

## Delivered

| Area | Behaviour | Verification |
|---|---|---|
| Individual creative download | Project rereads the exact creative's saved edit; latest revision is the default. Original remains explicit. A failed edit lookup cannot silently fall back to Original. | Both-brand browser tests assert revision 3 bytes after the project initially displayed revision 2, explicit Original bytes, and lookup failure. |
| Filename | Both entry points use the shared `Brand_Project_WidthxHeight_Option_Revision.ext` formatter. Original is labelled `Original`; Unicode is retained with bounded, filesystem-safe segments. | Shared formatter test and real browser download events. |
| Repeated clicks | Editor Download and format controls are disabled during preparation, with a handler guard. Project individual downloads also have a guard. | Two dispatched clicks produce one export request. Failed and cancelled exports release the guard. |
| Warnings | Inline list of specific concerns with Fix issues / Download for review. Project Fix issues opens the exact creative's editor; editor Fix issues opens Checks. Consent is tied to a saved revision. | Client warnings, server-only warnings, revision-change acknowledgement checks. |
| Reference limits | Before selection: 10 files per selection, 20 MB/file; PNG/JPEG/WebP up to 24 MP; PDF/PPTX up to 100 pages/slides. All selected filenames remain visible, including excess files. | 12-file selection: all 12 rows visible; excess files explicitly marked not added. |
| Readability | New local, brand-checked endpoint decodes images, parses PDFs, and checks PPTX archive integrity, XML and referenced slides. Validation is bounded in a worker; no model call. | Valid and corrupt images, extension spoofing, empty/large files, valid/corrupt/over-limit PDF, PPTX missing slides/invalid XML/truncated archive. |
| Upload recovery | Durable per-file status, reason, Retry and Remove. Successful references remain intact. Editor upload results persist separately from canvas revisions; files may need reselection after reopening if the browser no longer holds their contents. | Partial failure → retry → refresh for both brands. |
| Locked replacement | Eligibility checked before the file picker/upload, then checked again before upload and attachment. | Forced replacement of a locked photograph sends zero upload requests; a clear Unlock message remains visible. |

## Evidence

- Before-fix failures: `work/uploads-downloads-20261022/locked-upload-before.txt` and `reference-intake-before.txt`.
- Final full offline suite: **835 tests, 830 passed, 5 failed**, in `full-tests-final.txt`.
- Focused editor/recovery suite: **39 passed**, in `focused-tests.txt`.
- 60-case Static journey matrix: passes; one timeout in the initial broad run did not recur in the isolated matrix or final full run. Initial full run also contained a test expecting the intentionally replaced warning button; that test now checks the requested Fix issues action.
- Saved-run replays: both brands, **0 failed stages, 0 paid calls**, in `both-brands-replay.txt`. Recorded responses do not establish new artwork quality.
- Live 1842 checks: both brands, valid/invalid reference intake and refresh recovery, no browser script errors; `live-smoke.json` and brand screenshots.
- The idle supervised server was restarted after checking both generation and research queues. Health returned OK after restart. Brand assets and production jobs were not modified by the live test; its draft lived in an isolated browser profile.

## Existing boundaries

- The five existing failures are in `tests/creative-ai/readability-fixes.test.js`: pinned display assumptions, tiny-format copy, folded/non-Latin counting, display-size verdicts and print-preview geometry. These predate this change and concern the old/new readability policy mismatch. They remain open; this is not a claim that the whole engine is regression-clean.
- Bulk carousel/image-set ZIPs remain explicitly labelled archives of original generated artwork. Individual creative downloads use the latest saved edit. Historical ZIPs and their reviews are not rewritten.
- A readable device reference is not automatically processed brand guidance. The UI explicitly says to add and process it in Brand Library for use in generation. Intake validation establishes parse/decode readability, not semantic accuracy, font completeness or full visual fidelity of every presentation asset.
- Successful local recovery depends on browser storage. Existing save-failure feedback remains visible when storage cannot be written.
