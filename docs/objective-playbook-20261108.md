# Objective playbook v1 (8 Nov 2026)

The user asked for a short playbook per objective, adapted to each format.

## Why

Before this change, the planner received the brief's objective only as a single word, such as "Purchase". Because of that, a purchase story, an awareness poster and an education carousel were planned with the same amount of text and the same call-to-action strength.

## What new jobs do

- New lean jobs pin `objectivePlaybookVersion: 1` (`lean-policy.configure`, copied by `provider-config.snapshot`).
- `lib/creative-ai/lean/objective-playbook.js` holds the playbook:
  - The five objectives the Studio already asks for: Awareness, Consideration, Purchase, Engagement and Education. TOFU, MOFU and BOFU map to the first three.
  - Ten viewing contexts: notification, marketplace, close-read, at-shelf, distance, story, carousel, messaging, banner and feed. Every Studio format maps to one of them, and full-screen vertical sizes fall back to story.
  - One rule for each objective, plus one sentence for each objective × context.
- `lean-context.packet` adds a mandatory rule, `objective-playbook`, for the planning group's formats.
  - The planner must record an `apply` decision for it, just as it does for any other mandatory rule.
  - With no recognised objective, the packet gets no rule and planning works as before.
- The playbook shapes the plan only. It is planning-only in the image prompt and in the visual review, and it is not used to judge artwork. The review still checks the artwork against the resulting plan (copy, hierarchy, layout) and against the existing rule against invented offers and prices.
- The playbook adds no claims:
  - Offers, prices and EMI appear only when the brief supplies them.
  - Urgency words need a real end date from the brief.
  - Supplied wording, mandatory brand rules, SKU identity and qualifiers take precedence.
- Jobs created with this pin and a single image option are now told they render one design per page. Previously they were told two image models would render the plan, which was stale wording after sunburst was retired.

## Historical jobs

Jobs without the pin keep their exact saved packet, including its binding and wording.

## Tests

`tests/creative-ai/lean-objective-playbook.test.js` checks:
- every format mapping;
- that rules differ by objective and by format;
- both brands' packets;
- the planner decision requirement;
- that the playbook is excluded from the image prompt and the review;
- that historical packets are unchanged.
