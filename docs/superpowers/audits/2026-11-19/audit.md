# Audit — presentation passes, base commit 9474118 (2026-11-19)

App: Lipid 2026 clinical decision support tool (React 19, Tailwind 3). Four tabs: Primary, ASCVD, Diabetes, LDL ≥190.
Shared below the tab content: recommendation card, treatment ladder, blood pressure section, monitoring, referral, footer.
Measured with scripts/audit.cjs: 4 tabs x 5 widths (320, 390, 768, 1024, 1440) x day/night, every disclosure opened.
Screenshots and raw JSON were kept in the session scratchpad and are not in the repo. The scripts in `scripts/` regenerate them.

## Layout
- A1. Horizontal overflow: 0 of 40 variants (scrollWidth equals viewport width at every width).
- A2. Page height with every disclosure open: Primary 6008 px, ASCVD 5264, Diabetes 4650, LDL ≥190 6936 at 390 px (7813 at 320). Desktop 4278 to 5832 px.
- A3. Only the Primary tab uses the two-column desktop layout (main + 400 px risk rail). The other three tabs are a single 42 rem column at 1024 and 1440.

## Accessibility (axe-core 4.10.2, 390 and 1440, day and night)
- A4. color-contrast, day: 59 to 89 failing nodes per tab. Cause: token --faint #9ba0a6 on --paper #fdfdfc = 2.58:1 and on --surface #ffffff = 2.63:1 (needs 4.5:1). Used for field labels, eyebrows, units, sub-lines, notes (text-faint appears 51 times in the original redesign file alone).
- A5. color-contrast, night: 0 to 3 nodes. --faint #868d96 on a #2b2e32 fill = 4.06:1 (goal-tier sub-lines "non-HDL <100", "Set by: ASCVD tab").
- A6. label (critical): 2 inputs have no programmatic label (max=500 and max=300 number inputs).
- A7. meta-viewport (critical): index.html sets maximum-scale=1.0, user-scalable=no, which blocks pinch zoom.
- A8. landmark-one-main, region (43 to 61 nodes), heading-order: no <main>; headings jump h1 to h3.

## Touch targets below 44 px (390 px viewport)
- A9. Header: mg/dL 54x30, mmol/L 61x30, theme toggle 32x32, Reset 77x32.
- A10. Info buttons "?" 24x24 and 20x20 (3 to 4 per tab).
- A11. LDL ≥190 tab: statin selector chips 54x32 (5), "+ EZE 10" 284x32, "Point bands" 60x16, compact check rows 36 to 37 px high.
- A12. "Statin not tolerated?" 137x32, "Copy summary for note" 350x36, blood pressure "Diabetes" compact row 350x36, footer link 240x17.

## Type
- A13. Visible characters by computed size, Primary tab at 390: 9.5 px 31, 10 px 572, 10.5 px 1462, 11 px 2576, 12 px 636, 13 px 521, 14 px 504, larger 64. So 73% of characters render at 11 px or smaller.
- A14. LDL ≥190 tab at 390: 9 px 87, 9.5 px 58, 10 px 760, 10.5 px 1885, 11 px 5518, 12 px 850, 13 px 156, 14 px 483. So 84% at 11 px or smaller. 14 distinct sizes on the page.
- A15. Class counts in source: text-[11px] 79, text-[10px] 26, text-[10.5px] 26, text-[12px] 24, text-[14px] 23, text-[13px] 17, text-[9px]/[9.5px] 11. uppercase 24, tracking-[...] 16.

## Copy
- A16. Characters in non-comment source: em dash 0. En dash 123 (App 50, BloodPressure 22, StatinIntolerance 9, fh 8, recommend 8, SevereTab 7, Lifestyle 6, RiskTabs 6, bp 5, prevent 2). Middle dot 39 (App 16, BloodPressure 9, SevereTab 9, StatinIntolerance 5). The original production redesign file already had 54 en dashes and 13 middle dots, so both are inherited house usage.
- A17. Term variants: "LDL-C" 79 vs bare "LDL" 33. "below N" 22 vs "<N" 55. "ApoB" 12 vs "apoB" 21. "PCSK9 mAb" 13 vs "PCSK9i"/"PCSK9 inhibitor" 3. "non-HDL-C" 10 vs "non-HDL" 3. The original redesign used bare "LDL ... below 55 mg/dL" in recommendation sentences and "LDL-C <55" in labels.
- A18. Class-of-recommendation labels: "COR 1" 21, "2a"/"COR 2a" 7, shown as chips in some sections and inline text in others.

## Errors
- A19. Console errors and page errors: 0 in all 40 variants.

## Not measured
- WebKit: no WebKit build in this container (/opt/pw-browsers has Chromium only).
- Performance: nothing in scope animates beyond 150 ms panel transitions.

## Codex review of 9474118 (presentation focus, 4 findings, all P2) — each checked against the code or a measurement
- A20 (Codex, src/index.css:14). --faint contrast. Same as A4. Confirmed by axe.
- A21 (Codex, src/Lifestyle.jsx:28). At 320 px the lifestyle rows cannot shrink: values spill past their row by 6, 11, 2 and 26 px on all four tabs. Confirmed with scripts/clip.cjs 320 (17 spills total, including the cascade-screening step tag on the LDL ≥190 tab, +5 px). 0 spills at 390. The viewport-level overflow check (A1) did not see it.
- A22 (Codex, src/BloodPressure.jsx:103). Conditions set automatically (diabetes, clinical CVD, CKD) render as pressable check rows that cannot be unchecked, and a press silently sets the manual flag. Confirmed in code: checked={eff.dm} with eff.dm = flags.dm || auto.dm, on={() => toggleFlag("dm")}.
- A23 (Codex, src/StatinIntolerance.jsx:68). The statin-intolerance panel shows LDL-C <70, <100 and ≥190 in mg/dL when mmol/L is selected. Confirmed: the component takes no unit prop.

## After the passes (same scripts, same patient, 2026-11-19)

| Measure | Base 9474118 | After |
|---|---|---|
| Plan position at 390 px, default state | Primary 3004, ASCVD 1534, Diabetes 1399, LDL ≥190 3169 px | 851, 1368, 1235, 872 px |
| Page height at 390 px, default state | 4871, 4157, 3485, 5862 px | 5164, 3904, 3153, 5829 px |
| axe violations, 16 variants (390 and 1440, both themes, 4 tabs) | color-contrast 59 to 89 per tab by day, plus label, meta-viewport, landmark-one-main, region, heading-order | 0 |
| Lowest text contrast | 2.35:1 (light faint on a selected row) | 4.72:1 light, 4.73:1 dark |
| Controls under 44 px at 390 px (hit area counted) | 9 to 18 per tab | 0 |
| Content spilling its container at 320 px | 17 | 0 |
| Title at 320 px | clipped (37 px box for an 85 px title) | whole |
| Sentences (40 characters or more) under 12 px | most body text (73 to 84% of characters at 11 px or less) | 0 |
| Distinct text sizes on the LDL ≥190 tab | 14 | 9 |
| Copy button reachable at 1440 x 800 | no | yes |
| Horizontal overflow, console errors | 0, 0 | 0, 0 |

| Plan fully visible in the desktop rail at 1280 x 720 and 1366 x 768 | not applicable (no plan in the rail) | yes |
| mmol/L: sideways scroll inside the page at 320 to 390 px | 389 px of content in a 310 to 380 px area | none |
| Keyboard: focus stops hidden under a bar or with a clipped ring | not measured | 0 on 4 walked variants |

Checks: `scripts/layout.cjs` 93 assertions, `scripts/flows.cjs` 30 clinical-flow assertions, `scripts/clip.cjs 320` and `390`, `scripts/audit.cjs`, `node test-copy.mjs` 23 assertions.

## Independent review of 7d989cd and the fix pass

A fresh reviewer (15 findings, most measured in a browser on its own port) and a second Codex review (1 finding, the same as reviewer finding 3). Each fix has a check that failed first. The ledger lists every one.
