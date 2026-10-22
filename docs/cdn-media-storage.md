# CDN media storage

Enabled for the dedicated studio on 22 October 2026. Both brand workspaces use the same storage adapter and retain separate receipts and hash indexes.

## Upload and verification

The client supplied this multipart upload service:
`https://media-upload-service-519223215267.asia-south1.run.app/internal/media-upload-service/v1/upload-file`

The field is `userFile`. Current responses use `https://cdn2.hypergro.ai/`; the original example used `https://cdn2.gro.care/`. Only these HTTPS hosts are accepted. Each upload is downloaded and SHA-256 checked before its receipt is saved. The returned storage key must agree with the URL. Identical bytes are reused within a brand, never by borrowing another brand's receipt. In-process concurrent duplicate uploads are coalesced.

Non-secret defaults are tracked in `config/media-storage.json`. A local override at `output/media-storage/config.json` takes precedence. The configuration contains `enabled: true` and `uploadUrl`. No API key was supplied or required in the observed test. Do not put briefs, provider responses, billing receipts or arbitrary JSON in this public media service. CDN URLs are publicly readable; this does not provide team authentication.

## Storage behaviour

- New files written through the shared artifact adapter in `output/creative-ai/brands` and `jobs` upload after their final filename is committed. Supported types cover images, video, audio, PDF/Office source documents and fonts.
- `.cdn.json` sidecars contain the exact brand, hash, byte count, URL, provider storage key and verification time. Hash indexes live in `output/media-storage/<brandId>/`.
- Verified MP4, MOV and WebM files are removed locally. Reads reconstruct their bytes from the CDN and recheck the saved hash. Video processing uses a temporary source file, removed when processing finishes. Original API download routes redirect to the verified CDN so video range requests can be served there.
- Image and source-document files retain local working copies for native rendering, OCR, source extraction, physical proofs and reproducible exports. This is CDN-backed delivery, not a claim that all disk files were removed. Internal extracted raster blobs, JSON, briefs, revisions and cost records remain local.
- A failed upload preserves the local bytes and writes a `.cdn-pending.json` failure record. It does not claim CDN success, delete the source, retry creative generation or alter historical reviews/budgets. Run the transfer command again to retry. CDN deletion and provider invoice/rate reconciliation are not implemented.
- Existing metadata paths remain valid. New CDN receipts supplement the historical sources rather than replacing their hashes or approvals. CDN hosting does not approve artwork or improve its review status.

## Transfer existing media

Preview: `node scripts/creative-ai/cdn-media.js`

Upload with four workers: `node scripts/creative-ai/cdn-media.js --apply`

Videos only, remove only after verification: `node scripts/creative-ai/cdn-media.js --apply --videos --evict-videos`

Saved sidecars and brand-scoped indexes make repeated transfers reuse prior uploads. Each run writes a migration report in `output/media-storage/`. Failed files remain local. Temporary staging files, symlinks and JSON are excluded. A process lost after a provider accepted an upload but before its receipt was saved can leave an orphan; the service exposes no idempotency/deletion API.

CDN upload/storage/egress pricing has not been supplied. Do not report those costs as zero. The Creative AI provider cost ledger continues to describe its own recorded usage.

## Verification

`node --require ./tests/creative-ai/offline-bootstrap.cjs --test tests/creative-ai/cdn-media.test.js`

Tests cover exact-byte verification, host validation, hash reuse, brand isolation, remote video reads, failed-upload retention, metadata exclusion and original API redirects. Relevant product library, asset library, editing/export and runtime regressions also run with isolated fixtures. No artwork is generated to test CDN storage.

## Observed initial transfer

On 22 October 2026, 4,029 media file bindings were verified: 2,847 Duroflex and 1,182 Sleepyhead. This includes 9 videos (33,819,663 bytes) now stored remotely, with their local copies removed. Image/document/font working files remain available locally.

One 407,240,392-byte original PowerPoint was rejected by the upload service with HTTP 413 after the larger-file retry. Its local original, indexed text and already uploaded visual previews remain intact. It stays explicitly pending; a higher service upload limit or a separate large-object upload endpoint is needed. No smaller-file size ceiling is inferred from that rejection.

A real CDN video request returned HTTP 206 for a byte range. CDN fonts and image-to-canvas access are checked separately for both brands. CDN billing is recorded as an unknown Infrastructure entry, pending a provider rate/invoice, rather than as zero spend.

## Guideline book reader

Brand Library resource cards for documents with rendered pages now open `#library/book/<documentId>?page=<n>`. The reader uses existing CDN-backed page JPGs, a page selector and lazy thumbnail strip. It preserves source/draft status and the original download separately. A direct book link loads only brand metadata and page images; project history is deferred until leaving the book. Foreign-brand documents are not resolved, and switching brands returns to that brand’s library. The 151-page Duroflex visual guide was checked with a first-page load of 380 ms in the observed local browser test; this is a measurement, not a guaranteed remote-network time.


## Git manifest and migration

`config/cdn-media-manifest.json` is the tracked media inventory: verified CDN URLs, provider storage keys, exact SHA-256/size, brand ownership and relative original paths. Repeated paths sharing the same brand/hash use one manifest object. It contains media pointers, not artwork binaries, provider responses, credentials, reviews, project briefs or cost records. The oversized unuploaded PowerPoint is explicitly listed under `unavailable`; its rendered page images are included as verified objects.

After new uploads, refresh and commit the inventory before a Git backup or migration:

```sh
npm run media:manifest
git add config/cdn-media-manifest.json
```

From a new checkout, preview the restore, then download the content into its original paths:

```sh
npm run media:restore
npm run media:restore -- --apply --destination .
```

To restore elsewhere, use an explicit directory with `--destination /path/to/new-workspace`. `--brand <brandId>` limits the transfer to one brand. `--max-objects 1` is available for connection checks. Every download is streamed to a temporary file and checked against its saved SHA-256 and exact size before it is copied into place. Already matching files are skipped; differing files and symlink paths are refused rather than overwritten. Restored CDN receipts and brand/hash indexes preserve the same media bindings. The process does not generate artwork or re-upload existing content.

This restores **media content**. A complete Studio migration also needs its private brand/product/project metadata, revision/review records, internal raster references, cost history and environment secrets from a separate private backup. Those are deliberately not committed to Git or this public CDN. CDN hosting must remain available for URL-based restoration; links alone are not an independent binary backup.
