# Spec: Lifetime ASCVD Risk Addition

**Status**: Approved for implementation
**Date**: 2026-05-01
**Branch**: `claude/crazy-cerf-287737` (worktree)
**Implementation target**: main app (`lipid2026`), to be merged after testing

## BLUF

Add PREVENT 30-year ASCVD ("lifetime") risk to the PRIMARY tab as a complement to the existing 10-year risk. Show both side-by-side. Surface the lifetime number with three clinical insights (a discordance callout, an "if optimized" projection, and a per-factor risk-driver breakdown), plus an out-of-validated-range message for ages 60+. Display-only (does not modify the recommendation engine). All new UI uses existing light/dark tokens for seamless visual integration.

## Motivation

A staffing physician (Dr. Champion) requested adding lifetime ASCVD risk to the calculator. Lifetime risk is the standard shared-decision-making (SDM) signal for young patients with low 10-year but elevated lifetime trajectories (e.g., 35-year-old with LDL 160, 10-year risk 2%, 30-year risk 28%). The 2026 ACC/AHA dyslipidemia guideline framework supports this use. The current app shows only 10-year risk, which understates risk for younger patients with significant modifiable burden.

## Goals

- Display PREVENT 30-year ASCVD risk alongside 10-year on the PRIMARY tab.
- Auto-flag clinically actionable discordance (low 10y, high 30y).
- Provide an expandable "if optimized" projection.
- Provide an expandable risk-driver breakdown.
- Preserve existing UX, dark/light mode tokens, and all existing CDS logic.

## Non-goals

- Modify the recommendation engine.
- Add lifetime risk to ASCVD / Diabetes / LDL ≥190 tabs (clinically irrelevant outside primary prevention).
- Heart age, NNT, age-peer percentiles (deferred).
- Extrapolate PREVENT 30-year beyond the validated age range (30-59).
- Branding changes or a separate Vercel deployment (decided against in brainstorming).

## Key decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Lifetime methodology | PREVENT 30-year (Khan 2024) | Lloyd-Jones MESA lifetime, both side-by-side | Modern standard, same evidence base, sex-specific |
| Placement | Split inline alongside 10-year | Stacked, toggle, conditional display | Instant comparison, mobile-friendly, no extra scroll |
| Insights for v1 | Discordance, if-optimized, driver breakdown, age caveat | Heart age, NNT, peer percentile | Highest clinical actionability |
| Recommendation engine integration | Display-only | Drives recommendations | Guideline lacks formal lifetime thresholds, safer for CDS |
| Deployment | Single app, merge to main | Sibling repo, branch deploy, feature flag | User chose this approach during brainstorming |
| Code organization | Extract PREVENT to `src/prevent.js` | Keep in `App.jsx` | Math becomes testable, `App.jsx` is 1100+ lines |
| Out-of-age 30-year copy | "Not validated for ages ≥60" | Hard blank "—" | Clearer to physician why no number is shown |

## Detailed design

### 1. Math and coefficients

**Source**: Khan SS et al., *Circulation* 2024;149:430-449. Same paper as existing 10-year PREVENT.

**Equations**: same predictor structure as 10-year (age, sex, total cholesterol, HDL, SBP, BP treatment, statin, DM, smoking, eGFR, BMI, plus interaction terms). Different sex-specific intercepts and beta coefficients.

**Validated age range**: 30-59 for the 30-year model. The 10-year model remains 30-79.

**Coefficient extraction**: from the same `preventr` R package v0.11.0 (`sysdata.rda`), specifically the `b_30yr_ascvd_base_f` and `b_30yr_ascvd_base_m` matrices. Procedure mirrors the 10-year extraction described in the project README.

**Risk band cutoffs for 30-year** (no formal guideline thresholds exist, chosen from Khan paper distributions and lifetime-risk literature):

| Range | Label | Color family |
|---|---|---|
| < 10% | Low | green |
| 10 to < 20% | Borderline | yellow |
| 20 to < 30% | Intermediate | orange |
| ≥ 30% | High | red |

Implemented as a `riskCat30()` function paralleling the existing `riskCat()` (which becomes `riskCat10()`).

### 2. UI layout

The existing PREVENT result box becomes a two-up. Both halves use the existing card / band-color / dark-mode pattern. **No new color tokens are introduced.** The 10-year visual treatment is unchanged.

```
╭──────────────────────────── PREVENT-ASCVD Risk ────────────────────────────╮
│  [ existing input grid: age, sex, lipids, SBP, eGFR, BMI, toggles, etc. ] │
│                                                                            │
│  ┌──────────────────────────┬──────────────────────────┐                  │
│  │  10-YR ASCVD             │  30-YR ASCVD             │                  │
│  │  3.2%                    │  28%                     │                  │
│  │  [Borderline · 3-<5%]    │  [Intermediate · 20-<30%]│                  │
│  └──────────────────────────┴──────────────────────────┘                  │
│                                                                            │
│  ⚠ Discordance: low 10-yr, high 30-yr.                                    │
│    Consider SDM, CAC, Lp(a), early statin/lifestyle.    (when triggered)   │
│                                                                            │
│  ▸ Risk if optimized                                       (tap)           │
│  ▸ What's driving the 30-yr risk?                          (tap)           │
╰────────────────────────────────────────────────────────────────────────────╯
```

**Layout rules**:

- Two-up stays side-by-side at phone widths (320px+). Each chip is roughly 140px wide.
- Dark mode: each side uses the matching `darkBg` token from its risk category, identical to the existing 10-year behavior.
- Animation: the 30-year number receives the same `risk-appear` entrance treatment as the 10-year.
- Existing 10-year layout and styling: zero changes outside the wrapping container.

**Age 60-79 behavior**: the 30-year slot renders with a neutral grayed background (using existing slate dark tokens) and copy "Not validated for ages ≥60". The 10-year slot is unchanged. Layout symmetry is preserved.

**Discordance callout**: amber-themed callout (matching existing borderline patterns in light and dark mode), rendered between the two-up and the expandables. Auto-shown when discordance detected (Section 3). Suppressed when age ≥60.

**Expandables**: two collapsible rows ("Risk if optimized" and "What's driving the 30-yr risk?"), patterned exactly after the existing `cacInfo` / `bioInfo` / `statinInfo` toggles. Suppressed when age ≥60.

**Dark/light mode integration (hard constraint)**:

- All new UI uses existing tokens. No new CSS variables, no new color hexes.
- The 30-year mini-card mirrors the 10-year mini-card structure, pulling `bg` (light) and `darkBg` (dark) from `riskCat30()`.
- Discordance callout reuses existing amber treatment (`dark:bg-amber-500/10 dark:border-amber-500/30`).
- Expandable rows reuse the same dark/light classes as `cacInfo`, `bioInfo`, `statinInfo`.
- The "not validated" neutral slot uses the established slate / neutral palette already in the app (`dark:bg-[#1a2835]` family).
- Existing animations (`risk-appear`, parallax shimmer, glow effects) are not modified.

### 3. Insight calculations

#### 3.1 Discordance trigger

```
trigger = (age in [30, 59])
       AND (risk10 < DISCORDANCE_RISK10_MAX)   // default 5
       AND (risk30 ≥ DISCORDANCE_RISK30_MIN)   // default 20
```

Thresholds are named constants for easy tuning.

#### 3.2 "If optimized" projection

Re-runs PREVENT 30-year with substituted optimal modifiable inputs. Substitutions use `min` / `max` so an already-better-than-optimal value is preserved (a patient with HDL 70 should not have their HDL pulled down to 50 in the projection):

| Input | Optimized value | Rule |
|---|---|---|
| SBP | `min(patient_sbp, 110)` | floor good BP, optimize high BP |
| bpTx | `false` | optimized state assumes no Rx needed |
| smoking | `false` | flat substitution |
| BMI | `min(patient_bmi, 24)` | preserve already-low BMI, optimize high BMI |
| hdlC | `max(patient_hdl, 50)` | preserve good HDL, raise low HDL |
| nonHdl target | `min(patient_nonHdl, 120)` | preserve good non-HDL, lower high non-HDL |
| totalC | `nonHdl_target + hdlC_target` | derived from the two above |
| statin | `false` | optimized state assumes no Rx needed |
| age | (current) | not modifiable |
| sex | (current) | not modifiable |
| DM | (current) | clinical reality, not a lifestyle factor |
| eGFR | (current) | not modifiable |

Note: in the PREVENT base model, BMI coefficients are 0.0 in the 10-year sex-specific equations (verified in `src/App.jsx`). The 30-year base model coefficients must be inspected at extraction time. If 30-year BMI coefficients are also 0.0, the BMI substitution is a no-op (left in place to keep the rule explicit).

Display copy: "If risk factors optimized → 30-yr ASCVD: X%" plus a delta arrow (`↓ −Y%`).

Edge case: if the projection ends up greater than or equal to current risk (which can happen for an already-near-optimal patient), display "Risk factors already near optimal" instead of a delta.

#### 3.3 Risk-driver breakdown (single-factor counterfactual)

For each candidate modifiable factor F:

1. Compute `risk_F` = PREVENT 30-year with F set to its optimal value (using the same `min`/`max` rule from 3.2), all other inputs at the patient's actual values.
2. `Δ_F` = `current_30yr` − `risk_F`.
3. Display as horizontal bars, descending Δ magnitude.

**Candidate factors** (subject to coefficient verification at extraction time):

- BP (sbp + bpTx, paired)
- Lipids (totalC + hdlC, paired as in 3.2)
- Smoking
- BMI (only if 30-year base model coefficients are non-zero, otherwise omitted)

Filters:

- Hide factors where `Δ_F` < 0.5% (noise floor).
- If all factors fall below the floor, show "All modifiable factors near optimal" instead.

Disclaimer (small print beneath the bars): "Single-factor projection. Values may not sum due to interactions in the PREVENT model."

This double-counts slightly because of `age × non-HDL`, `age × HDL`, and `bpTx × SBP` interactions in the equation. It is the standard interpretable approach. True Shapley-value attribution is overkill for v1.

### 4. Code organization

**New file**: `src/prevent.js` (pure functions, no React).

```javascript
export const PREVENT_10YR = { female: {...}, male: {...} };
export const PREVENT_30YR = { female: {...}, male: {...} };

export function calcPREVENT10(inputs);
export function calcPREVENT30(inputs);
export function riskCat10(r);
export function riskCat30(r);

export function discordance(risk10, risk30, age);
export function optimizedInputs(inputs);
export function driverDeltas(inputs);

export const DISCORDANCE_RISK10_MAX = 5;
export const DISCORDANCE_RISK30_MIN = 20;
export const VALID_30YR_AGE_MAX = 59;
```

**Modifications to `src/App.jsx`**:

- Remove inline coefficient constants and `calcPREVENT` / `riskCat` (moved to `prevent.js`).
- Import what the UI needs from `./prevent.js`.
- Add `risk30` `useMemo` paralleling `risk10` (the existing `risk` is renamed for clarity).
- Add `rc30` `useMemo` paralleling `rc10`.
- Add `lifetimeOptimizedOpen` and `lifetimeDriversOpen` state for the two expandables.
- Refactor the result-box JSX into the two-up layout.
- Add the discordance callout block.
- Add the two expandable rows.

Net delta on `App.jsx`: approximately +30 lines (math removed, UI added).

### 5. Edge cases

| Case | Behavior |
|---|---|
| Age missing or out of 30-79 | Both risks null (current behavior preserved) |
| Age 30-59, complete inputs | Both risks compute and display |
| Age 60-79, complete inputs | 10-year computes, 30-year slot shows "Not validated for ages ≥60" |
| Required input missing | Both risks null (current behavior) |
| `tab !== "primary"` | No risk computation (current behavior) |
| Discordance triggers but age ≥60 | Suppressed (no valid 30-year to compare) |
| Any driver Δ < 0.5% | Hidden from breakdown |
| All driver Δ near zero | Show "All modifiable factors near optimal" |

### 6. Testing

New file `test-prevent-30yr.mjs` at the project root, matching the pattern of existing `test-clinical.mjs` and `test-crossvalidate.mjs` (plain Node assertions, no test framework).

Test cases:

1. Cross-validate 5-10 profiles against the AHA PREVENT calculator at heart.org (recorded reference values).
2. Boundary: age 30 and 59 (should compute), age 60 and 79 (30-year should return null or blank-state signal).
3. Discordance trigger logic: positive case, negative case, age boundary cases.
4. `optimizedInputs` returns the documented substitutions exactly.
5. Sanity: optimized 30-year risk ≤ current 30-year risk for representative non-edge patients.
6. Driver Δ values match manual computation for at least one profile.

Run via `node test-prevent-30yr.mjs`. Existing tests must continue to pass after the `calcPREVENT → calcPREVENT10` rename.

### 7. Backwards compatibility

- 10-year behavior, recommendation engine, all tabs, all CDS logic: unchanged.
- Existing styling, animations, parallax shimmer, glow effects, light/dark color tokens: unchanged.
- Existing tests pass after the single function rename in their imports.

## Open questions (non-blocking)

- Whether to surface heart age, NNT, or peer percentiles in a future iteration.
- Whether to relax discordance thresholds based on clinical feedback after pilot use.
- Whether DM should join the "modifiable" set in the if-optimized projection.
- Whether the extracted PREVENT 30-year base model has non-zero BMI coefficients (resolved at coefficient extraction during implementation, drives whether BMI appears in the driver breakdown).

## References

- Khan SS et al. Development and Validation of the AHA PREVENT Equations. *Circulation* 2024;149:430-449.
- Blumenthal RS et al. 2026 ACC/AHA/Multisociety Guideline on the Management of Dyslipidemia.
- `preventr` R package v0.11.0 (CRAN), `sysdata.rda`.
- Existing app: `src/App.jsx`, `README.md`.
- AHA PREVENT calculator (validation reference): https://professional.heart.org/en/guidelines-and-statements/prevent-calculator
