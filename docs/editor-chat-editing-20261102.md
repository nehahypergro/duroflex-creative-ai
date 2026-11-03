> Activation update — 3 November 2026: authenticated Studio now enables editor chat by default and advertises it in editor resources. Refresh the page and reopen a design; no `?editorChat=1` parameter is needed. Pins, boxes and background AI controls follow the same capability. `CREATIVE_AI_EDITOR_CHAT=0` can explicitly disable it. Shared guest links still have no AI access. Earlier opt-in instructions below describe the original rollout. Paid requests still require consent.

# Opt-in editor chat and annotations

Implemented separately from campaign generation. It is disabled by default. No running server was restarted and no live provider run was used to verify this feature.

## Activation

After active work has finished, start the intended server with `CREATIVE_AI_EDITOR_CHAT=1` and open Studio with `?editorChat=1` before its route hash. Both server opt-in and client opt-in are required. The embedded editor also accepts `{chatEnabled:true}` in its open options for isolated previews. Do not enable the live server by restarting it during an active batch.

## Behaviour

- Chat targets the selected layers, a numbered pin, or a normalized rectangular annotation. Geometry is mapped from the rendered canvas, so zoom does not change the target.
- Exact text replacements, geometry, six-digit colours, alignment, visibility, adding text/shapes, and inserting/replacing uploaded images create local proposals without image-model calls.
- Rewriting, wording alternatives and more open-ended requests use the existing scoped reasoning provider after explicit paid authorization. Alternative selection does not dispatch another model call.
- Photographic edits use the existing image provider, the current photographic layer and any available saved references. Text and logo layers remain separate. Image edits require those layers to have been separated from the background.
- Boxes become image-edit masks. Returned pixels outside the selected boxes are restored from the source photograph. Pins select objects; for photographic region editing, draw a box. Brush masks and campaign-wide edits are outside this first release.
- Before/after previews are separate from the working canvas. Apply creates a saved editor revision; Discard preserves the source. Existing Undo and version history remain available.
- Requests retain source revision, document hash, brand, selected artwork version, instruction, targets, annotations, proposal, status and provider receipts. Changed local or remotely saved documents cannot be overwritten by an old proposal.
- Requests and provider dispatches have independent persistent identifiers and file locks. Unresolved interrupted requests are never automatically recharged or resumed. Their status remains visible for usage reconciliation.

## Storage and costs

Each creative's proposals live in its own `editor-chat-ai` child store. Source and proposed documents, previews and receipts stay there. Proposed photograph files use the existing immutable `photo-` file path. New assets are registered with the editor on Apply. Uploaded editor assets remain job-scoped.

The existing cost tracker scans this child store and deduplicates receipts normally. Estimates use the existing dated INR conversion. Missing prices, receipts and actual billing remain unknown. A configured reservation allowance is not an invoice guarantee.

The conversation does not modify brand preference memory, approve artwork, or trigger training. Applied/discarded states are retained as provenance for future review.

## Validation

New tests cover both brand fixtures: local proposals, protected source versions, stale applies, reopening history, pins/boxes at changed zoom, default-off UI, paid authorization, model tool validation, wording alternatives, single dispatch, receipt tracking, masked pixels, unchanged text/logo layers and mobile layout. All image/text providers in these tests are mocks. Live photographic fidelity remains unverified.

A resize callback could run after its stage had been removed during editor reopening. The browser regression reproduced the null `clientWidth` error before the added guard and passes with that guard.

The selected controls and pane are preserved during a canvas rebuild by suppressing intermediate selection events. Browser tests cover text effects, groups, locks and Apply. Legacy browser helpers now type directly on the canvas and open spacing/effects from the toolbar, matching the approved removal of the duplicate Text tab.

## Selected-background regeneration

Selecting the background photograph exposes **Regenerate with AI** in its contextual toolbar. The action opens an optional “Anything specific?” instruction field. Continue creates a full-background image proposal with a dedicated validated intent; mentioning the headline or logo in the instruction cannot accidentally route it to copy editing. The existing paid authorization, before/after preview, Apply and Discard flow follows. The working canvas is preserved until Apply. This action uses the same server/client feature flags as chat editing.
