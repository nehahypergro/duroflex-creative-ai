# Duroflex Web & commerce raw-artwork experiment — 5 November 2026

## Scope

The user requested all Web & commerce asset types in the isolated original-image flow. This run adapts the existing Duroflex Octave Honey 3-seater campaign, preserving the exact variant and official SKU photographs. Saved research and campaign direction are reused; no new strategy or concept model requests are made.

The eight catalogue entries produce 18 new originals: website banner (1), product gallery (5), marketplace A+ images (3), A+ feature (1), lifestyle header (1), Brand Story desktop/mobile backgrounds and two cards (4), Premium A+ desktop/mobile full-width images (2), and homepage category tile (1).

The banner has its saved copy embedded by image generation. Amazon modules, gallery and category tile use image-only instructions with native publisher text kept separate. These are the selected complete module sets for this experiment, not every possible Amazon module permutation.

The experiment skips automated review, OCR, editable reconstruction, background removal, repair and resizing. A completed request means an original image was saved; it does not imply quality approval, editability or publisher acceptance. Target dimensions and actual original dimensions are displayed separately. Main Studio behavior is unchanged.

## Execution and recovery

Collection: `raw-web-3c1a9c4ed8ff6e25e5b7699e`.

The initial runner incorrectly configured image capacity as five, conflicting with the deployment's established shared limit of two. All 18 initial attempts failed at capacity admission, before any provider reservation or image call. Their errors remain in the collection history.

The fix uses the deployment provider unchanged. Five rolling job slots share two image-call slots. Completion immediately admits another job; an individual failure does not stop other items.

The resume action accepts only this precise capacity error with zero reasoning/image calls, zero reservations or receipts, no request/wait records or saved results, and no earlier recovery. It reuses the original request and job, preserves the previous error in a recovery record, and permits one attempt. Paid or ambiguous interrupted requests cannot use this shortcut. Duplicate submission uses a stable batch key, and repeated resume is guarded by the batch lock and active-task map.

## Verification

13 focused offline tests pass, covering byte preservation, both-brand raw-run isolation, main-engine rejection of experiment jobs, image endpoint restrictions, all 18 slot profiles, text-policy separation, rolling concurrency, independent failures, worker interruption, and zero-dispatch recovery restrictions. Inline collection JavaScript parses.

The live gallery is verified in the Codex in-app browser. A banner downloaded through its gallery link matches the saved original SHA-256 exactly. The browser automation download-event wait timed out; direct download through the same visible link succeeded. This did not affect generation. Live results, hashes, dimensions, times, model usage, estimated costs and error/recovery history are recorded in `work/raw-web-commerce-20261105/verification.json`. `measure.cjs` regenerates that report without sending paid requests. Final billing is unknown; costs use the application's saved usage rates and approved FX.

## Completed live result

All 18 images across eight catalogue types finished. Exactly 18 gpt-image-2 image calls and zero reasoning calls were recorded. Generation including queue time took 810.467 seconds; total batch wall time including the initial capacity failure and recovery was 1130.651 seconds. Estimated image usage: INR 202.03, at saved application rates and FX; actual invoice unknown. All 18 saved hashes were verified, and no OCR/review/reconstruction/repair artifacts were created. No paid retries occurred.

A ZIP with the 18 unchanged images and a size/hash manifest is saved at `work/raw-web-commerce-20261105/duroflex-octave-web-commerce-originals.zip`.
