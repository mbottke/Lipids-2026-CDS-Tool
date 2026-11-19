# SDD ledger — plan: docs/superpowers/plans/2026-11-19-clarity-pass.md

Request (verbatim): "I can't find where cvd risk % is calculated and shown. Also, do a strictly aesthetic and simplification (without losing detail or clarity) pass. How can drop downs with more info fit seamlessly, not cause loss of position on the page, each user understand the function and purpose of each tab and the order and sequence of the info. Sharp, modern, state of the art, professional, clean, clear."

## Setup
- Setup: base is commit dede156 (tag clarity-base). Standing rulings from the presentation passes carry over: git is the snapshot, the shipped visual language is refined and not replaced, ship means push to the PR branch, merge stays with the owner, Codex is reached through PR comments.
- Setup: Ruling: "strictly aesthetic and simplification" is read as: no clinical logic, thresholds, doses, grades or recommendation wording change, and no content is removed. Interaction changes are in scope because the request asks how disclosures should behave — cost if wrong: he wanted styling only.
- Never-list (verbatim, full-pass taste reference): "No semicolons, em dashes, en dashes, middle-dot strings or exclamation marks. "To" for ranges, commas for asides." "Sentence case. Name things by what the person sees, not how they're built. An action keeps its name throughout." "works from 320 px with no horizontal scroll / visible keyboard focus / reduced motion respected / 4.5:1 text in both lights / real touch targets of 44 px". Project ruling from the last pass stands: en dashes stay inside closed numeric ranges in labels.

## Phase 1 — Measure
- Audit: docs/superpowers/audits/2026-11-19-clarity/audit.md (C1 to C6), from measure.cjs.
- C1 total CVD: below the rail fold at 1243 x 700 (y=841 of 700), 1410 px down on a phone.
- C2 info panels add 423 to 1782 px to the page. C3 closing the statin-intolerance panel from its end leaves the trigger at y=-705. The blood pressure accordion moves the pressed row by -920 px.
- C5 boxes per tab: 35, 23, 20, 27. C6 tab purpose is a 12 px muted line.

## Phase 2 — Diverge
- Three direction agents launched (opus, high, read-only): position stability, wayfinding, visual reduction.
