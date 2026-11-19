# Presentation passes: design

Date: 2026-11-19. Base: commit 9474118 (tag `pass-base-2026-11-19`). Ledger: `.superpowers/sdd/2026-11-19-presentation-passes/progress.md`.

## Intent

Request, verbatim: "Do additional passes using the pass skill and utilizing the help of codex in order to consider additional design, organizational, visual, aesthetic, formatting, and phrasing/wording improvements."

The app is a point-of-care tool. A clinician enters a few values and needs the plan. The audit (`docs/superpowers/audits/2026-11-19/audit.md`) measured where the current build gets in the way of that:

- The recommendation sits 3004 px down on the Primary tab at 390 px (4.1 screens), 3169 px on LDL ≥190 (4.3), 1534 px on ASCVD, 1399 px on Diabetes.
- 59 to 89 text nodes per tab fail contrast in the light theme. One token causes all of them: `--faint` #9ba0a6 at 2.6:1.
- 73 to 84% of visible characters render at 11 px or smaller, in 14 sizes.
- Header controls are 30 to 32 px high, "?" buttons 20 to 24 px.
- At 320 px the title is clipped and 17 values spill out of their rows.
- On an 800 px tall desktop window the "Copy summary for note" button cannot be reached (the rail is 839 px tall and sticky).
- The same concept is written several ways (LDL and LDL-C, apoB and ApoB, target and goal, PCSK9 mAb and PCSK9i).

## Goals

1. The plan is the first thing after the inputs that decide it, on every tab, at every width.
2. Every piece of text passes 4.5:1 in both themes. No sentence is smaller than 12 px. Every control is at least 44 px.
3. One term per concept and one way to write each number, held by a test.
4. Nothing clipped or spilling from 320 px up.

## Non-goals

- No change to clinical logic, thresholds, doses, percentages, class-of-recommendation grades or citations. One display exception is listed under Plan block.
- No new palette. The risk-category hues in `src/prevent.js` stay as shipped.
- No content is deleted. Content may move, merge or start collapsed.

## Anti-goals

- A page that looks different but takes as long to use.
- A recolor of the shipped design on the strength of a stored preference list.

## Approaches considered

1. **Legibility only.** Fix tokens, sizes, targets and wording, leave the order. Lowest risk. It leaves the largest measured problem (plan 4 screens down) untouched.
2. **Answer first, one voice (chosen).** Legibility plus a single Plan block placed right after the deciding inputs on every tab, kept in view on desktop by the right rail and on phones by a bar that appears when the Plan scrolls away. Wording normalized to a 12-rule style sheet. This fixes every measured problem and keeps the shipped look.
3. **Instrument rebuild.** A permanent three-cell readout strip, risk values in ink with one signal color, check rows as hairline lists. It costs 52 px of every phone screen and removes the risk-category hues a clinician has learned. Its best parts (targets, type floor, one place for state) are taken into approach 2.

What approach 2 does better: than 1, it moves the plan 1700 to 2300 px up on a phone. Than 3, it costs no permanent screen height and keeps the learned risk colors.

Boldness is spent in one place: the Plan block. Accessories removed: the solid red and green status disc, the statin list repeated inside the recommendation card, the separate "Treatment goals" card.

## Decisions by area

### A. Legibility (pass 1)

Tokens in `src/index.css`:

| Token | Light, was → now | Dark, was → now |
|---|---|---|
| `--faint` | #9ba0a6 → #676c72 | #868d96 → #9aa1a9 |
| `--muted` | #6e7378 → #555a61 | #adb4bc → #b4bbc3 |

Lowest resulting ratio: light faint 4.72:1 on the selected-row fill over paper, dark faint 4.73:1 on the selected-row fill over surface.

Type scale. Mapping applied to every `text-[Npx]` class in `src/`: 9, 9.5, 10 → 11. 10.5, 11 → 12. 12 → 13. 13 and above unchanged. 11 px is allowed only for uppercase section heads, chips, tags and ruler tick labels. Sentences are 12 px or larger.

Capitals. Tracked uppercase stays at one level only: section heads (`Card` title and the risk-rail block heads), at 11 px `text-muted`. Field labels, the in-section `Eyebrow`, "Recommendation", "Goal" and "Points" become sentence case.

Semantics. `<header>`, `<nav aria-label="Patient group">`, `<main>`. `Card` title is an `<h2>`. `Num` and `SIField` bind label to input with `useId`. `index.html` viewport loses `maximum-scale=1.0, user-scalable=no`.

Targets. Every `button`, `a[href]` and `input` measures at least 44 × 44 px at 390 px, by size or by an enlarged hit area on small glyph buttons (`.hit` utility: `position: relative` plus an `::after` inset of −12 px).

Header below 640 px: horizontal padding 16 px, one unit button that shows the active unit and switches on press (`aria-label="Units: mg/dL. Switch to mmol/L"`), Reset shows its icon only (`aria-label="Reset patient"`). From 640 px the two-segment unit control and the "Reset" label return.

320 px. One shared `LeaderRow` in `src/ui.jsx` replaces the five hand-built label, dotted leader, value rows. Its label is `min-w-0` and wraps. Its value never shrinks. Step tags wrap.

### B. Organization (pass 2)

Plan block, `src/Plan.jsx`, one component used on all four tabs:

```
PLAN                                   (section head)
High-intensity statin, then ...        15 px bold, ink
optional note                          12 px muted
<70 LDL-C | <100 non-HDL-C | ≥50% reduction     three cells, mono
Not at goal. LDL-C 152 mg/dL, 82 above goal. 54% reduction needed.
```

- The recommendation sentence is always ink. State color appears only on the status line (existing red-700 / emerald-700 text classes with a 6 px dot).
- The status line appears once LDL-C is entered. "At goal" requires LDL-C strictly below the goal, because every goal is written "<N". The base build used `<=`. This is the one display exception to the no-logic rule.
- The statin list inside the old recommendation card is removed. Ladder rung 2 already shows it under the same condition.

Order, top to bottom:

| Tab | Order |
|---|---|
| Primary | calculator, risk (10-year, 30-year), **Plan**, other outcomes, if optimized, drivers, copy, risk enhancers, CAC, ladder, biomarkers, blood pressure, monitoring |
| ASCVD | LDL-C and tiers, checklists, **Plan**, ladder, biomarkers, blood pressure, monitoring |
| Diabetes | age, LDL-C, tiers, enhancers, **Plan**, ladder, biomarkers, blood pressure, monitoring |
| LDL ≥190 | LDL-C, goal tiers, **Plan**, FH workup, ladder, biomarkers, blood pressure, monitoring |

Desktop (from 1024 px): every tab uses the two-column grid. The right rail holds the risk readout (Primary only) and the Plan. The rail is sticky and scrolls on its own when taller than the window (`max-height: calc(100dvh - 9rem); overflow-y: auto`). The inline Plan in the main column is hidden from 1024 px.

Plan bar (below 1024 px): when the inline Plan is scrolled out of view, a 44 px bar is pinned at the top of the scroll area: "LDL-C goal <70" and the statin intensity, with "Now 152" when LDL-C is entered. Pressing it scrolls to the Plan (`behavior: "auto"` under reduced motion). It is a `<button>` with `aria-label="Go to plan"`.

Tab switch scrolls the content to the top.

Collapsed by default:
- The lifestyle table in ladder rung 1 is a `Disclosure` ("Expected LDL-C change"), open when the plan is lifestyle only (`rec.int` is `lifestyle` or `none`).
- Risk enhancers on the Primary tab are a `Disclosure` with the hint "N checked", open when the 10-year category is borderline or intermediate or when any enhancer is checked. A manual open or close is kept until Reset.

Blood pressure conditions that another part of the app sets (diabetes, clinical CVD, CKD) render as the read-only `AutoRow` with "Set by: …". Rows not set elsewhere stay pressable (Codex finding).

The statin-intolerance panel takes `si` and shows its LDL-C thresholds in the active unit (Codex finding).

### C. Wording and formatting (pass 3)

Style sheet, enforced by `test-copy.mjs`:

1. "LDL-C" for values and thresholds. Bare "LDL" only in the goal phrase "to LDL below N mg/dL" and the tab label "LDL ≥190".
2. "non-HDL-C", never "non-HDL" alone.
3. "apoB" in running text, "ApoB" only as the first word of a label or sentence.
4. "PCSK9 mAb" for evolocumab and alirocumab. "PCSK9 inhibitor" only as the class word. Never "PCSK9i".
5. Sentences say "below N". Labels, chips and sub-lines use "<N".
6. Labels use an en dash for a closed numeric range. Sentences use "to". A half-open range is "3 to <5%", never "3–<5%".
7. "mmHg", never "mm Hg". "≈" for approximately, never "~".
8. A class-of-recommendation chip holds only "COR" and a grade.
9. Sentence case in chips, badges and labels.
10. "goal", never "target". "lipid profile", never "lipid panel". "Refer to a lipid specialist".
11. "men" and "women" in thresholds. No middle dot between two clauses of prose.
12. No "Rx", "LLT", "med(s)" or "CI" for contraindicated. No semicolons.

Rewrites that a clinician reads on every use are listed in the plan, task 9. Layout of text: monitoring and screening rows use a fixed label column. Bullets are real lists with a hanging indent. Screening rows are ordered by age. The ASCVD note that the ladder order is not fixed moves above the rungs. Ladder percentages state "added to a statin".

## Not done here

| Item | Reason |
|---|---|
| Risk values in ink, new state palette | The risk hues are the shipped design. Held as a question for the owner. |
| Check rows as hairline lists | Bordered rows give a clear 44 px target. A restyle of every checklist is its own pass. |
| Collapsing "Other PREVENT outcomes", "If optimized", "drivers" | Total CVD display was asked for by name in the first request. They move below the Plan and stay open. |
| Removing FH step 5 | The step is part of the requested workup flow. |
| Non-breaking hyphen in every "LDL-C" | 79 strings and it changes copied text. The ladder parentheticals get `whitespace-nowrap`. |
| WebKit run | No WebKit build in this container. |
| Unreachable clause at `recommend.js:154`, differing percentages between the ladder and the statin-intolerance panel | Clinical content. Reported, not changed, except the "added to a statin" label. |

## Testing

- `node test-copy.mjs`: style-sheet rules, token contrast computed from `src/index.css`, no type class below 11 px, viewport meta.
- `docs/superpowers/audits/2026-11-19/scripts/` (Playwright, run against the dev server): `audit.cjs` (axe, zero violations), `clip.cjs 320` (zero spills), `layout.cjs` (Plan position per tab, header fit at 320, 44 px targets, rail reachability at 1440 × 800, scroll reset, Plan bar, read-only blood pressure rows, mmol/L thresholds in the statin-intolerance panel, strict at-goal boundary).
- Existing suites: `test-prevent-cvd`, `test-recommend`, `test-clinical`, `test-bp`, `test-fh`, `test-prevent-30yr`, `test-crossvalidate`, and `vite build`.

## Amendments after review (2026-11-19)

- The Plan sits directly after the 10-year risk block, in the rail and inline. After the 30-year block it fell below the fold of the rail at 1280 x 720, 1366 x 768 and 1024 x 600.
- The plan bar is pinned at the bottom of the scroll area, not the top. It shows whenever the inline Plan is out of view. Pressing it moves focus to the Plan. The scroll area keeps a focused control clear of the bar.
- In mmol/L, "at goal" compares the two values as shown, to one decimal. 55 mg/dL is 1.42 mmol/L, but the goal reads "<1.4", so a value shown as 1.4 is not at goal. In mg/dL the comparison is on the integers, strictly below.
- The plan sentence, the LDL ≥190 thresholds in the FH workup, and the LDL-C goal mentioned in the apoB and triglyceride notes follow the selected unit. A closed range ends one step below the next threshold (160–189 reads 4.1–4.8).
- A condition another part of the app sets is a read-only row on every tab: blood pressure conditions, CKD on the ASCVD tab, HeFH on the LDL ≥190 tab.
- Buttons inside a clipping container draw their focus ring inside the control (`.focus-inset`).
