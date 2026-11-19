# 2026 ACC/AHA Lipid Management CDS Application

**Clinical decision support for the 2026 ACC/AHA Dyslipidemia Guideline with embedded PREVENT-ASCVD risk estimator.**

Built for physician use at the point of care. Mobile-first PWA — add to home screen for native-app experience.

## What's Inside

- **PREVENT-ASCVD Calculator** — exact coefficients from Khan et al. (Circulation 2024;149:430-449), extracted from the validated `preventr` R package
- **4 Patient Pathways** — Primary prevention, Secondary (ASCVD), Diabetes, Severe hypercholesterolemia (LDL ≥190)
- **Full CDS** — LDL/non-HDL goals, treatment escalation ladder, risk enhancers checklist, CAC/Lp(a)/ApoB interpretation
- **PREVENT total CVD and heart failure**, 10- and 30-year — shown beside ASCVD risk. Total CVD sets the blood pressure drug-therapy threshold (≥7.5%); BMI is optional and only feeds the heart-failure estimate
- **Guideline-anchored logic** (`src/recommend.js`) — very-high-risk ASCVD definition, diabetes tiers, CAC rules, 30-year threshold, apoB goals; each rule cites its section
- **LDL ≥190 workup** — goal tiers (<100 / <70 / <55) with the factors that lower the goal, Dutch Lipid Clinic Network score, genetic testing and cascade screening steps
- **Treatment ladder extras** — lifestyle LDL-C effects, statin-intolerance pathway, enlicitide (oral PCSK9 inhibitor), PO/SC/IV route labels
- **Blood pressure card** — 2025 AHA/ACC category, treatment threshold, goal, initial and subsequent agents
- **PWA** — Offline-capable, installable on iOS/Android home screen, cached fonts

## Stack

React 19 · Vite 6 · Tailwind CSS 3 · vite-plugin-pwa (Workbox)

## Add to Home Screen (for your co-residents)

### iPhone
1. Open the URL in Safari
2. Tap Share → "Add to Home Screen"
3. It now lives as a standalone app with the Lipid 2026 icon

### Android
1. Open the URL in Chrome
2. Tap ⋮ → "Add to Home Screen" (or the install banner)
3. Launches full-screen like a native app

## References

- **Guideline**: Blumenthal RS et al. 2026 ACC/AHA/Multisociety Guideline on the Management of Dyslipidemia. *JACC/Circulation* 2026.
- **PREVENT Equations**: Khan SS et al. Development and Validation of the AHA PREVENT Equations. *Circulation* 2024;149:430-449.
- **Coefficients**: Extracted from `preventr` R package (CRAN), `sysdata.rda`, base model, sex-specific — ASCVD from v0.11.0, total CVD from v0.12.2.
- **Hypertension**: Jones DW et al. 2025 AHA/ACC/Multisociety Guideline for the Prevention, Detection, Evaluation and Management of High Blood Pressure in Adults. *Circulation* 2025;152:e114-e218.
- **FH score**: Dutch Lipid Clinic Network criteria — Nordestgaard BG et al. *Eur Heart J* 2013;34:3478-3490.
- **Statin intolerance**: 2026 ACC/AHA guideline §4.2.11; Cheeley MK et al. (NLA) *J Clin Lipidol* 2022;16:361-375; Patel SB et al. (AACE) *Endocr Pract* 2025;31:236-262 and 31:1207-1238; Mach F et al. (ESC/EAS) *Eur Heart J* 2025;46:4359-4378.
- **Enlicitide**: LIPFENDRA prescribing information (FDA, 7/2026).

## Tests

```bash
node test-prevent-cvd.mjs
```

```bash
node test-prevent-30yr.mjs
```

```bash
node test-fh.mjs
```

```bash
node test-bp.mjs
```

```bash
node test-recommend.mjs
```

```bash
node test-clinical.mjs
```

## Disclaimer

Clinical decision support tool only. Does not replace clinical judgment. Validate risk estimates with the [AHA PREVENT™ Calculator](https://professional.heart.org/en/guidelines-and-statements/prevent-calculator).
