# Independent planning and image queues

Implemented for current original-artwork main Studio jobs and planned-raw experiment jobs. Historical reviewed/editable jobs keep the existing execution path.

Planning executes shared research, strategy, concept, set, copy, art and reconciliation stages. It saves each generation package and a job/brand-bound, SHA-256-bound `image-queue.json` manifest, including planning failures and expected output count. It then releases its worker. Image workers validate the saved handoff, load original budget/provider receipts, and generate using unchanged request keys. They do not rerun planning. Carousel anchor dependencies remain enforced. Successful images and failed placements stay separate.

Main Studio has two independent bounded asynchronous worker pools (two planning jobs and two image jobs). These share the server process. The experiment's existing isolated-process supervisor now allocates two planning processes and three image processes within its five-process ceiling. Shared provider gates, aggregate memory ceiling, cost admission, request reconciliation and existing retry limits remain in effect. SQLite records phase ownership, including handoff before worker exit; restart clears a dead handoff owner without repeating planning.

Handoff is currently per project/asset family, not per newly planned page. Independent projects overlap; a large family's image phase starts after its planning settles. This preserves set planning and avoids concurrent writers to one project's planning state. It does not shorten model response latency or reduce token inputs. Queue waiting still counts against the existing processing deadline; no automatic budget/deadline extension was introduced.

Experiment work remains explicitly paused. Updating worker code does not clear the queue halt or submit paid work. The existing credit-continuation adapter remains responsible for reconciling interrupted provider requests on explicit resume.

Validation: 21 planned-artwork/handoff tests (both brands), and 35 queue/scheduler tests including real isolated child-process handoffs, crash recovery, failure isolation, lane refill, shared image capacity and set dependencies. Two lane unit tests are included in the latter count. No paid test run.
