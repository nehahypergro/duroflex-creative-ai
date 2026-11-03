# Composed source SKU references

The user's “implement 2,3,2” was interpreted as the two distinct proposed changes: supply detailed product reference views, and distinguish catalogue titles from words physically printed on the product. Single-product isolation and a new paid image run were not included.

The saved Quboid push job `creative-d7faa0de-e951-4912-b5e1-51945d2e7147` scored 68 for product fidelity after generating an orange stripe and an Arctic Ice label in place of the reference's red stripes and ENERGISE QUBOID marking. The saved Spine Contour sales job `creative-dc355e80-9f41-42f0-a7da-6f09f6769578` scored 58 after generating a joined twin-lobed pillow. The original pillow photo contains multiple pillows; improved detail views do not isolate one instance. These defects originated in the composed source, before editable text reconstruction.

New composed jobs pin `skuReferenceDetailVersion: 1` at admission. Their initial image request includes the original photographic references plus up to two enlarged source-quadrant panels. The pinned exact-SKU source has first priority for detail selection. Each panel carries its source ID and SHA-256; the existing brand-scoped provider recomputes it from collected same-brand research before accepting it. Campaign logo references remain excluded, and the typography guide remains last. No new model call, OCR transcription or generated reference image is introduced.

The prompt identifies these as inspection views, not additional products. Actual source pixels govern silhouette, proportions, fabric, stripes and physical markings. Catalogue titles, feature names, campaign copy and claims must not replace printed product wording. External reference captions are distinguished from markings. Enlargement cannot recover absent detail or guarantee label legibility.

Historical jobs without the pin retain their original prompt and attachment ordering. The normal flattened generator retains its prior selection behavior. Masked removal, saved-copy authority, Fabric text reconstruction and reviewer thresholds are unchanged.

Verification evidence is in `work/sku-reference-fix-20261103/`:

- `before.log`: both brand fixtures failed because composed requests contained zero detail views.
- `focused.log`: 41 focused checks pass, including new-job admission, actual initial dispatch capture, source provenance, foreign-brand rejection, guide ordering and historical/non-product compatibility.
- `both-brands.log`: saved Duroflex and Sleepyhead handoff replay, zero failed stages.
- `saved-cases.json`: both failed jobs' source packages pass offline detail/provenance checks against their collected research; exact prior image hashes and SKU verdicts retained.
- `full-offline.log`: sandbox run could not launch local browser/HTTP tests. `full-offline-local.log` reran with local browser/HTTP access and unmocked external requests still blocked: 1,919 tests, 1,903 passed, 13 failed, 3 cancelled. All reported failing/cancelled test names also occur in the previous `work/sales-push-e2e-20261102/full-offline.log`; gallery wording, editor interactions/recovery and collection navigation remain unresolved. This is not an all-green suite. See `verification-summary.json` for the comparison.

The idle local Studio service was reloaded after confirming no queued/running/preparing jobs. Its `/admin` endpoint returned HTTP 200.

No new paid generation was performed. New visual quality has not been verified, and neither historical failed asset is promoted to ready by this change.
