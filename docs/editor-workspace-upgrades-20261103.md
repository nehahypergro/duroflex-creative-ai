> Activation update — 3 November 2026: authenticated Studio now enables editor chat by default and advertises it in editor resources. Refresh the page and reopen a design; no `?editorChat=1` parameter is needed. Pins, boxes and background AI controls follow the same capability. `CREATIVE_AI_EDITOR_CHAT=0` can explicitly disable it. Shared guest links still have no AI access. Earlier opt-in instructions below describe the original rollout. Paid requests still require consent.

# Editor workspace additions — 3 November 2026

These changes extend the existing editor. No live process was restarted, no existing job was reset, and all provider tests use mocks and temporary Duroflex/Sleepyhead workspaces.

## Background expansion

With server `CREATIVE_AI_EDITOR_CHAT=1` and client `?editorChat=1`, select the background and choose **Expand background**. Select 90%, 75% or 50% source framing, an anchor, and optional instructions. Continue creates an unpaid proposal; generation still requires explicit paid consent. Existing INR allowances, provider receipts, single-dispatch identifiers, stale-source checks and Apply/Discard handling remain in use.

This is outpainting within the existing design dimensions: the photo is reduced and positioned inside that canvas, and the image model fills the surrounding mask. It does not resize the document or move its editable text/logos. Source pixels within the preserved, scaled photograph are restored after generation. Genuine source markings remain part of the photograph. New scene quality, edge continuity and product duplication must be reviewed. Mock tests prove mask preservation and workflow behaviour; live model quality remains unverified.

## Rulers, guides and grids

Open **Layers → Arrange → Rulers, guides & grid**. Pixel rulers follow zoom/scroll. Drag from the top ruler to create a vertical guide, or the left ruler for a horizontal guide. Drag an existing guide outside the artwork to remove it. Numeric position entry and removal controls are also available.

Grid columns/rows, gutters, margins, visibility and snapping are configurable. Guides snap through the existing Snap toggle; Alt bypasses snapping. Grid visibility and grid snapping are independent. Settings live in the validated `editorView` document field and participate in autosave, versions and Undo/Redo. All overlays live outside the artwork renderer and do not appear in PNG/JPEG/SVG downloads.

## Searchable graphics

Elements contains a local catalogue of **2,015 Lucide 1.66.0 vector icons**, searched by name/tags, with common marketer aliases and category filters. Results are paginated in the panel. Inserted graphics support the existing fill, gradient, opacity, border, dimensions, rotation, grouping and layer controls. Icon IDs are checked against the same bundled catalogue by the server. Arbitrary SVG paths and remote library URLs are not accepted.

This is a broad outline-icon collection, not a stock-photo or full-colour illustration marketplace. The existing six authored feature icons and brand-scoped badge recipes remain. Generic icons do not substantiate a product claim or become approved brand marks.

Lucide is ISC/MIT licensed; the complete licence is in `public/creative-ai/vendor/LUCIDE-LICENSE.txt`. SVG exports containing these icons embed its notice. `scripts/creative-ai/build-editor-icons.py <local-archive>` rebuilds the catalogue from the pinned public npm `lucide-static-1.66.0.tgz` archive without installing dependencies.

## Layout suggestions

Open **Layers → Arrange → Compose layout → Suggest layouts**. Select elements/groups, or deselect to propose arrangements for eligible visible/unlocked foreground objects. Up to three alternatives use measured bounding boxes, semantic roles, safe margins and protected/fixed regions. Candidates are ranked using sampled photographic contrast/layout warnings and movement distance. A thumbnail and concerns are presented before Apply. Stale proposals cannot overwrite newer local changes.

Text, font size, wording, brand logo proportions and object scale are unchanged. Groups move as units; locked objects and the photograph remain fixed. If no layout fits, the UI explains why instead of shrinking text. This is a local role-aware suggestion engine, not a vision model, product segmentation system or guarantee of aesthetic quality. Existing geometric Tidy up remains separately available. Users must review scene clearance and readability.

## Share links and comments

Open **Versions → Share this design** to create a view, comment or edit link lasting 1–90 days (default 14). Links are bearer capabilities: anyone holding a link receives its chosen permission. Only the owning authenticated account/admin can manage links in the authenticated Studio. Tokens use 256 bits of randomness and only their SHA-256 digests are saved. Links can be revoked individually. Creation is limited to 50 unexpired/unrevoked links per design.

- **View:** rendered artwork and comments; no editable document/assets or writing.
- **Comment:** view plus posting bounded comments.
- **Edit:** the existing editor's local design tools, revision-checked saving, comments and exports. No access to other jobs, sharing management, campaign downloads, uploads or paid AI operations through the shared endpoint.

Comments are shared across links to the same design/source and visible to the owner under **Versions → Share this design → Comments on this design**, with a Refresh action. They retain the exact revision, document hash and timestamp. Visitor names are explicitly unverified. Shared edits retain link/revision provenance; standard conflicts prevent stale overwrites. These comments are not training preferences, creative approvals or image Like/Dislike records.

Permission, expiry and revocation checks run on every scoped request, including assets, preview, source, save and comments. Writes and revocation serialize under a link record lock. Shared pages use a fixed public-script allowlist, no-referrer policy and CSP. View/comment links cannot retrieve editable source or fonts. Active source changes invalidate prior links rather than silently redirecting them to another creative. No messaging/email is sent.

The existing server is local-only. Links work where that server is reachable; these changes do not deploy an internet service or relax network binding/host restrictions. Guest links do not provide verified user identities, invitations, concurrent cursors or real-time collaborative merging. Shared editor upload/brand/AI/campaign controls are intentionally unavailable; unsupported recovery-copy actions remain rejected by the server.

## SVG download

Download → **SVG · editable** uses the shared Fabric renderer, keeping text, shapes, icon paths, gradients and transforms as SVG objects. Photographs and raster logos stay embedded raster images; they are not traced. Registered font data is embedded through SVG font-face definitions. Raster asset URLs are resolved from the exact saved design and hash-checked before embedding. Export uses the same saved-revision and warning acknowledgement rules as PNG/JPEG.

SVG is not native Illustrator `.ai`, an outlined-font export, CMYK/PDF-X output or a promise of perfect round-trip fidelity. Some receiving applications ignore embedded web fonts or interpret text effects differently; test the intended receiving application. No automatic font change or raster-to-vector claim is made.

## Activation and validation

Expanded controls and SVG download are gated by `resources.tools.version === 1`, protecting editors connected to an older server. They need a safe restart/reload after active main-thread runs finish. Chat/outpainting additionally requires its existing explicit opt-in flags. Nothing here restarts the live server or resumes generation.

`tests/creative-ai/editor-workspace-tools.test.js` covers both-brand rendering and saves, guide/grid validation, guide creation/removal, undo/redo, icon search/insertion, layout preview and stale Apply, SVG object/font/image/licence content, expansion mask preservation and single-dispatch mocked requests, guest editor saves, all permission levels, cross-brand isolation, expiry/revocation, conflicts, cross-origin rejection, and the authenticated owner/guest boundary. Related arrangement, element, text, opacity and chat browser regressions are run separately. No live image-model call or production-output mutation is required.

The pointer-drag regression initially found that guide changes rebuilt the photograph and briefly blocked another drag with the loading overlay. Guide/grid-only updates now avoid artwork rebuilds. The browser regression checks actual ruler creation, drag-out deletion and zero artwork reloads for these view-only edits in both brand fixtures.
