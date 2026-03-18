# 2026 ACC/AHA Lipid Management CDS Application

**Clinical decision support for the 2026 ACC/AHA Dyslipidemia Guideline with embedded PREVENT-ASCVD risk estimator.**

Built for physician use at the point of care. Mobile-first PWA — add to home screen for native-app experience.

## What's Inside

- **PREVENT-ASCVD Calculator** — exact coefficients from Khan et al. (Circulation 2024;149:430-449), extracted from the validated `preventr` R package
- **4 Patient Pathways** — Primary prevention, Secondary (ASCVD), Diabetes, Severe hypercholesterolemia (LDL ≥190)
- **Full CDS** — LDL/non-HDL goals, treatment escalation ladder, risk enhancers checklist, CAC/Lp(a)/ApoB interpretation
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
- **Coefficients**: Extracted from `preventr` R package v0.11.0 (CRAN), `sysdata.rda`, base model, 10-year ASCVD, sex-specific.

## Disclaimer

Clinical decision support tool only. Does not replace clinical judgment. Validate risk estimates with the [AHA PREVENT™ Calculator](https://professional.heart.org/en/guidelines-and-statements/prevent-calculator).
