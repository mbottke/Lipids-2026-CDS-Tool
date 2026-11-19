# SDD ledger — plan: docs/superpowers/plans/2026-11-19-presentation-passes-overview.md

Request (verbatim): "Do additional passes using the pass skill and utilizing the help of codex in order to consider additional design, organizational, visual, aesthetic, formatting, and phrasing/wording improvements."

## Setup
- Setup: base is git commit 9474118 (tag pass-base-2026-11-19) on branch claude/cvd-fh-bp-additions. Ruling: git is the base snapshot and the rollback, no scratchpad copy — the repo has full history — cost if wrong: none, `git diff pass-base-2026-11-19` reproduces the package.
- Setup: Ruling: three passes by area (copy and formatting, organization, visual), measured and diverged once across the whole app, one whole-series review — the areas share every component, so per-area audits would repeat the same 40 screenshots — cost if wrong: less per-area divergence.
- Setup: Ruling: the production "Clinical Instrument" design (tokens in src/index.css, IBM Plex Mono readouts, hairline section rules) is the house style and is refined, not replaced — it is the user's own shipped design — cost if wrong: a bolder redesign was wanted.
- Setup: Ruling: no change to clinical logic, thresholds, doses or citations in these passes — scope is presentation — cost if wrong: none, logic changes go in their own change.
- Setup: Ruling: Codex is reached through `@codex review` comments on mbottke/Lipids-2026-CDS-Tool#1 (comment 7000076333) — no Codex CLI or OpenAI credentials exist in this container — cost if wrong: Codex input is limited to what a PR review returns.
- Setup: Ruling: ship means push to the PR branch and verify the Vercel preview. Merge to main (production) stays with the user — standing rule from earlier in the session.
- Setup: unavailable here: frontend-design skill, prompts-chat library, WebKit build, memory directory, assign_task. Substitutes: design:design-critique and design:ux-copy guidance, Chromium only. Named in the report.

## Never-list (verbatim, from the full-pass taste reference)
- "No semicolons, em dashes, en dashes, middle-dot strings or exclamation marks. "To" for ranges, commas for asides."
- "Sentence case. Name things by what the person sees, not how they're built. An action keeps its name throughout."
- "Dislikes: orange, browns, most greens, dark purple, dark reds, and tinted washes that read as haze."
- "works from 320 px with no horizontal scroll / visible keyboard focus / reduced motion respected / 4.5:1 text in both lights / real touch targets of 44 px"

## Phase 1 — Measure
- Audit: scratchpad/pass/audit.md (A1 to A19), 40 variants, 104 contact sheets.
- Codex review 5969518206 on 9474118: 4 findings (comments 4624486473 contrast, 4624486482 lifestyle rows at 320 px, 4624486480 automatic blood-pressure conditions shown as pressable, 4624486476 statin-intolerance thresholds ignore mmol/L). All four confirmed against code or measurement (audit A20 to A23). Going into the spec.

## Phase 2 — Diverge
- Three direction agents (opus, high) and one design critic (opus, high), all read-only, each given the audit, the sheets and the source.
  - Organization: Plan block first on every tab, FH workup below the ladder, refine sections as collapsed rows, grid and rail on every tab, scroll reset on tab change.
  - Instrument: permanent three-cell readout strip, risk values in ink with one signal color, 12 px floor, 44 px targets, recommendation before enhancers.
  - Clinical editor: 12-rule style sheet, 15 rewrites, 5 structural changes, 6 cuts.
  - Critic: 12 ranked changes, an inconsistency table, a color audit, 10 screenshot defects.
- Claims checked by measurement before use (scratchpad/scripts/probe.cjs): title clipped at 320 px (title box 37 px for an 85 px title). Rail 839 px tall at 1440 x 800 with the copy button at y=968, unreachable while sticky. Recommendation at y=3004 (Primary), 1534 (ASCVD), 1399 (Diabetes), 3169 (LDL ≥190) at 390 px in the default state. scrollRef attached but never used to reset scroll.
- Chosen: "Answer first, one voice" (spec, approach 2). Beats legibility-only by moving the plan 1700 to 2300 px up on a phone. Beats the instrument rebuild by costing no permanent screen height and keeping the learned risk colors.
- Setup: Ruling: the risk-category hues in src/prevent.js and the existing state text classes stay — the full-pass skill says visual direction never comes from a stored list of likes and dislikes, and the hues are the shipped design — cost if wrong: he wanted them gone. Two agents recommended it. Six lines to change. Held as a question.
- Setup: Ruling: the recommendation sentence is always ink and state color lives only on the status line — a 14 px bold red or amber paragraph reads worse and repeats what the risk readout and status already say — cost if wrong: the colored sentence was a wanted cue, one class to restore.
- Setup: Ruling: section heads stay tracked capitals (house signature) but capitals are removed from every other level — two levels of capitals made the calculator title and its field labels look alike — cost if wrong: field labels lose the instrument look.
- Setup: Ruling: type floor 12 px for sentences and 11 px for chips, tags and section heads, by a mechanical class mapping — 73 to 84% of characters were 11 px or smaller — cost if wrong: pages are about 8% taller before the collapses.
- Setup: Ruling: on LDL ≥190 the FH workup stays above the ladder (agent proposed below) — the workup was asked for by name in the first request and its last step leads into treatment — cost if wrong: the ladder is 2300 px lower than it could be on that tab.
- Setup: Ruling: "Other PREVENT outcomes", "If optimized" and "drivers" stay open (agent proposed collapsing) — total CVD display was asked for by name — cost if wrong: about 430 px of phone scroll on the Primary tab.
- Setup: Ruling: "At goal" requires LDL-C strictly below the goal — every goal is written "<N" and the base build used <= — cost if wrong: a patient exactly at 70 with a goal of <70 now reads not at goal, which matches the written goal.
- Setup: Ruling: execution is inline in this session with one fresh whole-pass reviewer — full-pass phase 5 names inline execution — cost if wrong: no per-task independent review.
- Setup: Ruling: brainstorming and writing-plans ask for the owner's approval of the spec and plan. Self-answered per full-pass ("He pre-approves plans and will be away"). Held questions go in the report.

## Phase 3, 4 — Spec and plan
- Spec: docs/superpowers/specs/2026-11-19-presentation-passes-design.md. Every audit item A1 to A23 is addressed or listed under "Not done here".
- Plan: docs/superpowers/plans/2026-11-19-presentation-passes-overview.md. 9 tasks, 5 Review Focus lines each pinned to a task.

## Phase 5 — Build
- Pre-flight: Task 6 produces Plan, PlanBar, goalStatus. Task 8 consumes the unit prop pattern. Task 5 produces LeaderRow, consumed by Lifestyle, BloodPressure, StatinIntolerance and App. No conflicts.
- Build: Ruling: the executing-plans task-start and task-done scripts were not used, and the tasks landed as one commit — the edits interleave inside src/App.jsx and the browser checks need a running server — cost if wrong: no per-task commit range. Every task's RED and GREEN is recorded below.
- Task 1: complete (tokens: light faint #676c72, muted #555a61, dark faint #9aa1a9, muted #b4bbc3. tests: test-copy "contrast" RED 2.35 to 4.27 → GREEN 4.72 to 6.37).
- Task 2: complete (type mapping 9/9.5/10 → 11, 10.5/11 → 12, 12 → 13. capitals only in the shared section head. tests: test-copy "type" RED 63 classes, 24 uppercase → GREEN. layout "sentences" RED 5 to 13 per tab → GREEN 0).
- Task 3: complete (header, nav, main, h2 section heads, label binding, viewport. tests: axe RED label, meta-viewport, landmark-one-main, region, heading-order, color-contrast → GREEN 0 violations on 16 variants).
- Task 4: complete (44 px controls, single unit button below 640 px, icon-only reset, named "?" buttons. tests: layout "targets" RED 9 to 18 per tab → GREEN 0. "header-320" RED → GREEN. "keyboard" RED → GREEN).
- Task 5: complete (LeaderRow shared by five row types, statin chips wrap, step tags wrap. tests: clip 320 RED 17 → GREEN 0).
- Task 6: complete (src/Plan.jsx, goalStatus, order per tab, rail on every tab, plan bar, scroll reset. tests: test-recommend "goal status" RED missing export → GREEN 7. layout "plan-position" RED → GREEN 1079, 1368, 1235, 872. "plan-content", "rail", "scroll-reset", "plan-bar" RED → GREEN).
- Task 6: Ruling: the plan's limit of 1000 px for ASCVD and Diabetes was wrong — the checklists that decide the plan are 1290 to 1370 px tall on those tabs — the test now requires ≤1400 and ≤1300 and that the plan comes before the ladder and biomarkers — cost if wrong: none, the plan directly follows its inputs.
- Task 6: Ruling: the plan bar sits at the bottom of the scroll area, not the top (spec said top) — at the top it covered the first section head when the page was at scroll 0 — cost if wrong: it is nearer the thumb and further from the eye.
- Task 6: Ruling: the bar shows whenever the inline plan is out of view, above or below — a clinician still entering values sees the live goal — cost if wrong: it shows before the plan has been read once.
- Task 6: Ruling: recommendation sentences are converted to mmol/L for display by inUnit() (not in the plan) — Review Focus 3 required every threshold in the plan to follow the unit, and the sentence said "below 70 mg/dL" beside goal cells in mmol/L — tests: test-recommend "plan sentence in mmol/L" RED missing export → GREEN 8, layout RED → GREEN — cost if wrong: a new sentence pattern with an LDL-C number would stay in mg/dL. The test walks 19 plan sentences.
- Task 7: complete (lifestyle table and risk enhancers collapse with an automatic default. tests: layout "collapses" RED → GREEN 7).
- Task 8: complete (Codex: automatic blood pressure conditions are read-only rows. statin-intolerance thresholds follow the unit. tests: layout "codex" RED → GREEN 6).
- Task 9: complete (12-rule style sheet, rewrites, cuts, monitoring grid and lists, screening by age, ladder note above the rungs. tests: test-copy "style sheet" RED 13 rules failing → GREEN 13. test-clinical 8 expectations updated for sentence-case badges).
- Task 9: Ruling: enlicitide keeps "≈56% LDL-C reduction" without "added to a statin" — the label figure was recorded earlier without the background therapy — cost if wrong: one inconsistent parenthetical.
- Task 9: Ruling: the boxed lead banners on the LDL ≥190 and Diabetes tabs became one muted sentence under the section head — the plan directly below now carries the headline — cost if wrong: the tab's rule is less prominent before the plan is reached.
- Phase 6 — Check: test-copy 23, prevent-cvd 29, recommend 59, clinical 263, bp 39, fh 48, prevent-30yr 60, crossvalidate exit 0, vite build ok. Browser: layout 65/65, flows 30/30, clip 320 and 390 = 0, axe 0 on 16 variants, 0 console errors. Screenshots read at 100%: primary-390 day and night, ldl190-390 day, primary-1440 day, ascvd-1440 day. WebKit: not run, no build in this container.

## Phase 7 — Review of 7d989cd
- Fresh reviewer (opus, xhigh, read-only, own server on :4191): 7 Important, 8 Minor, 3 rulings judged incomplete, 5 declined to judge. Codex review 5969905465: 1 finding (comment 4624804045), the same as reviewer finding 3.
- Every cited line was opened and every measured claim reproduced by a new check that failed before the fix (layout.cjs sections named "review: …", 24 failing. test-recommend 7 failing. test-copy 4 failing).

## Phase 8 — Fix pass (one pass, each fix RED → GREEN, then the whole suite)
- Re-grade: all 7 Important stand. Minors 8, 9, 10, 11, 12, 14, 15 are raised to "fix": each is seen or heard by a person and a test pins it. Minor 13 is not visible.
- Final: fixed 1, plan below the fold of the rail on laptops — the Plan now follows the 10-year block in the rail and inline — layout "plan is fully in view in the rail at laptop heights" RED (bottom 775 of 720) → GREEN at 1280 x 720, 1366 x 768, 1024 x 600.
- Final: fixed 2, blood pressure heading had lost "without a lifestyle trial" and so contradicted the low-risk action text — restored: "Start drug therapy at ≥130/80 without a lifestyle trial if any apply" — test-copy RED → GREEN. This was a wording edit that changed clinical meaning. The no-clinical-change rule caught it only through review.
- Final: fixed 3 and Codex 4624804045, plan bar dropped keyboard focus to the page — the Plan is focusable and takes focus when the bar is pressed — layout "plan bar hands focus to the plan" RED (BODY) → GREEN.
- Final: fixed 4, focused controls under the plan bar — scroll padding on the scroll area — layout "focused control is never under the plan bar" RED (10 to 14 stops per tab) → GREEN 0.
- Final: fixed 5, focus ring clipped on disclosures, the two-segment unit control and the bar — ring drawn inside those controls — same check RED → GREEN 0.
- Final: fixed 6, mmol/L status contradicted itself at 1.4, 1.8 and 2.6 — goalStatus(ldl, goal, si) compares the values as shown — test-recommend "goal status in mmol/L" RED 6 → GREEN, layout RED → GREEN.
- Final: Ruling: in mmol/L "at goal" is judged on the one-decimal values shown, not on mg/dL (reverses Review Focus 3 as written) — a clinician reading "LDL-C 1.4, goal <1.4" must not be told "at goal" — cost if wrong: a value stored as 54 mg/dL reads at goal in mg/dL and not at goal in mmol/L. Each display is consistent with what it shows.
- Final: fixed 7, mmol/L scrolled sideways at 320 to 390 px (present in the base build) — the field may shrink — layout RED (389 in 310) → GREEN.
- Final: fixed 8, risk enhancers could close while in use — any enhancer toggle keeps the section open — layout RED → GREEN.
- Final: fixed 9, BMI calculator controls under 44 px and a close button that took taps from the row below, dose chips 35 px wide at 320 px — layout "small panels" RED → GREEN.
- Final: fixed 10, mg/dL thresholds left in mmol/L mode on the LDL ≥190 tab, the ASCVD tab, monitoring, the lifestyle note, and the apoB and triglyceride notes. Range 160–189 now reads 4.1–4.8 — layout RED (11) → GREEN 0, test-recommend RED → GREEN.
- Final: fixed 11, CKD on the ASCVD tab and HeFH on the LDL ≥190 tab were pressable while set automatically, and a press left them set after the source was corrected (present in the base build, wrong goal persisted) — read-only rows — layout RED → GREEN.
- Final: fixed 12, "Not Elevated", "10-Yr", bare "LDL" in two sentences — test-copy RED 3 → GREEN.
- Final: fixed 14, info toggles, "BMI calc" and "Point bands" did not state whether they were open — aria-expanded — layout RED 6 → GREEN.
- Final: fixed 15, plan bar text truncated at 320 px — intensity hidden below 360 px, still in the accessible name — layout RED → GREEN.
- Final: minor (deferred): rec.clr is set on every recommendation and no longer read. siChol duplicates chol.
- Final: Ruling: plan bar and iOS safe area (reviewer declined, no WebKit) — the bar's minimum height is now 44 px plus the safe-area inset, so its content sits above the home indicator — cost if wrong: not verified on a device.
- Final: Ruling: plan bar and the on-screen keyboard (reviewer declined) — left as is — a person typing may see the bar above or behind the keyboard depending on the browser — cost if wrong: 44 px of the page covered while typing. Not verified.
- Final: Ruling: "added to a statin" on the ladder percentages for ezetimibe, bempedoic acid, evolocumab, alirocumab and inclisiran (reviewer declined to judge the basis) — the numbers are unchanged and the label states the background the figures were already describing. Not re-checked against the trials in this pass — cost if wrong: a label that overstates how the figure was measured. Held for the owner.
- Suite after the pass: test-copy 26, prevent-cvd 29, recommend 66, clinical 263, bp 39, fh 48, prevent-30yr 60, crossvalidate exit 0, vite build ok. Browser: layout 93/93, flows 30/30, clip 320 and 390 = 0, axe 0 on 16 variants. Screenshot read at 100%: 1280 x 720 rail, 390 plan, 390 plan bar.
