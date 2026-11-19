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
- Position stability: one modal sheet for reference content, one flat inline row, nothing closes anything else.
- Wayfinding: a six-number risk grid, a purpose sentence and route line per tab, renamed heads, stage signs between sections.
- Visual reduction: boxes only around inputs, buttons and computed results. Check rows as hairline lists.
- Chosen: "One family, one place, one route" (spec approach 2). Beats restyle-only by fixing both measured position losses and the findability report. Beats everything-in-overlays by keeping treatment content on the page.
- Setup: Ruling: stage words are a kicker on the first head of a stage, not a sign row between sections (agent proposed rows) — a row per stage doubles the label on single-section stages and costs about 220 px a page — cost if wrong: the stages are less marked in the page than in the route line.
- Setup: Ruling: the lifestyle table and the blood pressure tables stay inline (agent proposed sheets) — they are treatment content — cost if wrong: two more things that lengthen the page when opened.
- Setup: Ruling: the automatic open defaults stay (agent proposed removing them) — both sections sit below the inputs, so they never move the field being edited — cost if wrong: a section's length changes while the user types above it.
- Setup: Ruling: no browser-back handling for the sheet — history bookkeeping can drift in an installed app — cost if wrong: Android back leaves the app page instead of closing the sheet.

## Phase 3, 4 — Spec and plan
- Spec: docs/superpowers/specs/2026-11-19-clarity-pass-design.md. Plan: docs/superpowers/plans/2026-11-19-clarity-pass.md. 5 tasks, 5 Review Focus lines.

## Phase 5 — Build
- RED before any product code: clarity.cjs 40 of 52 failing.
- Build: Ruling: one commit for the five tasks — the edits interleave in src/App.jsx and src/ui.jsx — cost if wrong: no per-task range.
- Task 1: complete (PREVENT risk grid, "30-year outlook". tests: clarity "risk grid" RED 9 → GREEN 12).
- Task 1: Ruling: the phone limit for total CVD was 900 px and is now 1100 — the inputs above the grid are about 880 px tall — measured 987 (was 1410) — cost if wrong: none, it now sits in the same block as ASCVD.
- Task 1: Ruling: the sentence explaining total CVD sits after the plan, not inside the grid — inside the grid it pushed the plan's status line out of the rail at 1280 x 720 — cost if wrong: the explanation is one block away from the number.
- Task 2: complete (InfoSheet on a native dialog, one `info` state for five sheets. tests: clarity "sheet" RED 16 → GREEN 32).
- Task 2: Ruling: Review Focus 5 (reset or tab switch with a sheet open) cannot happen — the dialog is modal and the page behind is inert. The check instead proves a backdrop press closes the sheet without pressing what is behind it.
- Task 2: axe then reported scrollable-region-focusable on the sheet body (12 variants) → the body is focusable → axe 0. Chromium already scrolls it from the keyboard, so the keyboard check could not fail first. The axe finding is the failing evidence.
- Task 3: complete (flat Disclosure, independent blood pressure sub-sections, end-close on risk enhancers and blood pressure, point bands always shown. tests: clarity "disclosures" RED 4 → GREEN 6).
- Task 4: complete (TabIntro, route line, kickers, renames. tests: clarity "wayfinding" RED 4 → GREEN 17).
- Task 4: Ruling: the Primary inputs card keeps a one-line row for its "?" mark, now reading "BMI is optional. It adds the heart failure estimate." — the old line ("Ages 30–79, no known ASCVD.") moved into the intro and the mark needs a row — cost if wrong: one new sentence of copy.
- Task 5: complete (flat CheckRow and AutoRow, enhancer rows on CheckRow, inactive tiers and notes without containers. tests: clarity "boxes" RED 7 → GREEN 9. Boxes 35, 23, 20, 27 → 17, 6, 7, 12. Checkbox border 1.35:1 → 5.20:1).
- Found by the older checks and fixed: route links 32 to 43 px wide → 44 px minimum. Plan goals 9 px below a 600 px tall window → grid tightened.
- Older checks updated for deliberate changes: layout.cjs (sheet instead of inline panels, stage word in button names, head names, plan limits 1500/1500/1350/1100), flows.cjs (six assertions matched the old readout wording, values unchanged), test-copy (range rule needs a digit before the dash).
- Build: Ruling: the plan sits 84 to 220 px lower on a phone than before this pass (1071, 1480, 1308, 956) — the purpose sentence and route line, and on Primary the full risk grid above the plan — cost if wrong: the last pass's gain is partly spent. It was 3004 at the original base.

## Phase 6 — Check
- Unit: test-copy 26, prevent-cvd 29, recommend 66, clinical 263, bp 39, fh 48, prevent-30yr 60, crossvalidate exit 0. vite build ok.
- Browser: clarity 74/74, layout 97/97, flows 30/30, scrollbars 18/18, clip 320 and 390 = 0, axe 0 on 16 variants.
- Screenshots read at 100%: primary-390 day and night, ascvd-390, primary 1243 x 700, sheet at 390 and at 1243. WebKit: not run.

## Phase 7 — Review of e82acf3
- Fresh reviewer (opus, xhigh, read-only, own server on :4192): 1 Important, 7 Minor, 3 rulings judged wrong or weak, 5 declined to judge. Codex review 5971309317: 1 finding (comment 4625883276), the same as the reviewer's Important finding.
- Each was reproduced by a check that failed before the fix: clarity.cjs "review: …" sections, 12 of 15 failing.

## Phase 8 — Fix pass (one pass, RED → GREEN, then the whole suite)
- Re-grade: the Important finding stands. All seven Minors are raised to "fix": each is seen by a person and a check pins it.
- Final: fixed, route links scrolled but left keyboard focus on the link, so the next Tab jumped back to the top (also Codex 4625883276) — the target section takes focus before the scroll — RED 4 → GREEN.
- Final: fixed, dragging a text selection out of the sheet closed it — it closes only when the press starts and ends on the backdrop — RED → GREEN.
- Final: fixed, two clinical clauses had left the page for the PREVENT sheet: "Statin decisions use ASCVD risk." and the "ages 30–59" note on the 30-year number. Both are back — RED 2 → GREEN. This broke "no content removed" as written.
- Final: fixed, reviewer judged the ruling on the total CVD sentence too wide — the rail reason does not apply on a phone — the sentence now sits inside the grid on the phone layout and after the plan in the rail — RED → GREEN.
- Final: fixed, hairlines between check rows curved at both ends — rows have square corners except under a focus ring — RED (8 px) → GREEN. Hover styles apply only where hover exists.
- Final: fixed, the end "Close" row scrolled even when the head was already on screen — one shared rule (backIntoView) for Disclosure, Card and blood pressure — RED → GREEN.
- Final: fixed, ruler labels "10" and "15+" ran together at 320 px (0.6 px apart) — the end label is dropped below 360 px — RED → GREEN.
- Final: fixed, the intolerance sheet did not keep its trigger's name — titled "Statin not tolerated?" — RED → GREEN.
- Final: Review Focus 5 is now pinned: a press where Reset sits only closes the sheet and resets nothing.
- Final: Ruling corrected: "cost if wrong: none" on the phone limit for total CVD was not true. At 987 px it is still below the first screen after the inputs on an 844 px phone.
- Final: minor (deferred): the first bold line inside the PREVENT sheet nearly repeats its title. A single-child justify-between row in SevereTab. The three sheet components keep the indentation of their old location.
- Final: Ruling: the ASCVD intro lists ACS, prior MI, ischemic stroke, symptomatic PAD, CABG or PCI (reviewer declined to judge whether it reads as exhaustive, since stable angina, TIA and aneurysm are also ASCVD) — the list is the tab's own checklist terms — cost if wrong: a clinician reads the tab as not applying to a patient it applies to. Held for the owner.
- Suite after the pass: unit all exit 0 (test-copy 26, recommend 66, clinical 263, prevent-cvd 29, bp 39, fh 48, prevent-30yr 60, crossvalidate). vite build ok. Browser: clarity 89/89, layout 97/97, flows 30/30, scrollbars 18/18, clip 320 and 390 = 0, axe 0 on 16 variants.
