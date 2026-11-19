# Audit — clarity pass, base commit dede156 (2026-11-19)

App: Lipid 2026 clinical decision support (React 19, Tailwind 3). Tabs: Primary, ASCVD, Diabetes, LDL ≥190.
Measured with measure.cjs in this folder.
Screenshots were kept in the session scratchpad and are not in the repo.

Owner's request, verbatim: "I can't find where cvd risk % is calculated and shown. Also, do a strictly aesthetic and simplification (without losing detail or clarity) pass. How can drop downs with more info fit seamlessly, not cause loss of position on the page, each user understand the function and purpose of each tab and the order and sequence of the info. Sharp, modern, state of the art, professional, clean, clear."

## C1. Total CVD risk is hard to find
- It is one row ("Total CVD", 10-yr and 30-yr) under the head "Other PREVENT outcomes", after the 10-year block, the Plan and the 30-year block.
- Desktop 1243 x 700: the row is at y=841 inside the right rail, below the 700 px window. The rail scrolls on its own and its scrollbar is hidden until hover.
- Desktop 1440 x 900: visible, at y=841.
- Phone 390: 1410 px down the page (1.7 screens).
- It also appears inside the Blood pressure section, only after that section is opened.

## C2. "More info" panels are inserted into the page
Pixels added to the page when opened at 390 px:
- Statin reference ("?" on the statin rung and in Monitoring): +1638 to +1743
- Statin not tolerated? (pathway): +1687 to +1782
- About Lp(a) and apoB: +695
- About CAC scoring: +443
- About the PREVENT calculator: +423
- BMI calc: +190
- Blood pressure section: +849 to +874
- Expected LDL-C change (lifestyle table): +456
- Risk enhancers: 1083 px when open

## C3. Position is lost in two measured cases
- Closing the 1680 px statin-intolerance panel from its end leaves its trigger at y=-705: the user is dropped 705 px past where they were.
- The Blood pressure sub-sections are single-open. Pressing "Follow-up and labs" while "Drug therapy" is open above it moves the pressed row by -920 px.
- Opening any panel does not move its trigger (0 px in all 27 toggles measured).

## C4. Three disclosure looks
- Section head that toggles (Risk enhancers): tracked-caps head, hint and chevron at right.
- Boxed disclosure (Expected LDL-C change, Blood pressure sub-sections): bordered rounded box, 13 px label, chevron.
- "?" circle buttons that reveal a bordered panel below the paragraph they sit in.
- Also: a text link ("Point bands"), a pill button ("Statin not tolerated?"), a text button with chevron ("Where AACE 2025 differs"), and the Blood pressure summary box that opens the whole section.

## C5. Boxes
Elements with a border on all four sides and a corner radius, default state, 390 px:
Primary 35, ASCVD 23, Diabetes 20 (3 nested in another box), LDL ≥190 27 (7 nested; 32 and 12 at 1440).
Nearly all are 8 px radius. Check rows are individual bordered boxes stacked with 6 px gaps.

## C6. Purpose and sequence
- Each tab's purpose is a 12 px muted line under its first section head, e.g. "Ages 30–79, no known ASCVD."
- Tab labels: Primary, ASCVD, Diabetes, LDL ≥190. Nothing says who each tab is for.
- Section order, Primary: PREVENT-ASCVD risk calculator → 10-year ASCVD risk → Plan → 30-year ASCVD risk → Other PREVENT outcomes → If optimized → 30-year risk drivers → Risk enhancers → CAC reclassification (optional) → Treatment ladder → Advanced biomarkers → Blood pressure → Monitoring.
- ASCVD: Clinical ASCVD risk level → Plan → Treatment ladder → Advanced biomarkers → Blood pressure → Monitoring.
- Diabetes: Diabetes pathway → Plan → Treatment ladder → Advanced biomarkers → Blood pressure → Monitoring.
- LDL ≥190: Severe hypercholesterolemia → Plan → FH workup, step by step → Treatment ladder → Advanced biomarkers → Blood pressure → Monitoring.
- Nothing on the page states that order or lets the user jump within it.

## Already true (previous pass, keep)
- 0 axe violations, text contrast ≥4.72:1, no sentence under 12 px, every control ≥44 px, no spill at 320 px.
- One Plan block per tab, in a sticky right rail on desktop, with a bottom plan bar on phones.

## After the pass (same scripts, same patient)

| Measure | Base dede156 | After |
|---|---|---|
| 10-year total CVD at 1243 x 700 | y=841, below the rail fold | y=312, visible |
| 10-year total CVD on a 390 px phone | 1410 px down | 987 px down, in the same block as ASCVD |
| Page growth when reference content opens | +423 to +1782 px | 0 px (sheet) |
| Closing the statin-intolerance content from its end | trigger left at y=-705 | page and focus exactly where they were |
| Blood pressure sub-section pressed under an open one | row moved -920 px | 0 px |
| Boxes per tab at 390 px | 35, 23, 20, 27 | 17, 6, 7, 12 |
| Unchecked checkbox border contrast | 1.35:1 | 5.20:1 |
| Looks for things that expand | 7 | 2 (flat row, sheet trigger) |
| Tab purpose | 12 px muted line under the first head | 14 px sentence at the top, plus a route line |
| Plan position at 390 px (Primary, ASCVD, Diabetes, LDL ≥190) | 851, 1368, 1235, 872 px | 1071, 1480, 1308, 956 px |
| axe violations, 16 variants | 0 | 0 |

The plan sits 84 to 220 px lower on a phone than before this pass. That is the cost of the purpose sentence and route line on every tab, and of the full risk grid above the plan on the Primary tab.

Checks: `clarity.cjs` 74, `../2026-11-19/scripts/layout.cjs` 97, `flows.cjs` 30, `scrollbars.cjs` 18, `clip.cjs` 0 spills at 320 and 390.
