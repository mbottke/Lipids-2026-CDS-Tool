# Clarity pass: design

Date: 2026-11-19. Base: commit dede156 (tag `clarity-base`). Ledger: `.superpowers/sdd/2026-11-19-clarity-pass/progress.md`. Audit: `docs/superpowers/audits/2026-11-19-clarity/audit.md`.

## Intent

Request, verbatim: "I can't find where cvd risk % is calculated and shown. Also, do a strictly aesthetic and simplification (without losing detail or clarity) pass. How can drop downs with more info fit seamlessly, not cause loss of position on the page, each user understand the function and purpose of each tab and the order and sequence of the info. Sharp, modern, state of the art, professional, clean, clear."

Four problems, each measured in the audit:

1. Total CVD risk is one row under "Other PREVENT outcomes", below the fold of the rail at 1243 x 700 and 1410 px down on a phone.
2. "More info" panels are inserted into the page (423 to 1782 px). Closing a long one leaves the user 705 px past its trigger. One accordion moves the pressed row 920 px.
3. Nothing says who each tab is for, or the order the page is meant to be used in.
4. 20 to 35 bordered boxes per tab, and seven looks for things that expand.

## Goals

1. All six PREVENT numbers are found in one glance, above the Plan.
2. Opening or closing anything never moves what the user was looking at.
3. A first-time user can say what each tab is for and what comes next.
4. A box means something: an input, a button, or a computed result.

## Non-goals and anti-goals

- No clinical logic, threshold, dose, grade or recommendation sentence changes. No content is removed.
- Not a restyle: tokens, fonts, tracked-caps section heads and risk hues stay.
- Anti-goal: a cleaner page on which a detail is harder to reach than before.

## Approaches

1. **Restyle only.** Flatten boxes and unify disclosure looks. Leaves total CVD where it is and leaves inserted panels moving the page.
2. **One family, one place, one route (chosen).** A risk grid for the six numbers, one sheet for reference content, one flat row for inline disclosures, a purpose line and a route line per tab, and boxes only where they mean something.
3. **Everything in overlays.** Also move the lifestyle table, risk enhancers and blood pressure tables into sheets. Rejected: those are inputs or treatment content, and a tap would hide what a lifestyle-only plan is about.

Approach 2 beats 1 by fixing the two measured position losses and the findability report. It beats 3 by keeping treatment content on the page.

## Decisions

### A. PREVENT risk grid

One block, head "PREVENT risk", placed before the Plan in the rail and in the phone column.

```
PREVENT RISK
                10 years        30 years
ASCVD           3.6%            19.6%
For statins     Borderline      Elevated
                3 to <5%        ≥10%
                ├─┼▼┼──┼─┤      ├──┼──▼──┤
Total CVD       5.0%            27.7%
For BP drugs
Heart failure   1.6%            12.7%
Total CVD is ASCVD plus heart failure. It sets the blood pressure drug-therapy threshold (≥7.5% at 10 years).
```

- Grid `grid-cols-[88px_1fr_1fr]`. ASCVD numbers are the largest on the page (`clamp(30px, 9.5vw, 40px)`), in their risk-category color, each with its category word, range and ruler.
- Every percentage shows one decimal.
- Total CVD at 10 years turns amber with a dot when it is at or above 7.5%.
- Heart failure without BMI reads "Enter BMI". At age 60 and above the 30-year column reads "–" with "Not validated for ages 60 and above."
- After the Plan comes "30-year outlook": the horizon sentence, "If optimized" and the drivers, then the copy button.

### B. Reference content opens in a sheet

One `InfoSheet`, a native modal `<dialog>`. Bottom sheet below 1024 px (full width, at most `100dvh - 56px` tall). Right panel from 1024 px (480 px wide, full height). The page behind does not move or scroll. It closes with the ✕, Escape, or a press on the backdrop, and focus returns to the trigger.

In the sheet: About the PREVENT calculator, About CAC scoring, About Lp(a) and apoB, Statin reference (one sheet, two triggers), Statin not tolerated? (with "Where AACE 2025 differs" always shown).

Sheet triggers carry `aria-haspopup="dialog"`. The "?" marks stay as triggers.

### C. Inline disclosures are one family

- One flat row: hairline above, 44 px high, 13 px semibold label, hint and chevron at right, no box. Used by "Expected LDL-C change", the four blood pressure sub-sections and the blood pressure summary.
- Opening one never closes another. The blood pressure sub-sections open independently.
- Closing a panel whose trigger has scrolled above the view brings the trigger back into view at once. Panels taller than 600 px (risk enhancers, blood pressure) end with a "Close" row.
- "Point bands" is always shown (51 px).
- The automatic defaults from the last pass stay (risk enhancers open at borderline or intermediate risk, the lifestyle table open for a lifestyle-only plan). Both sit below the inputs, so they never move the field being edited.

### D. Purpose and route

- Each tab opens with one sentence, 14 px medium ink:
  - Primary: "Ages 30 to 79, no known ASCVD, LDL-C below 190. Risk guides the statin."
  - ASCVD: "Any clinical ASCVD: ACS, prior MI, ischemic stroke, symptomatic PAD, CABG or PCI."
  - Diabetes: "Adults with diabetes and no ASCVD. Age and added risk set the statin."
  - LDL ≥190: "Adults with LDL-C ≥190 or suspected FH. Set the goal, then work up FH."
- Under it, a route line (`<nav aria-label="On this tab">`): stage words as links, joined by arrows. Primary: Assess → Plan → Refine → Treat → Also check. ASCVD and Diabetes: Assess → Plan → Treat → Also check. LDL ≥190: Assess → Plan → Work up → Treat → Also check. A link scrolls its section into view. From 1024 px the Plan is in the rail and its link is hidden.
- The first section head of the Assess, Refine and Also check stages carries the stage word as a kicker in ink ("ASSESS / PREVENT INPUTS"). Plan, Treatment ladder and FH workup name their own stage.
- Renames: PREVENT-ASCVD risk calculator → PREVENT inputs. CAC reclassification (optional) → CAC score (optional). Diabetes pathway → Diabetes risk tier. Severe hypercholesterolemia → LDL-C goal tier. FH workup, step by step → FH workup. Advanced biomarkers → Lp(a) and apoB. Monitoring → Monitoring and referral.
- The old 12 px purpose lines the intro now covers are removed ("Ages 30–79, no known ASCVD.").

### E. Boxes only where they mean something

- Keep a box: inputs, buttons and chips, the Plan, the active goal tier, the DLCN score, the sheet.
- Flatten to hairline rows: check rows, read-only rows, disclosures, the blood pressure summary.
- Remove the container: note and callout boxes, the non-HDL-C dashed box, the "Untreated LDL-C" panel, inactive goal tiers (transparent border, same geometry).
- Check rows: no border or fill. The 20 px checkbox carries the state: unchecked `border-faint` (5.2:1, was about 1.4:1), checked filled ink. Lists are `divide-y divide-line border-y border-line`.
- The hand-built risk-enhancer rows become `CheckRow`.
- Radius: 8 px for boxes, buttons and inputs. 4 px for the checkbox and inline tags. Full for step markers and badges.

## Not done here

| Item | Reason |
|---|---|
| Browser back closes the sheet | History bookkeeping can drift in an installed app. ✕, Escape and backdrop are enough. |
| Lifestyle table and blood pressure tables in sheets | Treatment content stays on the page (approach 3). |
| Removing the automatic open defaults | They never move the field being edited. Ruled in the ledger. |
| Stage sign rows between sections | A row per stage doubles the label on single-section stages. Kickers carry it. |
| Tab label changes | Four labels fit at 320 px as they are. |

## Testing

- `docs/superpowers/audits/2026-11-19-clarity/clarity.cjs`: total CVD visible without scrolling at 1243 x 700 and within 900 px on a phone, six numbers with one decimal, sheets open without changing page height or scroll and return focus, Escape and backdrop close, blood pressure sub-sections do not move the pressed row, end-close brings the trigger into view, box counts, checkbox contrast, intro sentences, route links, renamed heads.
- Existing checks updated for the new structure and still green: `layout.cjs`, `flows.cjs`, `clip.cjs 320` and `390`, `scrollbars.cjs`, `audit.cjs` (axe), all unit suites, `vite build`.
