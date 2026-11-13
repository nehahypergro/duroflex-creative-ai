# Brand data snapshot for the hosted Studio (13 Nov 2026)

The hosted Studio had empty Duroflex and Sleepyhead workspaces, because `output/` is not in Git. On 13 Nov 2026 Neha asked to put the needed brand data in this repository so the team can deploy it. She chose to keep it in this public repository after being told that it makes the files public.

## What is in Git

Added with `git add -f` (the `.gitignore` rule for `output/` stays, so new generated files are not picked up by accident):

| Path | What it holds |
|---|---|
| `output/creative-ai/brands/` | Brand settings, product records and website snapshots, approved logos and fonts (as CDN records), brand documents, datasets, headline history, product fingerprints |
| `output/creative-ai/research-sessions/` | Each brand's research |
| `output/media-storage/` | CDN settings and upload indexes |

That is 10,359 files, about 216 MB.

## What is not in Git

- **Pictures, fonts and documents that are already on the CDN.** Each has a `.cdn.json` record next to where it belongs. Download them with:

  ```bash
  npm run media:restore -- --apply --destination .
  ```

  Each download is checked against its saved hash.
- **One Duroflex brand document** (`brands/brand-1923d633-…/sources/doc-de7dd121-8244-4f7e-9efe-ab12b9fbc4a8.pptx`, 388 MB). GitHub refuses files over 100 MB, and it has no CDN copy. Ask Neha for it if the brand library needs the original.
- **`output/cost-tracking/`**: cost records stay private (project rule).
- **Past projects (`output/creative-ai/jobs/`), reference images and old brand dossiers**: history only, about 53 GB.
- **`.env` and secrets**: never in Git. See the handover note for the settings list.

## Checks before committing

A scan of every text file found no API keys, passwords or private keys. The matches it raised were base64 text inside saved model responses and a public token in the Sleepyhead website's own page HTML. Customer-service email addresses from the brands' public websites remain in the website snapshots.

This is a snapshot: brand data changed on Neha's computer later is not updated here automatically.
