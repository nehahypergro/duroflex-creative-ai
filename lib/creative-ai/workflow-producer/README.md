# Workflow producer activity ledger

This module saves factual activity history and derives a simple progress tracker. Full execution is supplied by runtime adapters; an event log alone does not run an agent or generate a static.

```js
const {ActivityLedger} = require('./lib/creative-ai/workflow-producer');
const ledger = new ActivityLedger('/absolute/producer-owned/activity');
await ledger.append(event); // strict event-input schema; stable callback idempotency key
const history = await ledger.read(jobId);
const progress = await ledger.project(jobId);
const subset = await ledger.query(jobId, {agent:'copywriter', afterSequence:12});
```

Each job declares its stable assignment, exactly two concept routes and selected placements. Each concept×placement is an output unit. Events record timestamp, named agent, concise description/outcome, artifact/source/version references, upstream handoffs, dependencies and unresolved issue references. Raw prompts, hidden deliberation, credentials and guideline bodies are excluded from the contract. Text fields are bounded; credential-shaped content is rejected. Adapter callers remain responsible for sanitizing descriptions and verifying factual outcomes; a schema cannot establish that an external action happened.

Supported events: job creation; task start/completion/failure; artifact saved; handoff sent/accepted/completed; dependency waiting/resolved; version superseded; review decision; correction planned/used; ready/flagged/no-output delivery; rejected callback. Sending or accepting a handoff is not task start or completion. Completion requires the appropriate saved artifact metadata and valid current input versions. Copy and art can be running simultaneously. Supersession adds history, invalidates affected completion, and rejects late callbacks referencing old inputs. Historical failures stay visible while current replacement tasks can recover progress.

Storage is chronological immutable numbered JSON records, with stable event IDs, consecutive sequence numbers, monotonic recording timestamps and a hash chain. An exclusive job lock serializes writers. New events use synced temporary writes and atomic rename; committed records are never rewritten. Replay verifies schema, IDs, sequence, hashes and legal transitions. Truncated/corrupted journals fail explicitly. Duplicate callbacks return the same event; reusing a key for a different payload fails. Busy jobs return a retryable transaction error using the same callback key. Reader visibility is atomic at each event; this is not a tamper-proof audit against a filesystem administrator.

`appendReviewer(event,{reviewLedger,unitKey})` reads the existing `creative-reviewer.ReviewLedger` and saves an immutable linked snapshot. General append cannot claim review, revision or final status. The snapshot must match assignment/route/placement, current package/image hashes and the original one-cycle cap. Matching package metadata is required; image delivery additionally requires the matching saved image (or earlier available fallback). It never increments/reset revision budget. Duplicate callbacks reuse the original snapshot even if reviewer state later advances.

Default tracker: Understanding your brand → Developing concepts → Creating statics → Checking quality → Ready. Advancement uses recorded completion, never timers or dispatch. Individual outputs show partial success, waiting, failed work, ready, flagged delivery or no output. Ready requires all output units ready and complete recorded upstream stages. Missing history is reported honestly instead of inventing completion. Optional collapsed Activity details shows chronology and concise references; it adds no concept selection or human gate. No ETA is fabricated.

Synthetic fixtures are explicitly labeled and cannot be written as production-adapter events. Source/artifact references are metadata, not full bodies or image payloads. The separately owned placement package and existing dossier/reviewer contracts are consumed without modification.
